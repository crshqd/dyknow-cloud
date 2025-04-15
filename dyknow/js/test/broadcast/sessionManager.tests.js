define([
    'amd/broadcast/sessionManager','amd/broadcast/session', 'amd/broadcast/broadcastSessionManager.events',
    'amd/broadcast/broadcastSession.events', 'amd/clients/core', 'amd/sandbox',
    'amd/settings', 'amd/lib/uuid', 'js/test/mocks/broadcastInstruction',
    'amd/utils/featureFlags', 'jquery', 'js/test/mocks/chrome',
    'amd/clients/satellite', 'underscore', 'amd/utils/extensionRestarter'
], function(
    BroadcastSessionManager, BroadcastSession, switchboardEvents,
    broadcastEvents, CoreApiClient, Pubsub,
    SETTINGS, guid, MockBroadcastInstruction,
    FeatureFlags, $, chrome,
    SatelliteApiClient, _, restarter
) {
    describe("switchboard", function () {
        var switchboard = null,
            api = null,
            pubsub = null;
        beforeEach(function () {
            pubsub = new Pubsub().init();
            chrome.useMock();
            restarter._resetForTests();
            api = new CoreApiClient();
            spyOn(api,"initHubConnection");
            switchboard = new BroadcastSessionManager();
        });

        afterEach(function(){
            chrome.resetMock();
        });

        describe("attach version", function() {
            var flagDfd;
            beforeEach(function() {
                flagDfd = $.Deferred();
                spyOn(FeatureFlags, 'isEnabled').andReturn(flagDfd);
                switchboard = new BroadcastSessionManager();
            });

            it('will sessionify with attach v2', function() {
                switchboard._client = { accessToken: 'core' };
                var session = switchboard.sessionify({});
                expect(session.coreAccessToken).toBe('core');
            });
        });

        describe('initialization', function() {
            beforeEach(function() {
                spyOn(switchboard, 'subscribe');
                spyOn(switchboard, 'watchForHealthySignalR');
            });

            afterEach(function() {
            });

            it('will throw if there is no client', function() {
                switchboard.client = null;
                expect(switchboard._initializeClient).toThrow();
            });

            it('will create core client', function() {
                spyOn(switchboard, '_initializeClient');
                switchboard.client = null;
                switchboard.init();

                expect(switchboard._client).toBeTruthy();
                expect(switchboard._initializeClient).toHaveBeenCalled();
            });
        });

        describe("join event", function () {
            beforeEach(function () {
                switchboard.init("DEVICE_"+guid(), api);
            });

            afterEach(function () {
                switchboard.unsubscribe();
            });

            it("adds pending session and calls attach", function () {
                spyOn(switchboard, "attach");
                var instruction1 = new MockBroadcastInstruction();
                $.trigger("join_event", [instruction1]);

                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                expect(switchboard.attach).toHaveBeenCalledWith(instruction1.broadcast_id);
            });

            it("two sessions adds to pending sessions and calls attach", function () {
                spyOn(switchboard, "attach");
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction();
                $.trigger("join_event", [instruction1, instruction2]);

                expect(Object.keys(switchboard.pendingSessions).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                expect(switchboard.attach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.attach).toHaveBeenCalledWith(instruction2.broadcast_id);
            });

            it("same session is published twice while pending but only joined once", function () {
                spyOn(switchboard, "attach");
                var instruction1 = new MockBroadcastInstruction();
                $.trigger("join_event", [instruction1]);
                $.trigger("join_event", [instruction1]);

                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                expect(switchboard.attach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.attach.calls.length).toBe(1);
            });

            it("same session is published twice while attached but only joined once", function () {
                spyOn(switchboard, "attach");
                var instruction1 = new MockBroadcastInstruction();
                $.trigger("join_event", [instruction1]);
                //simulate broadcast completing attach process
                switchboard.broadcastDidAttach(null, {broadcast_id: instruction1.broadcast_id});

                $.trigger("join_event", [instruction1]);

                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                expect(switchboard.attach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.attach.calls.length).toBe(1);
            });
        });

        describe("leave event", function () {
            beforeEach(function () {
                switchboard.init("DEVICE_"+guid(), api);
            });

            afterEach(function () {
                switchboard.unsubscribe();
            });

            it("removes pending session and calls detach", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(switchboard, "detach").andCallThrough();
                spyOn(broadcastSession1, "detach");
                $.trigger("leave_event", [instruction1]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(broadcastSession1.detach).toHaveBeenCalled();
            });

            it("detaches from all pending sessions", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.pendingSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "detach").andCallThrough();
                spyOn(broadcastSession1, "detach");
                spyOn(broadcastSession2, "detach");
                $.trigger("leave_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
                expect(broadcastSession1.detach).toHaveBeenCalled();
                expect(broadcastSession2.detach).toHaveBeenCalled();
            });

            it("detaches from an attached session", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(switchboard, "detach").andCallThrough();
                spyOn(broadcastSession1, "detach");
                $.trigger("leave_event", [instruction1]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(broadcastSession1.detach).toHaveBeenCalled();
            });

            it("detaches from all attached sessions", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "detach").andCallThrough();
                spyOn(broadcastSession1, "detach");
                spyOn(broadcastSession2, "detach");
                $.trigger("leave_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(2);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
                expect(broadcastSession1.detach).toHaveBeenCalled();
                expect(broadcastSession2.detach).toHaveBeenCalled();
            });

            it("detaches from all attached and pending sessions", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "detach").andCallThrough();
                spyOn(broadcastSession1, "detach");
                spyOn(broadcastSession2, "detach");
                $.trigger("leave_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
                expect(broadcastSession1.detach).toHaveBeenCalled();
                expect(broadcastSession2.detach).toHaveBeenCalled();
            });
        });

        describe("stealing", function() {
            beforeEach(function () {
                switchboard.init("DEVICE_"+guid(), api);
            });

            afterEach(function () {
                switchboard.unsubscribe();
            });

            it("happens when nothing is pending or attached", function () {
                spyOn(switchboard, "attach");
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction();
                $.trigger("control_changed_event", [instruction1, instruction2]);

                expect(Object.keys(switchboard.pendingSessions).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                expect(switchboard.attach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.attach).toHaveBeenCalledWith(instruction2.broadcast_id);
            });

            it("happens when one class is pending", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(switchboard, "detach");
                $.trigger("control_changed_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
            });

            it("happens when two classes are pending", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.pendingSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "detach");
                $.trigger("control_changed_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(2);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
            });

            it("happens when one class is attached", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(switchboard, "detach");
                $.trigger("control_changed_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
            });

            it("happens when two classes are attached", function () {
               var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "detach");
                $.trigger("control_changed_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(2);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
            });

            it("happens when classes are pending and attached", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "detach");
                $.trigger("control_changed_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
            });

            it("double steal before teardown of first steal starts", function () {
               var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "attachAll");
                spyOn(switchboard, "detach").andCallThrough();
                spyOn(broadcastSession1, 'detach');
                spyOn(broadcastSession1, 'unsubscribe');
                spyOn(broadcastSession1._client, 'stop');
                spyOn(broadcastSession2, 'detach');
                spyOn(broadcastSession2, 'unsubscribe');
                spyOn(broadcastSession2._client, 'stop');
                $.trigger("control_changed_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(2);
                $.trigger("control_changed_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(2);

                broadcastSession1.didDetachFromBroadcast();
                broadcastSession2.didDetachFromBroadcast();

                expect(Object.keys(switchboard.pendingSessions).length).toBe(2);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
            });

            it("double steal mid teardown of first steal starts", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "attachAll");
                spyOn(switchboard, "detach").andCallThrough();
                spyOn(broadcastSession1, 'detach');
                spyOn(broadcastSession1, 'unsubscribe');
                spyOn(broadcastSession1._client, 'stop');
                spyOn(broadcastSession2, 'detach');
                spyOn(broadcastSession2, 'unsubscribe');
                spyOn(broadcastSession2._client, 'stop');
                $.trigger("control_changed_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(2);

                broadcastSession1.didDetachFromBroadcast();

                $.trigger("control_changed_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);

                broadcastSession2.didDetachFromBroadcast();

                expect(Object.keys(switchboard.pendingSessions).length).toBe(2);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
            });

            it("double steal after teardown of first steal and during build up", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "attachAll");
                spyOn(switchboard, "detach").andCallThrough();
                spyOn(broadcastSession1, 'detach');
                spyOn(broadcastSession1, 'unsubscribe');
                spyOn(broadcastSession1._client, 'stop');
                spyOn(broadcastSession2, 'detach');
                spyOn(broadcastSession2, 'unsubscribe');
                spyOn(broadcastSession2._client, 'stop');
                $.trigger("control_changed_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(2);

                broadcastSession1.didDetachFromBroadcast();
                broadcastSession2.didDetachFromBroadcast();

                broadcastSession1 = switchboard.pendingSessions[instruction1.broadcast_id];
                broadcastSession2 = switchboard.pendingSessions[instruction2.broadcast_id];
                spyOn(broadcastSession1, 'detach');
                spyOn(broadcastSession1, 'unsubscribe');
                spyOn(broadcastSession1._client, 'stop');
                spyOn(broadcastSession2, 'detach');
                spyOn(broadcastSession2, 'unsubscribe');
                spyOn(broadcastSession2._client, 'stop');

                $.trigger("control_changed_event", [instruction1, instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(2);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(2);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
            });

            it("join event arrives before teardown from steal", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    instruction3 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "detach");
                $.trigger("control_changed_event", [instruction1, instruction2]);
                $.trigger("join_event", [instruction3]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(3);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(2);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
                expect(switchboard.detach).not.toHaveBeenCalledWith(instruction3.broadcast_id);
            });

            it("join event arrives mid teardown from steal", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    instruction3 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "detach").andCallThrough();
                spyOn(broadcastSession1, 'detach');
                spyOn(broadcastSession1, 'unsubscribe');
                spyOn(broadcastSession1._client, 'stop');
                spyOn(broadcastSession2, 'detach');
                $.trigger("control_changed_event", [instruction1, instruction2]);
                //Finish Detaching one
                broadcastSession1.didDetachFromBroadcast();
                $.trigger("join_event", [instruction3]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(3);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
                expect(switchboard.detach).not.toHaveBeenCalledWith(instruction3.broadcast_id);
            });

            it("join event arrives after teardown from steal", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    instruction3 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "attachAll");
                spyOn(switchboard, "attach");
                spyOn(switchboard, "detach").andCallThrough();
                spyOn(broadcastSession1, 'detach');
                spyOn(broadcastSession1, 'unsubscribe');
                spyOn(broadcastSession1._client, 'stop');
                spyOn(broadcastSession2, 'detach');
                spyOn(broadcastSession2, 'unsubscribe');
                spyOn(broadcastSession2._client, 'stop');
                $.trigger("control_changed_event", [instruction1, instruction2]);
                //Finish Detaching one
                broadcastSession1.didDetachFromBroadcast();
                broadcastSession2.didDetachFromBroadcast();
                $.trigger("join_event", [instruction3]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(3);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
                expect(switchboard.detach).not.toHaveBeenCalledWith(instruction3.broadcast_id);
                expect(switchboard.attachAll).toHaveBeenCalled();
            });

            it("leave event arrives before teardown from steal", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "detach");
                $.trigger("control_changed_event", [instruction1, instruction2]);
                $.trigger("leave_event", [instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(2);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
            });

            it("leave event arrives mid teardown from steal", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "detach").andCallThrough();
                spyOn(broadcastSession1, 'detach');
                spyOn(broadcastSession1, 'unsubscribe');
                spyOn(broadcastSession1._client, 'stop');
                spyOn(broadcastSession2, 'detach');
                $.trigger("control_changed_event", [instruction1, instruction2]);
                //Finish Detaching one
                broadcastSession1.didDetachFromBroadcast();
                $.trigger("leave_event", [instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
            });

            it("leave event arrives after teardown from steal", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, "attachAll");
                spyOn(switchboard, "detach").andCallThrough();
                spyOn(broadcastSession1, 'detach');
                spyOn(broadcastSession1, 'unsubscribe');
                spyOn(broadcastSession1._client, 'stop');
                spyOn(broadcastSession2, 'detach');
                spyOn(broadcastSession2, 'unsubscribe');
                spyOn(broadcastSession2._client, 'stop');
                $.trigger("control_changed_event", [instruction1, instruction2]);
                //Finish Detaching one
                broadcastSession1.didDetachFromBroadcast();
                broadcastSession2.didDetachFromBroadcast();

                broadcastSession1 = switchboard.pendingSessions[instruction1.broadcast_id];
                broadcastSession2 = switchboard.pendingSessions[instruction2.broadcast_id];
                spyOn(broadcastSession1, 'detach');
                spyOn(broadcastSession1, 'unsubscribe');
                spyOn(broadcastSession1._client, 'stop');
                spyOn(broadcastSession2, 'detach');
                spyOn(broadcastSession2, 'unsubscribe');
                spyOn(broadcastSession2._client, 'stop');

                $.trigger("leave_event", [instruction2]);
                expect(Object.keys(switchboard.pendingSessions).length).toBe(2);
                expect(Object.keys(switchboard.pendingControlChange).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
                expect(switchboard.attachAll).toHaveBeenCalled();
            });
        });

        describe("attach to all", function() {
            beforeEach(function () {
                switchboard.init("DEVICE_"+guid(), api);
            });

            afterEach(function () {
                switchboard.unsubscribe();
            });

            it("attaches to any pending sessions", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(switchboard, 'attach');
                switchboard.attachAll();
                expect(switchboard.attach).toHaveBeenCalledWith(broadcastSession1.broadcastId);
            });

            it("attaches to multiple pending sessions", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.pendingSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, 'attach');
                switchboard.attachAll();
                expect(switchboard.attach).toHaveBeenCalledWith(broadcastSession1.broadcastId);
                expect(switchboard.attach).toHaveBeenCalledWith(broadcastSession2.broadcastId);
            });

            it("skips any attached sessions", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(switchboard, 'attach');
                switchboard.attachAll();
                expect(switchboard.attach).not.toHaveBeenCalled();
            });

            it("skips multiple attached sessions", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, 'attach');
                switchboard.attachAll();
                expect(switchboard.attach).not.toHaveBeenCalled();
            });
        });

        describe("attach to session", function() {
            it("if it is pending", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(broadcastSession1, 'attach').andReturn($.Deferred());
                switchboard.attach(instruction1.broadcast_id);
                expect(broadcastSession1.attach).toHaveBeenCalled();
            });

            it("is skipped if session is attached", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(broadcastSession1, 'attach').andReturn($.Deferred());
                switchboard.attach(instruction1.broadcast_id);
                expect(broadcastSession1.attach).not.toHaveBeenCalled();
            });

            it("is skipped if not pending", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);

                spyOn(broadcastSession1, 'attach').andReturn($.Deferred());
                switchboard.attach(instruction1.broadcast_id);
                expect(broadcastSession1.attach).not.toHaveBeenCalled();
            });

            it("when successful trigger broadcastDidAttach", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(switchboard, 'broadcastDidAttach');
                spyOn(broadcastSession1, 'attach').andReturn($.Deferred().resolve());
                switchboard.attach(instruction1.broadcast_id);
                expect(switchboard.broadcastDidAttach).toHaveBeenCalled();
            });

            it("when fails trigger broadcastDidFailToAttach", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(switchboard, 'broadcastDidFailToAttach');
                spyOn(broadcastSession1, 'attach').andReturn($.Deferred().reject());
                switchboard.attach(instruction1.broadcast_id);
                expect(switchboard.broadcastDidFailToAttach).toHaveBeenCalled();
            });
        });

        describe("restart on error", function () {
            var broadcasts, satApis, initDfd, attachDfd;
            beforeEach(function () {
                broadcasts = []; satApis = [];
                initDfd = $.Deferred();
                attachDfd = $.Deferred();
                spyOn(_, "delay");
                switchboard.init("DEVICE_"+guid(), api);
                spyOn(switchboard, "sessionify").andCallFake(function (instruction){
                    var broadcast = broadcasts.shift();
                    var sat = satApis.shift();
                    //satapiclient needs to be set up in the methods below
                    broadcast.init(instruction);
                    broadcast._client = sat;
                    broadcast._client.coreAccessToken = broadcast.coreAccessToken;
                    return broadcast;
                });
            });
    
            afterEach(function () {
                switchboard.unsubscribe();
            });

            it("when fails will restart", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    satClient = new SatelliteApiClient();
                broadcasts.push(broadcastSession1);
                satApis.push(satClient);
                spyOn(satClient, "init").andReturn(initDfd);
                spyOn(satClient, "attach").andReturn(attachDfd);
                spyOn(satClient, "stop");
                switchboard._client._hubProxyMonitor = satClient._hubProxyMonitor = { on:$.noop, off:$.noop};
                spyOn(satClient._hubProxyMonitor, "on").andReturn(satClient._hubProxyMonitor);
                spyOn(satClient._hubProxyMonitor, "off").andReturn(satClient._hubProxyMonitor);
                switchboard._client._hubProxyMonitor = {stop:$.noop,on:$.noop,off:$.noop};
                switchboard._client._hubConnection = {stop:$.noop,on:$.noop,off:$.noop};
                spyOn(switchboard._client._hubProxyMonitor, "stop").andReturn(switchboard._client._hubProxyMonitor);
                spyOn(switchboard._client._hubProxyMonitor, "on").andReturn(switchboard._client._hubProxyMonitor);
                spyOn(switchboard._client._hubProxyMonitor, "off").andReturn(switchboard._client._hubProxyMonitor);
                spyOn(switchboard._client._hubConnection, "stop").andReturn(switchboard._client._hubConnection);
                spyOn(switchboard._client._hubConnection, "on").andReturn(switchboard._client._hubConnection);
                spyOn(switchboard._client._hubConnection, "off").andReturn(switchboard._client._hubConnection);


                $.trigger("join_event", [instruction1]);
                initDfd.reject();//note nothign in here
                expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 30000);
                expect(switchboard._client.initHubConnection.calls.length).toEqual(1);//gets called when initializing
                var restartAfterDetach = _.delay.calls[0].args[0];
                restartAfterDetach();
                expect(switchboard._client._processDisconnect).toEqual(true);
                expect(switchboard._client.initHubConnection.calls.length).toEqual(2);//gets called on restart after delay
            });

            describe("when stealing", function () {
                var join1,join2;
                function getYouABCComboAndPush(){
                    var instr = new MockBroadcastInstruction();
                    var bsession = new BroadcastSession();
                    var satClient = new SatelliteApiClient();
                    var initDfdLocal = $.Deferred();
                    var attachDfdLocal = $.Deferred();
                    broadcasts.push(bsession);
                    satApis.push(satClient);
                    spyOn(satClient, "init").andReturn(initDfdLocal);
                    spyOn(satClient, "attach").andReturn(attachDfdLocal);
                    spyOn(satClient, "stop");
                    satClient._hubProxyMonitor = { on:$.noop, off:$.noop};
                    spyOn(satClient._hubProxyMonitor, "on").andReturn(satClient._hubProxyMonitor);
                    spyOn(satClient._hubProxyMonitor, "off").andReturn(satClient._hubProxyMonitor);
                    return {
                        instruction: instr,
                        broadcastSession: bsession,
                        satClient: satClient,
                        initDfd: initDfdLocal,
                        attachDfd: attachDfdLocal
                    };
                }

                beforeEach(function () {
                    switchboard._client._hubProxyMonitor = {stop:$.noop,on:$.noop,off:$.noop};
                    switchboard._client._hubConnection = {stop:$.noop,on:$.noop,off:$.noop};
                    spyOn(switchboard._client._hubProxyMonitor, "stop").andReturn(switchboard._client._hubProxyMonitor);
                    spyOn(switchboard._client._hubProxyMonitor, "on").andReturn(switchboard._client._hubProxyMonitor);
                    spyOn(switchboard._client._hubProxyMonitor, "off").andReturn(switchboard._client._hubProxyMonitor);
                    spyOn(switchboard._client._hubConnection, "stop").andReturn(switchboard._client._hubConnection);
                    spyOn(switchboard._client._hubConnection, "on").andReturn(switchboard._client._hubConnection);
                    spyOn(switchboard._client._hubConnection, "off").andReturn(switchboard._client._hubConnection);

                    join1 = getYouABCComboAndPush();
                    join2 = getYouABCComboAndPush();
                    
                    $.trigger("join_event", [join1.instruction, join2.instruction]);
                    join1.initDfd.resolve();join2.initDfd.resolve();
                    join1.attachDfd.resolve({});join2.attachDfd.resolve({});
                });


                it("failing will restart despite rejection and fatalerror", function () {
                    //note: while this test is pretty cool it never really described the issue
                    //we were trying to solve for which made it pretty frustrating

                    switchboard.fatalErrorOccurredEventObserver({}, new Error("something bad happened"));
                    var restartAfterDetach = _.delay.calls[0].args[0];
                    join1 = getYouABCComboAndPush();
                    join2 = getYouABCComboAndPush();
                    restartAfterDetach();
                    $.trigger("join_event", [join1.instruction, join2.instruction]);

                    join1 = getYouABCComboAndPush();
                    join2 = getYouABCComboAndPush();
                    $.trigger("control_changed_event", [join1.instruction,join2.instruction]);

                    join1.initDfd.reject();//note nothign in here
                    expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 30000);
                    expect(switchboard._client.initHubConnection.calls.length).toEqual(2);//gets called when initializing
                    var restartAfterDetach = _.delay.calls[0].args[0];
                    restartAfterDetach();
                    expect(switchboard._client._processDisconnect).toEqual(true);
                    expect(switchboard._client.initHubConnection.calls.length).toEqual(3);//gets called on restart after delay
                });

                it("restart despite bizarre other issue I dont understand?", function () {
                    join1 = getYouABCComboAndPush();
                    join2 = getYouABCComboAndPush();
                    $.trigger("control_changed_event", [join1.instruction,join2.instruction]);
                    switchboard._client._processDisconnect = false;//why? I dont know! I cant find the right set of events to force this
                    join1.initDfd.reject();//note nothign in here
                    expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 30000);
                    expect(switchboard._client.initHubConnection.calls.length).toEqual(1);//gets called when initializing
                    var restartAfterDetach = _.delay.calls[0].args[0];
                    restartAfterDetach();
                    expect(switchboard._client._processDisconnect).toEqual(true);
                    expect(switchboard._client.initHubConnection.calls.length).toEqual(2);//gets called on restart after delay
                });

            });
        });

        describe("did receive error", function() {
            beforeEach(function () {
                switchboard.init("DEVICE_"+guid(), api);
            });

            afterEach(function () {
                switchboard.unsubscribe();
            });

            it("error is 401 triggers re-idn", function () {
                spyOn(switchboard._client, 'restart');
                spyOn($,'trigger');
                switchboard.didReceiveError({ context: { status: 401 }});
                expect(switchboard._client.restart).not.toHaveBeenCalled();
                expect($.trigger).toHaveBeenCalledWith(SETTINGS.EVENTS.IDENTITY_INVALID);
            });

            it("error is 403 triggers re-idn", function () {
                spyOn(switchboard._client, 'restart');
                spyOn($,'trigger');
                switchboard.didReceiveError({ context: { status: 403 }});
                expect(switchboard._client.restart).not.toHaveBeenCalled();
                expect($.trigger).toHaveBeenCalledWith(SETTINGS.EVENTS.IDENTITY_INVALID);
            });

            it("error is 400 restarts", function () {
                spyOn(switchboard._client, 'restart');
                switchboard.didReceiveError({ context: { status: 400 }});
                expect(switchboard._client.restart).toHaveBeenCalled();
            });

            it("error is 500 restarts", function () {
                spyOn(switchboard._client, 'restart');
                switchboard.didReceiveError({ context: { status: 500 }});
                expect(switchboard._client.restart).toHaveBeenCalled();
            });

            it('error 4908 triggers quick restart', function() {
                spyOn(switchboard._client, 'restart');
                switchboard.didReceiveError({error_code: 4908});
                expect(switchboard._client.restart).toHaveBeenCalledWith(true);
            });

            it('other errors triger normal restart', function() {
                spyOn(switchboard._client, 'restart');
                switchboard.didReceiveError();
                expect(switchboard._client.restart).toHaveBeenCalled();
                expect(switchboard._client.restart).not.toHaveBeenCalledWith(true);
            });
        });

        describe("detach from session", function() {
            it("if it is pending", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(broadcastSession1, 'detach');
                switchboard.detach(instruction1.broadcast_id);
                expect(broadcastSession1.detach).toHaveBeenCalled();
            });

            it("if it is attached", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(broadcastSession1, 'detach');
                switchboard.detach(instruction1.broadcast_id);
                expect(broadcastSession1.detach).toHaveBeenCalled();
            });

            it("ignores sessions that arent pending or attached", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);

                spyOn(broadcastSession1, 'detach');
                switchboard.detach(instruction1.broadcast_id);
                expect(broadcastSession1.detach).not.toHaveBeenCalled();
            });

            it("when successful trigger broadcastDidDetach", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(switchboard, "broadcastDidDetach");
                spyOn(broadcastSession1, 'detach');
                spyOn(broadcastSession1, 'unsubscribe');
                spyOn(broadcastSession1._client, 'stop');
                switchboard.detach(instruction1.broadcast_id);
                broadcastSession1.didDetachFromBroadcast();
                expect(broadcastSession1.detach).toHaveBeenCalled();
                expect(switchboard.broadcastDidDetach).toHaveBeenCalled();
            });

            it("when fails trigger broadcastDidFailToDetach", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(switchboard, "broadcastDidFailToDetach");
                spyOn(broadcastSession1, 'detach');
                spyOn(broadcastSession1, 'unsubscribe');
                spyOn(broadcastSession1._client, 'stop');
                switchboard.detach(instruction1.broadcast_id);
                broadcastSession1.didFailToDetachFromBroadcast(new Error());
                expect(broadcastSession1.detach).toHaveBeenCalled();
                expect(switchboard.broadcastDidFailToDetach).toHaveBeenCalled();
            });
        });

        describe("detach from all", function() {
            beforeEach(function () {
                switchboard.init("DEVICE_"+guid(), api);
            });

            afterEach(function () {
                switchboard.unsubscribe();
            });

            it("leave_from_all event calls detachAll", function() {
                spyOn(switchboard, 'detachAll');
                $.trigger("leave_from_all");
                expect(switchboard.detachAll).toHaveBeenCalled();
            });

            it("nothing pending or attached fast forwards to did detach from all", function () {
                spyOn(switchboard, 'detach');
                spyOn(switchboard, 'didDetachFromAllBroadcast');
                switchboard.detachAll();
                expect(switchboard.detach).not.toHaveBeenCalled();
                expect(switchboard.didDetachFromAllBroadcast).toHaveBeenCalled();
            });

            it("pending sessions are detached", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(switchboard, 'detach');
                spyOn(switchboard, 'didDetachFromAllBroadcast');
                switchboard.detachAll();
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.didDetachFromAllBroadcast).not.toHaveBeenCalled();
            });

            it("multiple pending sessions are detached", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.pendingSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, 'detach');
                spyOn(switchboard, 'didDetachFromAllBroadcast');
                switchboard.detachAll();
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
                expect(switchboard.didDetachFromAllBroadcast).not.toHaveBeenCalled();
            });

            it("attached sessions are detached", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;

                spyOn(switchboard, 'detach');
                spyOn(switchboard, 'didDetachFromAllBroadcast');
                switchboard.detachAll();
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.didDetachFromAllBroadcast).not.toHaveBeenCalled();
            });

            it("multiple attached sessions are detached", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, 'detach');
                spyOn(switchboard, 'didDetachFromAllBroadcast');
                switchboard.detachAll();
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
                expect(switchboard.didDetachFromAllBroadcast).not.toHaveBeenCalled();
            });

            it("pending and attached sessions are detached", function () {
                var instruction1 = new MockBroadcastInstruction(),
                    instruction2 = new MockBroadcastInstruction(),
                    broadcastSession1 = new BroadcastSession(),
                    broadcastSession2 = new BroadcastSession();
                broadcastSession1.init(instruction1);
                broadcastSession2.init(instruction2);
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;

                spyOn(switchboard, 'detach');
                spyOn(switchboard, 'didDetachFromAllBroadcast');
                switchboard.detachAll();
                expect(switchboard.detach).toHaveBeenCalledWith(instruction1.broadcast_id);
                expect(switchboard.detach).toHaveBeenCalledWith(instruction2.broadcast_id);
                expect(switchboard.didDetachFromAllBroadcast).not.toHaveBeenCalled();
            });
        });

        describe("subscribe", function() {
            it("receives fatal error events", function () {
                spyOn(switchboard, 'fatalErrorOccurredEventObserver');
                switchboard.init("DEVICE_"+guid(), api);
                $.trigger(SETTINGS.EVENTS.FATAL_ERROR, new Error());
                expect(switchboard.fatalErrorOccurredEventObserver).toHaveBeenCalled();
                switchboard.unsubscribe();
            });

            it("receives leave from all events", function () {
                spyOn(switchboard, 'leaveFromAllObserver');
                switchboard.init("DEVICE_"+guid(), api);
                $.trigger("leave_from_all");
                expect(switchboard.leaveFromAllObserver).toHaveBeenCalled();
                switchboard.unsubscribe();
            });

            it("receives join events", function () {
                spyOn(switchboard, 'joinEventObserver');
                switchboard.init("DEVICE_"+guid(), api);
                $.trigger("join_event", [new MockBroadcastInstruction()]);
                expect(switchboard.joinEventObserver).toHaveBeenCalled();
                switchboard.unsubscribe();
            });

            it("receives leave events", function () {
                spyOn(switchboard, 'leaveEventObserver');
                switchboard.init("DEVICE_"+guid(), api);
                $.trigger("leave_event", [new MockBroadcastInstruction()]);
                expect(switchboard.leaveEventObserver).toHaveBeenCalled();
                switchboard.unsubscribe();
            });

            it("receives control change events", function () {
                spyOn(switchboard, 'controlChangedEventObserver');
                switchboard.init("DEVICE_"+guid(), api);
                $.trigger("control_changed_event", [new MockBroadcastInstruction()]);
                expect(switchboard.controlChangedEventObserver).toHaveBeenCalled();
                switchboard.unsubscribe();
            });

            it("does not receive join events if not subsribed", function () {
                spyOn(switchboard, 'joinEventObserver');
                $.trigger("join_event", [new MockBroadcastInstruction()]);
                expect(switchboard.joinEventObserver).not.toHaveBeenCalled();
            });

            it("does not receive leave events if not subsribed", function () {
                spyOn(switchboard, 'leaveEventObserver');
                $.trigger("leave_event", [new MockBroadcastInstruction()]);
                expect(switchboard.leaveEventObserver).not.toHaveBeenCalled();
            });

            it("does not receive control change events if not subsribed", function () {
                spyOn(switchboard, 'controlChangedEventObserver');
                $.trigger("control_changed_event", [new MockBroadcastInstruction()]);
                expect(switchboard.controlChangedEventObserver).not.toHaveBeenCalled();
            });
        });

        describe("unsubscribe", function() {
            it("does not receive fatal error events if unsubscribed", function () {
                spyOn(switchboard, 'fatalErrorOccurredEventObserver');
                switchboard.init("DEVICE_"+guid(), api);
                switchboard.unsubscribe();
                $.trigger(SETTINGS.EVENTS.FATAL_ERROR, new Error());
                expect(switchboard.fatalErrorOccurredEventObserver).not.toHaveBeenCalled();
            });

            it("does not receive leave from all events if unsubscribed", function () {
                spyOn(switchboard, 'leaveFromAllObserver');
                switchboard.init("DEVICE_"+guid(), api);
                switchboard.unsubscribe();
                $.trigger("leave_from_all");
                expect(switchboard.leaveFromAllObserver).not.toHaveBeenCalled();
            });

            it("does not receive join events if unsubscribed", function () {
                spyOn(switchboard, 'joinEventObserver');
                switchboard.init("DEVICE_"+guid(), api);
                switchboard.unsubscribe();
                $.trigger("join_event", [new MockBroadcastInstruction()]);
                expect(switchboard.joinEventObserver).not.toHaveBeenCalled();
            });

            it("does not receive leave events if unsubscribed", function () {
                spyOn(switchboard, 'leaveEventObserver');
                switchboard.init("DEVICE_"+guid(), api);
                switchboard.unsubscribe();
                $.trigger("leave_event", [new MockBroadcastInstruction()]);
                expect(switchboard.leaveEventObserver).not.toHaveBeenCalled();
            });

            it("does not receive control change events if unsubscribed", function () {
                spyOn(switchboard, 'controlChangedEventObserver');
                switchboard.init("DEVICE_"+guid(), api);
                switchboard.unsubscribe();
                $.trigger("control_changed_event", [new MockBroadcastInstruction()]);
                expect(switchboard.controlChangedEventObserver).not.toHaveBeenCalled();
            });

            it("does not receive control change events if unsubscribed", function () {
                spyOn(switchboard, 'controlChangedEventObserver');
                switchboard.init("DEVICE_"+guid(), api);
                switchboard.unsubscribe();
                $.trigger("control_changed_event", [new MockBroadcastInstruction()]);
                expect(switchboard.controlChangedEventObserver).not.toHaveBeenCalled();
            });
        });

        describe('network reachability', function () {
            var mockClient;
            beforeEach(function() {
                mockClient = {
                    _processDisconnect: true,
                    isCommunicating: jasmine.createSpy()
                };
                switchboard._client = mockClient;
            });

            afterEach(function() {
                switchboard._client = false;
            });

            it('is communicating while client is communicating', function() {
                mockClient.isCommunicating.andReturn(true);
                expect(switchboard.isCommunicating()).toBe(true);
                expect(mockClient.isCommunicating).toHaveBeenCalled();
            });

            it('is not communicating while client is not communicating', function() {
                mockClient.isCommunicating.andReturn(false);
                expect(switchboard.isCommunicating()).toBe(false);
                expect(mockClient.isCommunicating).toHaveBeenCalled();
            });

            it('is not communicating while client is communicating and ignores disconnect', function() {
                mockClient._processDisconnect = false;
                mockClient.isCommunicating.andReturn(true);
                expect(switchboard.isCommunicating()).toBe(false);
                expect(mockClient.isCommunicating).not.toHaveBeenCalled();
            });

            it('is not communicating while client is not communicating and ignores disconnect', function() {
                mockClient._processDisconnect = false;
                mockClient.isCommunicating.andReturn(false);
                expect(switchboard.isCommunicating()).toBe(false);
                expect(mockClient.isCommunicating).not.toHaveBeenCalled();
            });
        });

        describe("session lifecycle events", function () {
            xit("broadcastWillAttach is called when event is published", function () {
                spyOn(switchboard, "broadcastWillAttach");
                switchboard.subscribe();
                pubsub.publish(broadcastEvents.BroadcastSessionWillAttachEvent, { broadcast_id: "should be a guid" });
                expect(switchboard.broadcastWillAttach).toHaveBeenCalled();
            });

            it("broadcastWillAttach throws if broadcast_id not defined", function () {
                var callingBroadcastWillAttachWithoutID = function () {
                    switchboard.broadcastWillAttach({});
                };
                expect(callingBroadcastWillAttachWithoutID).toThrow();
            });

            it("broadcastWillAttach throws if broadcast_id not defined", function () {
                var callingBroadcastWillAttachWithoutID = function () {
                    switchboard.broadcastWillAttach();
                };
                expect(callingBroadcastWillAttachWithoutID).toThrow();
            });

            xit("broadcastWillAttach publishes switchboard event for willattach", function () {
                spyOn(pubsub, "publish");
                switchboard.broadcastWillAttach({ broadcast_id: "should be a guid" });
                expect(pubsub.publish).toHaveBeenCalledWith(switchboardEvents.BroadcastSessionManagerWillAttachToBroadcast, { broadcast_id: "should be a guid" });
            });

            xit("broadcastDidAttach is called when event is published", function () {
                spyOn(switchboard, "broadcastDidAttach");
                switchboard.subscribe();
                pubsub.publish(broadcastEvents.BroadcastSessionDidAttachEvent, { broadcast_id: "should be a guid" });
                expect(switchboard.broadcastDidAttach).toHaveBeenCalled();
            });

            xit("broadcastDidAttach publishes switchboard event for didattach", function () {
                spyOn(pubsub, "publish");
                switchboard.broadcastDidAttach({ broadcast_id: "should be a guid" });
                expect(pubsub.publish).toHaveBeenCalledWith(switchboardEvents.BroadcastSessionManagerDidAttachToBroadcast, { broadcast_id: "should be a guid" });
            });

            it("broadcastDidAttach throws if broadcast_id not defined", function () {
                var callingBroadcastDidAttachWithoutID = function () {
                    switchboard.broadcastDidAttach({});
                };
                expect(callingBroadcastDidAttachWithoutID).toThrow();
            });

            it("broadcastDidAttach throws if broadcast_id not defined", function () {
                var callingBroadcastDidAttachWithoutID = function () {
                    switchboard.broadcastDidAttach();
                };
                expect(callingBroadcastDidAttachWithoutID).toThrow();
            });

            it("broadcastDidAttach transitions from pending to attached", function () {
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                switchboard.broadcastDidAttach(null, { broadcast_id: broadcastSession1.broadcastId });
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                expect(switchboard.attachedSessions[broadcastSession1.broadcastId]).toEqual(broadcastSession1);
            });

            it("broadcastDidAttach transitions from pending to attached (one already attached)", function () {
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                var broadcastSession2 = new BroadcastSession();
                broadcastSession2.init(new MockBroadcastInstruction());
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.pendingSessions[broadcastSession2.broadcastId] = broadcastSession2;
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                switchboard.broadcastDidAttach(null, { broadcast_id: broadcastSession2.broadcastId });
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(2);
                expect(switchboard.attachedSessions[broadcastSession2.broadcastId]).toEqual(broadcastSession2);
                expect(switchboard.attachedSessions[broadcastSession1.broadcastId]).toEqual(broadcastSession1);
            });

            it("broadcastDidAttach noops if session is not found in the pending array for somereason", function () {
                var broadcastSession = new BroadcastSession();
                broadcastSession.init(new MockBroadcastInstruction());
                switchboard.broadcastDidAttach(null, { broadcast_id: broadcastSession.broadcastId });
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
            });

            xit("broadcastDidFailToAttach is called when event is published", function () {
                spyOn(switchboard, "broadcastDidFailToAttach");
                switchboard.subscribe();
                pubsub.publish(broadcastEvents.BroadcastSessionDidFailToAttachEvent, { broadcast_id: "should be a guid" });
                expect(switchboard.broadcastDidFailToAttach).toHaveBeenCalled();
            });

            it("broadcastDidFailToAttach throws if broadcast_id not defined", function () {
                var callingBroadcastDidFailAttachWithoutID = function () {
                    switchboard.broadcastDidFailToAttach({});
                };
                expect(callingBroadcastDidFailAttachWithoutID).toThrow();
            });

            it("broadcastDidFailToAttach transitions from pending", function () {
                spyOn(switchboard, "didReceiveError");
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                switchboard.broadcastDidFailToAttach(null, { broadcast_id: broadcastSession1.broadcastId });
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
            });

            it("broadcastDidFailToAttach transitions from pending (one already attached)", function () {
                spyOn(switchboard, "didReceiveError");
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                var broadcastSession2 = new BroadcastSession();
                broadcastSession2.init(new MockBroadcastInstruction());
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.pendingSessions[broadcastSession2.broadcastId] = broadcastSession2;
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                switchboard.broadcastDidFailToAttach(null, { broadcast_id: broadcastSession2.broadcastId });
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                expect(switchboard.attachedSessions[broadcastSession1.broadcastId]).toEqual(broadcastSession1);
            });

            it("broadcastDidFailToAttach calls didReceiveError to trigger teardown", function () {
                spyOn(switchboard, "didReceiveError");
                var broadcastSession = new BroadcastSession();
                broadcastSession.init(new MockBroadcastInstruction());
                switchboard.broadcastDidFailToAttach(null, { broadcast_id: broadcastSession.broadcastId });
                expect(switchboard.didReceiveError).toHaveBeenCalled();
            });

            it("broadcastDidFailToAttach throws if broadcast_id not defined", function () {
                var callingBroadcastDidFailAttachWithoutID = function () {
                    switchboard.broadcastDidFailToAttach();
                };
                expect(callingBroadcastDidFailAttachWithoutID).toThrow();
            });

            xit("broadcastDidReceiveError is called when event is published", function () {
                spyOn(switchboard, "broadcastDidReceiveError");
                switchboard.subscribe();
                pubsub.publish(broadcastEvents.BroadcastSessionDidReceiveErrorEvent, { broadcast_id: "should be a guid", error: new Error() });
                expect(switchboard.broadcastDidReceiveError).toHaveBeenCalled();
            });

            it("broadcastDidReceiveError throws if broadcast_id not defined", function () {
                var callingBroadcastDidReceiveErrorWithoutID = function () {
                    switchboard.broadcastDidReceiveError();
                };
                expect(callingBroadcastDidReceiveErrorWithoutID).toThrow();
            });

            it("broadcastDidReceiveError calls didReceiveError to trigger teardown", function () {
                spyOn(switchboard, "didReceiveError");
                switchboard.broadcastDidReceiveError(null, { broadcast_id: "should be a guid", error: new Error() });
                expect(switchboard.didReceiveError).toHaveBeenCalled();
            });

            xit("broadcastWillDetach is called when event is published", function () {
                spyOn(switchboard, "broadcastWillDetach");
                switchboard.subscribe();
                pubsub.publish(broadcastEvents.BroadcastSessionWillDetachEvent, { broadcast_id: "should be a guid" });
                expect(switchboard.broadcastWillDetach).toHaveBeenCalled();
            });

            it("broadcastWillDetach throws if broadcast_id not defined", function () {
                var callingBroadcastWillDetachWithoutID = function () {
                    switchboard.broadcastWillDetach({});
                };
                expect(callingBroadcastWillDetachWithoutID).toThrow();
            });

            it("broadcastWillDetach throws if broadcast_id not defined", function () {
                var callingBroadcastWillDetachWithoutID = function () {
                    switchboard.broadcastWillDetach();
                };
                expect(callingBroadcastWillDetachWithoutID).toThrow();
            });

            xit("broadcastWillDetach publishes switchboard event for willdetach", function () {
                spyOn(pubsub, "publish");
                switchboard.broadcastWillDetach({ broadcast_id: "should be a guid" });
                expect(pubsub.publish).toHaveBeenCalledWith(switchboardEvents.BroadcastSessionManagerWillDetachFromBroadcast, { broadcast_id: "should be a guid" });
            });

            xit("broadcastDidDetach is called when event is published", function () {
                spyOn(switchboard, "broadcastDidDetach");
                switchboard.subscribe();
                pubsub.publish(broadcastEvents.BroadcastSessionDidDetachEvent, { broadcast_id: "should be a guid" });
                expect(switchboard.broadcastDidDetach).toHaveBeenCalled();
            });

            xit("broadcastDidDetach publishes switchboard event for diddetach", function () {
                spyOn(pubsub, "publish");
                switchboard.broadcastDidDetach(null, { broadcast_id: "should be a guid" });
                expect(pubsub.publish).toHaveBeenCalledWith(switchboardEvents.BroadcastSessionManagerDidDetachFromBroadcast, { broadcast_id: "should be a guid" });
            });

            it("broadcastDidDetach throws if broadcast_id not defined", function () {
                var callingBroadcastDidDetachWithoutID = function () {
                    switchboard.broadcastDidDetach({});
                };
                expect(callingBroadcastDidDetachWithoutID).toThrow();
            });

            it("broadcastDidDetach throws if broadcast_id not defined", function () {
                var callingBroadcastDidDetachWithoutID = function () {
                    switchboard.broadcastDidDetach();
                };
                expect(callingBroadcastDidDetachWithoutID).toThrow();
            });

            it("broadcastDidDetach transitions from attached", function () {
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                switchboard.broadcastDidDetach(null, { broadcast_id: broadcastSession1.broadcastId });
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
            });

            it("broadcastDidDetach transitions from attached has one pending", function () {
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                var broadcastSession2 = new BroadcastSession();
                broadcastSession2.init(new MockBroadcastInstruction());
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.pendingSessions[broadcastSession2.broadcastId] = broadcastSession2;
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                switchboard.broadcastDidDetach(null, { broadcast_id: broadcastSession1.broadcastId });
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
            });

            it("broadcastDidDetach transitions from pending has one attached", function () {
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                var broadcastSession2 = new BroadcastSession();
                broadcastSession2.init(new MockBroadcastInstruction());
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.pendingSessions[broadcastSession2.broadcastId] = broadcastSession2;
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                switchboard.broadcastDidDetach(null, { broadcast_id: broadcastSession2.broadcastId });
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
            });

            it("broadcastDidDetach transitions from pending", function () {
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                switchboard.broadcastDidDetach(null, { broadcast_id: broadcastSession1.broadcastId });
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
            });

            xit("broadcastDidDetach skips startup if still has pending sessions to detach", function () {
                spyOn(switchboard, "startup");
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                var broadcastSession2 = new BroadcastSession();
                broadcastSession2.init(new MockBroadcastInstruction());
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.pendingSessions[broadcastSession2.broadcastId] = broadcastSession2;
                switchboard.isReconnecting = true;
                switchboard.isWaitingForNetwork = false;
                switchboard.broadcastDidDetach({ broadcast_id: broadcastSession1.broadcastId });
                expect(switchboard.startup).not.toHaveBeenCalled();
            });

            xit("broadcastDidDetach skips startup if still has attached sessions to detach", function () {
                spyOn(switchboard, "startup");
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                var broadcastSession2 = new BroadcastSession();
                broadcastSession2.init(new MockBroadcastInstruction());
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;
                switchboard.isReconnecting = true;
                switchboard.isWaitingForNetwork = false;
                switchboard.broadcastDidDetach({ broadcast_id: broadcastSession1.broadcastId });
                expect(switchboard.startup).not.toHaveBeenCalled();
            });

            xit("broadcastDidDetach skips startup if still has pending or attched sessions to detach", function () {
                spyOn(switchboard, "startup");
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                var broadcastSession2 = new BroadcastSession();
                broadcastSession2.init(new MockBroadcastInstruction());
                var broadcastSession3 = new BroadcastSession();
                broadcastSession3.init(new MockBroadcastInstruction());
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.attachedSessions[broadcastSession2.broadcastId] = broadcastSession2;
                switchboard.pendingSessions[broadcastSession3.broadcastId] = broadcastSession3;
                switchboard.isReconnecting = true;
                switchboard.isWaitingForNetwork = false;
                switchboard.broadcastDidDetach({ broadcast_id: broadcastSession1.broadcastId });
                expect(switchboard.startup).not.toHaveBeenCalled();
            });

            xit("broadcastDidDetach last pending broadcast calls startup if reconnecting and has network", function () {
                spyOn(switchboard, "startup");
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.isReconnecting = true;
                switchboard.isWaitingForNetwork = false;
                switchboard.broadcastDidDetach({ broadcast_id: broadcastSession1.broadcastId });
                expect(switchboard.startup).toHaveBeenCalledWith(30000);
            });

            xit("broadcastDidDetach last attached broadcast calls startup if reconnecting and has network", function () {
                spyOn(switchboard, "startup");
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.isReconnecting = true;
                switchboard.isWaitingForNetwork = false;
                switchboard.broadcastDidDetach({ broadcast_id: broadcastSession1.broadcastId });
                expect(switchboard.startup).toHaveBeenCalledWith(30000);
            });

            xit("broadcastDidDetach last pending broadcast skips startup if not reconnecting and has network", function () {
                spyOn(switchboard, "startup");
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.isReconnecting = false;
                switchboard.isWaitingForNetwork = false;
                switchboard.broadcastDidDetach({ broadcast_id: broadcastSession1.broadcastId });
                expect(switchboard.startup).not.toHaveBeenCalled();
            });

            xit("broadcastDidDetach last attached broadcast skips startup if not reconnecting and has network", function () {
                spyOn(switchboard, "startup");
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.isReconnecting = false;
                switchboard.isWaitingForNetwork = false;
                switchboard.broadcastDidDetach({ broadcast_id: broadcastSession1.broadcastId });
                expect(switchboard.startup).not.toHaveBeenCalled();
            });

            xit("broadcastDidDetach last pending broadcast skips startup if reconnecting but no network", function () {
                spyOn(switchboard, "startup");
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.isReconnecting = true;
                switchboard.isWaitingForNetwork = true;
                switchboard.broadcastDidDetach({ broadcast_id: broadcastSession1.broadcastId });
                expect(switchboard.startup).not.toHaveBeenCalled();
            });

            xit("broadcastDidDetach last attached broadcast skips startup if reconnecting but no network", function () {
                spyOn(switchboard, "startup");
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.isReconnecting = true;
                switchboard.isWaitingForNetwork = true;
                switchboard.broadcastDidDetach({ broadcast_id: broadcastSession1.broadcastId });
                expect(switchboard.startup).not.toHaveBeenCalled();
            });

            xit("broadcastDidFailToDetach is called when event is published", function () {
                spyOn(switchboard, "broadcastDidFailToDetach");
                switchboard.subscribe();
                pubsub.publish(broadcastEvents.BroadcastSessionDidFailToDetachEvent, { broadcast_id: "should be a guid" });
                expect(switchboard.broadcastDidFailToDetach).toHaveBeenCalled();
            });

            it("broadcastDidFailToDetach throws if cabra_id not defined", function () {
                var callingBroadcastDidFailDetachWithoutID = function () {
                    switchboard.broadcastDidFailToDetach({});
                };
                expect(callingBroadcastDidFailDetachWithoutID).toThrow();
            });

            it("broadcastDidFailToDetach transitions from attached", function () {
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                switchboard.broadcastDidFailToDetach(null, { broadcast_id: broadcastSession1.broadcastId });
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
            });

            it("broadcastDidFailToDetach transitions from attached has one pending", function () {
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                var broadcastSession2 = new BroadcastSession();
                broadcastSession2.init(new MockBroadcastInstruction());
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.pendingSessions[broadcastSession2.broadcastId] = broadcastSession2;
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                switchboard.broadcastDidFailToDetach(null, { broadcast_id: broadcastSession1.broadcastId });
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
            });

            it("broadcastDidFailToDetach transitions from pending has one attached", function () {
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                var broadcastSession2 = new BroadcastSession();
                broadcastSession2.init(new MockBroadcastInstruction());
                switchboard.attachedSessions[broadcastSession1.broadcastId] = broadcastSession1;
                switchboard.pendingSessions[broadcastSession2.broadcastId] = broadcastSession2;
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
                switchboard.broadcastDidFailToDetach(null, { broadcast_id: broadcastSession2.broadcastId });
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(1);
            });

            it("broadcastDidFailToDetach transitions from pending", function () {
                var broadcastSession1 = new BroadcastSession();
                broadcastSession1.init(new MockBroadcastInstruction());
                switchboard.pendingSessions[broadcastSession1.broadcastId] = broadcastSession1;
                expect(Object.keys(switchboard.pendingSessions).length).toBe(1);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
                switchboard.broadcastDidFailToDetach(null, { broadcast_id: broadcastSession1.broadcastId });
                expect(Object.keys(switchboard.pendingSessions).length).toBe(0);
                expect(Object.keys(switchboard.attachedSessions).length).toBe(0);
            });

            it("broadcastDidFailToDetach throws if cabra_id not defined", function () {
                var callingBroadcastDidFailDetachWithoutID = function () {
                    switchboard.broadcastDidFailToDetach();
                };
                expect(callingBroadcastDidFailDetachWithoutID).toThrow();
            });
        });

        describe("watchForHealthySignarR", function () {
            var tick;
            beforeEach(function () {
                //note: for somereason the instance closed over by the jasmine clock tick
                //was not our instance breaking all the tests... soooo.... this will do
                spyOn(switchboard, "_setInterval");
                switchboard._client = { _hubConnection: { state : 1, groupsToken:"23l4kj32kl4j324ljk32" }};//start out all connected
                switchboard.watchForHealthySignalR();
                tick = switchboard._setInterval.calls[0].args[0];
            });
           
            it("will not reset as long as we are healthy", function() {
                for(var i=0;i<480;i++){//this runs for twice the expected time
                    tick();
                }
                expect(chrome.runtime.reload).not.toHaveBeenCalled();
            });

            it("will reload if we are not healthy", function() {
                switchboard._client._hubConnection.state  =  4;//oh no disconnected!
                for(var i=0;i<242;i++){
                    tick();
                }
                expect(chrome.runtime.reload).toHaveBeenCalled();
            });

            it("will not reset as long as we are in a delay", function () {
                switchboard._client._hubConnection.state  =  4;//oh no disconnected!
                switchboard._client._processingDelay = true;//because we're processing a delay
                for(var i=0;i<480;i++){//this runs for twice the expected time
                    tick();
                }
                expect(chrome.runtime.reload).not.toHaveBeenCalled();
            });

            it("will reset if we are never sent our groups token", function () {
                switchboard._client._hubConnection.state  =  1;//looks fine here
                switchboard._client._hubConnection.groupsToken  =  null;//except the server never subscribed us to our channels! that means we will never be told to join a class!
                for(var i=0;i<242;i++){//this runs for twice the expected time
                    tick();
                }
                expect(chrome.runtime.reload).toHaveBeenCalled();
            });
        });
    });
});
