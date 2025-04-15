define([
    'amd/clients/satellite', 'amd/settings', 'js/test/mocks/connectionHub',
    'jquery'
], function(
    Client, SETTINGS, Hub,
    $
) {
    describe('satellite client', function() {
        var client, hub;

        beforeEach(function() {
            client = new Client();
            hub = new Hub();
        });

        it('can construct client', function() {
            expect(client).toBeTruthy();
        });

        it('can initialize hub for attach V2', function() {
            spyOn($, 'hubConnection').andReturn(hub);
            hub.createHubProxy.andReturn('proxy');
            spyOn(client, 'subscribe');
            spyOn(client, '_checkHubConnection');

            client.baseUrl = 'test';
            client.coreAccessToken = 'core:token';
            client.accessToken = null;

            client._initHubConnection();

            expect(client._hubConnection).toBe(hub);
            expect(client._hubProxyMonitor).toBe('proxy');
            expect(hub.start).toHaveBeenCalled();
        });

        it('will throw for init with V2 without core access token', function() {
            spyOn($, 'hubConnection').andReturn(hub);

            client.coreAccessToken = null;
            client.accessToken = 'token';

            expect(client._initHubConnection.bind(client)).toThrow();
        });

        it('can perform V2 attach', function() {
            spyOn($, 'param').andCallFake(function(obj) {
                return 'token=' + obj.access_token;
            });
            spyOn(client, '_attachFragment').andReturn('');
            spyOn(client, 'get').andReturn(Promise.resolve({
                access_token: 'satellite_token'
            }));

            client.coreAccessToken = 'core';
            client.accessToken = 'token';

            var success = null;
            runs(function() {
                client._attach().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });
            waitsFor(function() { return success !== null; });
            runs(function() {
                expect(success).toBe(true);
                expect(client.get).toHaveBeenCalledWith('?token=core', false,
                    SETTINGS.DEFAULT_RETRY_OPTIONS);
                expect(client.accessToken).toBe('satellite_token');
            });
        });

        it('will set access token from successful attach V2', function() {
            client.accessToken = null;

            client._attachSuccessful({ access_token: 'token' });

            expect(client.accessToken).toBe('token');
        });

        it('will throw if attach V2 does not provide a token', function() {
            client.accessToken = null;

            expect(client._attachSuccessful.bind(client, {})).toThrow();
            expect(client.accessToken).toBe(null);
        });
    });
});
