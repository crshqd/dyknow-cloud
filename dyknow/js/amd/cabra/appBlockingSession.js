define([
    'amd/cabra/session', 'amd/logger/logger', 'amd/qsr/blockingManager',
    'amd/qsr/tracker', 'underscore'
], function(
    CabraSession, Logger, BlockingManager,
    Tracker, _
) {
    var AppBlockingCabraSession = function() {

        this.blockingManager = BlockingManager.instance();
        this.tracker = Tracker.instance('blocking');

        this.init = function (name, cabraId, rules, satelliteAPIClient, instance) {
            return AppBlockingCabraSession.prototype.init.apply(this, arguments);
        };

        /**
         * Clear Appblocking before tearing down.
         */
        this.willLeaveCabra = function() {
            Logger.info('Clearing app blocking cabra for leave.');
            this.applyState(null);
            AppBlockingCabraSession.prototype.willLeaveCabra.apply(this, arguments);
        };

        /**
         * Apply from a state event.
         * @param {object} state The state to apply.
         */
        this.applyFromState = function(state) {
            AppBlockingCabraSession.prototype.applyFromState.apply(this, arguments);
            this.applyState(state);
        };

        /**
         * Apply from a realtime event.
         * @param {object} evt The event.
         * @param {object} data The realtime data.
         */
        this.applyFromRealtime = function(evt, data) {
            AppBlockingCabraSession.prototype.applyFromRealtime.apply(this, arguments);
            var frame = this._getFrame(data);
            this.applyState(frame);
        };

        /**
         * Update the tracker and blocking manager states.
         * @param {object} The state object to apply.
         */
        this.applyState = function(state) {
            var state = (state && !_.isEmpty(state)) ? state : null;
            Logger.info('Updating app blocking tracker.');
            this.tracker.state(state);
            this.blockingManager.applyState(state);
        };
    };

    extend(AppBlockingCabraSession, CabraSession);

    return AppBlockingCabraSession;
});
