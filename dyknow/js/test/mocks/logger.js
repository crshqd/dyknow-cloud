define([
    'amd/logger/logger'
], function(
    Logger
) {
    var mock = {
        useMock: function() {
            spyOn(Logger, 'debug');
            spyOn(Logger, 'info');
            spyOn(Logger, 'warn');
            spyOn(Logger, 'error');
        }
    };

    return mock;
});
