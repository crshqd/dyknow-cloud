define([
    'amd/cabra/thumbnailSession', 'amd/logger/logger', 'amd/sandbox', 
    'jquery', 'amd/settings'
], function(
       ThumbnailCabra, Logger, Sandbox, 
        $, SETTINGS
) {
    describe('ThumbnailCabra', function () {
        var thumbnailSession;
        
        var constants = {
            payloads : {
            }
        };
        var conversationid1 = "11111111-1111-1111-1111-111111111111";
        var conversationid2 = "22222222-2222-2222-2222-222222222222";
        describe("with scale stuff", function () {
            beforeEach(function () {
                window.sandbox._reset();
                spyOn(sandbox, "publish");//need to avoid chrome runtime here
                thumbnailSession = new ThumbnailCabra();
                thumbnailSession.Thumbnail = function (){ return { init: function(){ return this;}, withScale: $.noop };};
                thumbnailSession.init("dyknow.me/screen_shot", 15, [], {addCabraFrame:$.noop, enterCabra: $.noop, thumbnailResponse: $.noop});
                thumbnailSession.rules = [{to: "broadcaster"}];
                thumbnailSession._hasEntered = true;
                spyOn(thumbnailSession.thumbnail, "withScale").andReturn($.Deferred());
                spyOn(thumbnailSession._client, "addCabraFrame").andReturn($.Deferred());
                spyOn(thumbnailSession._client, "thumbnailResponse").andReturn($.Deferred().resolve());
                
                Logger.debug = $.noop;
                Logger.info = $.noop;
                Logger.warn = $.noop;
                Logger.error = $.noop;
            });

            it("passes on scale and empty request_fullscreen to withScale", function() {
                thumbnailSession.applyFromRealtime({}, {
                    broadcastObject: {
                        payload: {
                            conversation_id: conversationid1,
                            payload: {
                                scale: 3,
                                url: "https://localhost/mockthis"
                            }
                        }
                    }
                });
                expect(thumbnailSession.thumbnail.withScale).toHaveBeenCalledWith(3, undefined);
            });
            
            it("passes on scale and request_fullscreen to withScale", function() {
                thumbnailSession.applyFromRealtime({}, {
                    broadcastObject: {
                        payload: {
                            conversation_id: conversationid1,
                            payload: {
                                scale: 3,
                                request_fullscreen: true,
                                url: "https://localhost/mockthis"
                            }
                        }
                    }
                });
                expect(thumbnailSession.thumbnail.withScale).toHaveBeenCalledWith(3, true);
            });
        });
        describe("initializing event order", function () {
            var enterDfd;
            beforeEach(function(){
                window.sandbox._reset();
                thumbnailSession = new ThumbnailCabra();
                thumbnailSession.Thumbnail = function (){ return { init: function(){ return this;}, withScale: $.noop };};
                thumbnailSession.init("dyknow.me/screen_shot", 15, [], {addCabraFrame:$.noop, enterCabra: $.noop, thumbnailResponse: $.noop});
                thumbnailSession.rules = [{to: "broadcaster"}];
                enterDfd = $.Deferred();
                spyOn(thumbnailSession.thumbnail, "withScale").andReturn($.Deferred());
                spyOn(thumbnailSession._client, "enterCabra").andReturn(enterDfd);

                spyOn(thumbnailSession._client, "addCabraFrame").andReturn($.Deferred());//wont be used
                spyOn(thumbnailSession._client, "thumbnailResponse").andReturn($.Deferred().resolve());//wont be used
                
                Logger.debug = $.noop;
                Logger.info = $.noop;
                Logger.warn = $.noop;
                Logger.error = $.noop;
            });
            afterEach(function () {
                thumbnailSession.unsubscribe();
                window.sandbox._reset();
            });
            it("realtime between state enter req and resp will still process realtime", function () {
                //this calls enter but doesnt resolve
                thumbnailSession.enter();
                //receive 
                $.trigger(thumbnailSession.cabraId + SETTINGS.EVENTS.NEW_OBJECT, { broadcastObject: {"payload_id":"new_object","broadcast_id":thumbnailSession.broadcastId,"cabra_id":thumbnailSession.cabraId,"cabra_name":"dyknow.me/screen_shot","payload":{"payload_id":"75e132cf-8371-49b5-bdaa-69785ff4c998","broadcast_cabra_id":"901c5a0b-8ab1-429d-bb2f-b7b4b52c36b9","payload":{"account_id":8,"url":"https://big-url.gov/thumb.jpg","scale":3,"request_fullscreen":false},"to":"1","conversation_id":"862d6b76-cd5a-4882-b3ce-dc5c6d9cf7ed","object_id":"42baf172-6189-4374-ba1d-17398324a4df","frame_id":81452,"account_id":8},"user":{"account_id":8}}});
                enterDfd.resolve({"broadcast_cabra_id":thumbnailSession.cabraId,"cabra_id":15,"status":"open","user":{"device_cabra_uuid":"901c5a0b-8ab1-429d-bb2f-b7b4b52c36b9","device_id":18,"status":"open","connections":[{"device_id":18,"status":"ok","os":{"id":5,"name":"Chrome","type":"chrome"}}],"account_id":8,"broadcast_id":thumbnailSession.broadcastId},"state":{"payload":{}}});
                expect(thumbnailSession.thumbnail.withScale).toHaveBeenCalled();
            });
        });
    });
});