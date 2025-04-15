define([
    'amd/cabra/palSession', 'js/test/mocks/logger', 'amd/sandbox', 
    'jquery', 'js/test/mocks/cabraInfo', 'js/test/mocks/chrome',
    'amd/cabra/helper/blocking.events'
], function(
    PalSession, logger, Sandbox, 
    $, MockCabraInfo, chrome,
    blockingEvents
) {
    describe('palSession', function () {
        var palSession;
        var sandbox;
        var frameQueue;
        var constants = {
            
        };
        
        beforeEach(function () {
            frameQueue = [];
            sandbox = new Sandbox().init();
            sandbox._reset();
            chrome.useMock();
            logger.useMock();
            palSession = new PalSession();
            
            palSession.init("dyknow.me/participant_activity_monitor", 18, [], {addCabraFrame:$.noop, enterCabra: $.noop});
            spyOn(palSession._client, "addCabraFrame").andCallFake(function (){ 
                var dfd = $.Deferred();
                frameQueue.push(dfd);
                return dfd;    
            });
            spyOn(palSession._client, "enterCabra").andReturn($.Deferred().resolve());
            
            palSession.didEnterCabra(new MockCabraInfo());
        });
        
        afterEach(function(){
            sandbox._reset();
            chrome.resetMock();
        });

        it("queues up posts instead of posting immediately", function () {
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
            expect(palSession._client.addCabraFrame.calls.length).toEqual(1);
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-else-off-task.com"});
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-still-off-task.com"});
            expect(palSession._client.addCabraFrame.calls.length).toEqual(1);
            frameQueue[0].resolve();
            expect(palSession._client.addCabraFrame.calls.length).toEqual(2);//remember this is cumulative
            frameQueue[1].resolve();
            frameQueue[2].resolve();
            expect(palSession._client.addCabraFrame.calls.length).toEqual(3);
            
        });

        it("drains queue on fatal errors as well", function () {
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
            expect(palSession._client.addCabraFrame.calls.length).toEqual(1);
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-else-off-task.com"});
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-still-off-task.com"});
            expect(palSession._client.addCabraFrame.calls.length).toEqual(1);
            frameQueue[0].reject();
            expect(palSession._client.addCabraFrame.calls.length).toEqual(2);//remember this is cumulative
            frameQueue[1].reject();
            frameQueue[2].reject();
            expect(palSession._client.addCabraFrame.calls.length).toEqual(3);
        });

        it("queues up posts next time after the last drain finishes", function () {
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
            frameQueue[0].resolve();
            expect(palSession._client.addCabraFrame.calls.length).toEqual(1);
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-else-off-task.com"});
            frameQueue[1].resolve();
            expect(palSession._client.addCabraFrame.calls.length).toEqual(2);
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-still-off-task.com"});
            frameQueue[2].resolve();
            expect(palSession._client.addCabraFrame.calls.length).toEqual(3);
        });

        it("queues up posts next time after the last drain finishes after errors", function () {
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
            frameQueue[0].reject();
            expect(palSession._client.addCabraFrame.calls.length).toEqual(1);
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-else-off-task.com"});
            frameQueue[1].reject();
            expect(palSession._client.addCabraFrame.calls.length).toEqual(2);
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-still-off-task.com"});
            frameQueue[2].reject();
            expect(palSession._client.addCabraFrame.calls.length).toEqual(3);
        });

        it("FIXAFTER-DYK-415: queues up posts next time after the last drain finishes after js errors", function () {
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
            //some bozo has this error that only throws once. it's totally
            //our fault, but it'd be kind of nice if we recovered from it
            //note: this is a patch until DYK-415 gets fixed
            Object.defineProperty(palSession, "cabraId", { get: function () { 
                delete this.cabraId;//so we dont throw again
                this.cabraId = "whatever";
                throw new Error("blow up on this js error");
            }});
            try
            {
                sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-gonna-error.com"});
                frameQueue[0].resolve();//this one's gonna dequeue but get an error. oh no!
                throw new Error("FAIL");
            }
            catch (err){
                //dont care about this but it's noteworthy that we arent gonna get 
                if (err.message === "FAIL") {throw err;}
            }
            //this here is negotiable, but I expect the unhandled error gets tossed 
            expect(palSession._client.addCabraFrame.calls.length).toEqual(1);            
            //this immediately goes through because there's nothing in the queue
            //and it reset on the sending bit            
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-else-off-task.com"});
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-else-off-task.com"});
            expect(palSession._client.addCabraFrame.calls.length).toEqual(2);            
            frameQueue[1].resolve();
            //note one of these blew up so 
            expect(palSession._client.addCabraFrame.calls.length).toEqual(3);            
        });

        it("FIXAFTER-DYK-415: skips poison but tries to finish remaining messages now", function () {
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
            //some bozo has this error that only throws once. it's totally
            //our fault, but it'd be kind of nice if we recovered from it
            //note: this is a patch until DYK-415 gets fixed
            Object.defineProperty(palSession, "cabraId", { get: function () { 
                delete this.cabraId;//so we dont throw again
                this.cabraId = "whatever";
                throw new Error("blow up on this js error");
            }});
            try
            {
                sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-gonna-error.com"});
                sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
                sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
                frameQueue[0].resolve();//this one's gonna dequeue but get an error. oh no!
                throw new Error("FAIL");
            }
            catch (err){
                //dont care about this but it's noteworthy that we arent gonna get 
                if (err.message === "FAIL") {throw err;}
            }
            //the error gets tossed but we moved onto the 3rd in the queue
            expect(palSession._client.addCabraFrame.calls.length).toEqual(2);
            frameQueue[1].resolve();
            frameQueue[2].resolve();
            expect(palSession._client.addCabraFrame.calls.length).toEqual(3);           
        });

        it("drains the queue on exit", function (){
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
            palSession.willLeaveCabra();
            frameQueue[0].resolve();
            //should not call the next one
            expect(palSession._client.addCabraFrame.calls.length).toEqual(1);            
        });

        it("sends up the tab_id as part of the payload", function () {
            sandbox.publish(blockingEvents.block_url, { 
                blocked: "blocked", 
                url:"something-off-task.com", 
                tab_id: 99
            });
            expect(palSession._client.addCabraFrame.mostRecentCall.args[3]).toEqual({
                name: "Chrome",
                identifier: "Chrome",
                url: "something-off-task.com",
                title: "", 
                blocked: "blocked",
                tab_id: 99
            });
        });


   });
});