define([
    'amd/cabra/appBlockingSession', 'amd/logger/logger'
], function(
    AppBlockingCabra, Logger
) {
    describe('AppBlockingCabra', function () {
        var appBlocking = false;
        var blockingManager = null;

        beforeEach(function () {
            appBlocking = new AppBlockingCabra();
            appBlocking.init("dyknow.me/application_blocking", 16);
            blockingManager = appBlocking.blockingManager;

            Logger.debug = $.noop;
            Logger.info = $.noop;
            Logger.warn = $.noop;
            Logger.error = $.noop;
        });

        it('passes state to apply', function() {
            spyOn(appBlocking, 'applyState');
            var state = 'testing';
            appBlocking.applyFromState(state);
            expect(appBlocking.applyState).toHaveBeenCalledWith(state);
        });

        it('passes frame to apply from realtime', function() {
            spyOn(appBlocking, 'applyState');
            var frame = {test: 'testing'};
            var state = {broadcastObject: {payload: frame}};
            appBlocking.applyFromRealtime(null, state);
            expect(appBlocking.applyState).toHaveBeenCalledWith(frame);
        });

        it('will track on state application', function() {
            spyOn(appBlocking.tracker, 'state');
            spyOn(blockingManager, 'applyState');
            var state = {test: 'testing'};

            appBlocking.applyState(state);
            expect(appBlocking.tracker.state).toHaveBeenCalledWith(state);
            expect(blockingManager.applyState).toHaveBeenCalledWith(state);
        });

        it('will track null for empty state', function() {
            spyOn(appBlocking.tracker, 'state');
            spyOn(blockingManager, 'applyState');

            appBlocking.applyState({});
            expect(appBlocking.tracker.state).toHaveBeenCalledWith(null);
            expect(blockingManager.applyState).toHaveBeenCalledWith(null);
        });

        it("leave cabra clears blocking plans", function() {
            spyOn(appBlocking, 'applyState').andCallThrough();
            spyOn(blockingManager, 'applyState').andCallThrough();
            spyOn(blockingManager, 'applyApplicationRule');
            spyOn(blockingManager, 'applyUrlFiltering');
            appBlocking.willLeaveCabra();
            expect(appBlocking.applyState).toHaveBeenCalledWith(null);
            expect(blockingManager.applyState).toHaveBeenCalledWith(null);
            expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith([], []);
            expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith([], []);
        });
    });
});
