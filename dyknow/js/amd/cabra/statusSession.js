define(['amd/cabra/session', 'amd/cabra/helper/status', 'amd/logger/logger'], function(CabraSession, Status, Logger){
    var StatusCabraSession = function () {
        var _this = this;
        var constants = {
            payloads : {
                teacherStatusRequest: '6c704f01-0443-4633-b420-90a9dc1ef308',
                studentUpdateDeviceStatus: '8489c53c-9c74-4e8d-9be2-c832358999b7'
            }
        };

        this.status = false;

        this.init = function (name, cabraId, rules, satelliteAPIClient, instance) {
            this.status = new Status();
            return StatusCabraSession.prototype.init.apply(this, arguments);
        };

        this.didEnterCabra = function () {
            StatusCabraSession.prototype.didEnterCabra.apply(this, arguments);
            
            this.status.start();
            sandbox.subscribe('statusUpdated', function(status){
                _this.status.hideUI();
                _this.postStatusToSever(status.status, status.conversation_id);
            });
        };

        this.willLeaveCabra = function () {
            this.status.stop();
            sandbox.unsubscribe('statusUpdated');
            
            StatusCabraSession.prototype.willLeaveCabra.apply(this, arguments);
        };

        this.applyFromState = function (data) {
            StatusCabraSession.prototype.applyFromState.apply(this, arguments);
            
            //hack to give initial form a second to open (prevents opening of 3 forms
            if(data.payload.last_request){
                Logger.info("State: has pending status request, showing form");
                _this.requestStatus(data.payload.last_request);
            }
        };

        this.applyFromRealtime = function (evt, data) {
            StatusCabraSession.prototype.applyFromRealtime.apply(this, arguments);
            
            var payload = data.broadcastObject.payload;
            if(payload.payload_id === constants.payloads.teacherStatusRequest){
                Logger.info("Realtime: New status request received, showing form");
                this.requestStatus(payload);
            } else if(payload.payload_id === constants.payloads.studentUpdateDeviceStatus){
                Logger.info("Realtime: Student responded to status on another device updating status");
                this.setStatus(payload.payload);
            }
        };

        this.postStatusToSever = function(status, conversation_id){
            this._client.addCabraFrame(this.cabraId, this.rules.first(), conversation_id || false, status)
                .done(function (data) {
                    Logger.debug("Status successfully post to the server.", status);
                }).fail(function (errorThrown) {
                    Logger.error("Status post request failed.", errorThrown);
                });
        };

        this.requestStatus = function (payload) {
            this.status.requestStatus(payload);
        };

        this.setStatus = function (payload) {
            this.status.setStatus(payload);
        };
    };

    extend( StatusCabraSession, CabraSession );

    return StatusCabraSession;
});