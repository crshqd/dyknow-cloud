define([
    'jquery'
], function(
    $
) {
    var identityMethods = [
        'connectionSlow',
        'disconnected',
        'error',
        'received',
        'reconnected',
        'reconnecting',
        'starting',
        'stateChanged'
    ];

    function Hub() {
        var self = this;
        $.signalR.fn.init.call(this, "localhost", "", true);
        this._parseResponse = $.signalR.fn._parseResponse;
        this.clientProtocol = "1.3";
        var mock = jasmine.createSpyObj('hub', ['createHubProxy', 'start', 'stop', 'log']);
        $.extend(this, mock);

        identityMethods.forEach(function(key) {
            self[key] = jasmine.createSpy(key).andCallFake(
                self.identityEvent.bind(self));
        });
    }

    Hub.prototype.identityEvent = function() {
        return this;
    };

    return Hub;
});
