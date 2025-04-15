define([
    'amd/application', 'js/test/mocks/chrome.runtime', 'js/globals',
    'underscore', 'amd/clients/signalr-autotransport2',  'js/test/mocks/connectionHub'
], function(
     App, runtime, ignore,
    _, AutoTransport, Hub
) {
    describe("autotransport", function() {
        var connection;
        var auto;
        var lastTimer = 0;
        beforeEach(function () {
            connection = new Hub();
            auto = AutoTransport.create();
            auto.connection = connection;
            spyOn(_, "delay").andReturn(lastTimer++);
        });
        describe("negotiate", function () {
            it("fails the whole thing if we error during negotiate", function () {
                spyOn($, "ajax").andReturn($.Deferred().reject({}, "500"));
                var done;
                auto.start().then(function(){
                    fail("should have failed the whole thing");
                    done = true;
                }, function (err){
                    done = true;
                    expect(err.message).toEqual("Error during negotiation request.");
                });

                waitsFor(function () {
                    return done;
                });
            });

            it("gracefully handles a stop request during a negotiate", function () {
                var dfd = $.Deferred();
                spyOn($, "ajax").andReturn(dfd);
                var done;
                auto.start().then(function(){
                    fail("should have failed the whole thing");
                    done = true;
                }, function (err){
                    done = true;
                    expect(err.message).toEqual("The connection was stopped during the negotiate request.");
                });
                //some important pieces here now:
                //1. we need to be sure that our negotiate request is placed on connection._.negotiateRequest
                //because this detail is required for connection.stop to do the right thing
                //2. in the event that we do abort the negotiate, this gets propagated with the correct
                //info like before
                expect(connection._.negotiateRequest).toBe(dfd);
                dfd.reject(dfd, "__Negotiate Aborted__");//very specific text
                waitsFor(function () {
                    return done;
                });
            });

            it("throws if a content filter returns html", function () {
                spyOn($, "ajax").andReturn($.Deferred().resolve("<html><body>NOT ALLOWED</body></html>"));
                var done;
                auto.start().then(function(){
                    fail("should have failed the whole thing");
                    done = true;
                }, function (err){
                    done = true;
                    expect(err.message).toEqual("Error during negotiation request.");
                });

                waitsFor(function () {
                    return done;
                });
            });
        });

        describe("fallback behavior", function(){
            beforeEach(function(){
                spyOn($.signalR.transports.webSockets, "start");
                spyOn($.signalR.transports.serverSentEvents, "start");
                spyOn($.signalR.transports.longPolling, "start");
                spyOn($.signalR.transports.webSockets, "stop");
                spyOn($.signalR.transports.serverSentEvents, "stop");
                spyOn($.signalR.transports.longPolling, "stop");
            });

            it("does not fallback if there is a success", function () {
                var negotiateDfd = $.Deferred();
                spyOn($, "ajax").andReturn(negotiateDfd);
                
                var done;
                auto.start().then(function(){
                    done = true;
                }, function (err){
                    done = true;
                    fail("should have succeeded");
                });
                negotiateDfd.resolve({
                    TryWebSockets: true,
                    ProtocolVersion:"1.3"
                });
                $.signalR.transports.webSockets.start.mostRecentCall.args[1]();

                waitsFor(function () {
                    return done;
                });

                runs(function (){
                    expect($.signalR.transports.serverSentEvents.start).not.toHaveBeenCalled();
                });
            });

            it("skips websockets if negotiate says to", function () {
                var negotiateDfd = $.Deferred();
                spyOn($, "ajax").andReturn(negotiateDfd);
                
                var done;
                auto.start().then(function(){
                    done = true;
                }, function (err){
                    done = true;
                    fail("should have succeeded");
                });
                negotiateDfd.resolve({
                    TryWebSockets: false,
                    ProtocolVersion:"1.3"
                });
                $.signalR.transports.serverSentEvents.start.mostRecentCall.args[1]();

                waitsFor(function () {
                    return done;
                });

                runs(function (){
                    expect($.signalR.transports.webSockets.start).not.toHaveBeenCalled();
                });
            });

            it("falls back all the way to longPolling if others reject", function () {
                var negotiateDfd = $.Deferred();
                spyOn($, "ajax").andReturn(negotiateDfd);
                
                var done;
                auto.start().then(function(){
                    done = true;
                }, function (err){
                    done = true;
                    fail("should have succeeded");
                });
                negotiateDfd.resolve({
                    TryWebSockets: true,
                    ProtocolVersion:"1.3"
                });
                $.signalR.transports.webSockets.start.mostRecentCall.args[2]();//reject
                
                waitsFor(function () {
                    return Boolean($.signalR.transports.serverSentEvents.start.mostRecentCall.args);
                });
                runs(function(){
                    expect($.signalR.transports.webSockets.stop).toHaveBeenCalled();
                    $.signalR.transports.serverSentEvents.start.mostRecentCall.args[2]();//reject                    
                });
                waitsFor(function () {
                    return Boolean($.signalR.transports.longPolling.start.mostRecentCall.args);
                });
                runs(function(){
                    expect($.signalR.transports.serverSentEvents.stop).toHaveBeenCalled();
                    $.signalR.transports.longPolling.start.mostRecentCall.args[1]();//resolve/success!
                });
                waitsFor(function () {
                    return done;
                });
            });

            it("falls back all the way to longPolling if others timeout", function () {
                var negotiateDfd = $.Deferred();
                spyOn($, "ajax").andReturn(negotiateDfd);
                
                var done;
                auto.start().then(function(){
                    done = true;
                }, function (err){
                    done = true;
                    fail("should have succeeded");
                });
                negotiateDfd.resolve({
                    TryWebSockets: true,
                    ProtocolVersion:"1.3"
                });
                _.delay.mostRecentCall.args[0].call();
                
                waitsFor(function () {
                    return Boolean($.signalR.transports.serverSentEvents.start.mostRecentCall.args);
                });
                runs(function(){
                    expect($.signalR.transports.webSockets.stop).toHaveBeenCalled();
                    _.delay.mostRecentCall.args[0].call();
                });
                waitsFor(function () {
                    return Boolean($.signalR.transports.longPolling.start.mostRecentCall.args);
                });
                runs(function(){
                    expect($.signalR.transports.serverSentEvents.stop).toHaveBeenCalled();
                    $.signalR.transports.longPolling.start.mostRecentCall.args[1]();//resolve/success!
                });
                waitsFor(function () {
                    return done;
                });
            });

        });
    });
});