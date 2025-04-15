define([
    'amd/clients/core', 'amd/application', 'amd/broadcast/session', 
    'amd/clients/satellite', 'js/globals', 'amd/cabra/sessionFactory',
    'amd/cabra/session', 'amd/cabra/cabraSession.events', 'amd/settings',
    'js/test/mocks/broadcastFrameCommand', 'amd/lib/uuid', 'amd/sandbox'
], function(
    CoreApiClient, App, BroadcastSession, 
    SatelliteApiClient, ignore, CabraSessionFactory,
    BaseCabraSession, cabraEvents, SETTINGS,
    MockBroadcastFrameCommand, guid, Pubsub
){
    describe('broadcastSession basics', function() {
        var session;
        beforeEach(function() {
            session = new BroadcastSession();
        });

        it('can construct session with version and token', function() {
            session = new BroadcastSession('testing');
            expect(session.coreAccessToken).toBe('testing');

            session = new BroadcastSession();
            expect(session.coreAccessToken).toBe(undefined);
        });

        it('_allCabras contains all cabras', function() {
            session.pendingCabras['111'] = 'test-111';
            session.pendingCabras['222'] = 'test-222';
            session.pendingCabras['333'] = 'test-333';
            session.activeCabras['444'] = 'test-444';
            session.activeCabras['555'] = 'test-555';

            var cabras = session._allCabras();
            expect(Object.keys(cabras).length).toEqual(5);

            var key;
            for (key in session.pendingCabras) {
                expect(cabras.hasOwnProperty(key)).toBe(true);
            }
            for (key in session.activeCabras) {
                expect(cabras.hasOwnProperty(key)).toBe(true);
            }
        });

        it('can initialize session', function() {
            spyOn(session, 'initParams');

            session.init({});

            expect(session.initParams).toHaveBeenCalled();
            expect(session._client).toBeTruthy();
        });

        it('can initialize session for V2 attach', function() {
            spyOn(session, 'initParams');
            session.coreAccessToken = 'testing';

            session.init({});

            expect(session.initParams).toHaveBeenCalled();
            expect(session._client).toBeTruthy();
            expect(session.accessToken).toBe('testing');
        });

        it('can copy init parameters', function() {
            session.test = null;
            session.testKey = null;
            session.initParams({
                test: 'test',
                test_key: 'test_value',
                other_key: 'nope'
            });

            expect(session.test).toBe('test');
            expect(session.testKey).toBe('test_value');
            expect(session.otherKey).toBe(undefined);
            expect(session.other_key).toBe(undefined);
        });

        it('will throw for bad parameters in init', function() {
            function init(params) {
                return session.initParams.bind(session, params);
            }

            expect(init({url: false})).toThrow();
            expect(init({broadcast_id: false})).toThrow();
            expect(init({broadcast_id: undefined})).toThrow();
            expect(init({broadcast_id: null})).toThrow();
            expect(init({broadcast_id: ''})).toThrow();

            expect(init({broadcast_id: 'testing'})).not.toThrow();
            expect(init({test_key: ''})).not.toThrow();
        });

        it('will allow empty token for attach V2', function() {
            expect(session.initParams.bind(session, {access_token: ''})).not.toThrow();
        });
    });

    describe('exit cabras', function() {
        var broadcast;
        var cabraId;
        beforeEach(function() {
            cabraId = 0;
            broadcast = new BroadcastSession();
        });

        var mockCabra = function(failLeave) {
            return {
                cabraId: '' + (++cabraId),
                events: {},
                once: function(name, callback) {
                    this.events[name] = callback;
                    return this;
                },
                leave: function() {
                    var fn = failLeave ?
                        cabraEvents.CabraSessionDidFailToLeaveEvent :
                        cabraEvents.CabraSessionDidLeaveEvent;
                    var callback = this.events[fn];
                    delete this.events[fn];
                    callback(this.cabraId);
                }
            };
        };

        it('exits with no cabras', function() {
            var success = null;
            runs(function() {
                broadcast._exitCabras().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });
            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
            });
        });

        it('rejects exit with thrown error', function() {
            spyOn(broadcast, '_allCabras').andCallFake(function() {
                throw 'nope';
            });

            var success = null;
            runs(function() {
                broadcast._exitCabras().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });
            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
            });
        });

        it('exits active cabra', function() {
            var cabra = mockCabra();
            broadcast.activeCabras[cabra.cabraId] = cabra;

            spyOn(cabra, 'leave').andCallThrough();

            var success = null;
            runs(function() {
                broadcast._exitCabras().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });
            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(cabra.leave).toHaveBeenCalled();
            });
        });

        it('exits pending cabra', function() {
            var cabra = mockCabra();
            broadcast.pendingCabras[cabra.cabraId] = cabra;

            spyOn(cabra, 'leave').andCallThrough();

            var success = null;
            runs(function() {
                broadcast._exitCabras().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });
            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(cabra.leave).toHaveBeenCalled();
            });
        });

        it('exits and removes all cabras', function() {
            var i, cabra, bucket;
            var cabras = [];

            for (i = 0; i < 5; i++) {
                cabra = mockCabra();
                spyOn(cabra, 'leave').andCallThrough();
                bucket = i % 2 === 0 ? 'activeCabras' : 'pendingCabras';
                broadcast[bucket][cabra.cabraId] = cabra;
                cabras.push(cabra);
            }

            var success = null;
            runs(function() {
                broadcast._exitCabras().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });
            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(true);
                expect(Object.keys(broadcast.activeCabras).length).toEqual(0);
                expect(Object.keys(broadcast.pendingCabras).length).toEqual(0);
                cabras.forEach(function(cabra) {
                    expect(cabra.leave).toHaveBeenCalled();
                });
            });
        });

        it('rejects failed cabra leave', function() {
            var cabra = mockCabra(true);
            broadcast.activeCabras[cabra.cabraId] = cabra;

            spyOn(cabra, 'leave').andCallThrough();

            var success = null;
            runs(function() {
                broadcast._exitCabras().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });
            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
                expect(cabra.leave).toHaveBeenCalled();
            });
        });

        it('does not pass when failing cabra leave', function() {
            var cabras = [mockCabra(), mockCabra(true)];
            spyOn(broadcast, '_allCabras').andReturn(cabras);

            var success = null;
            runs(function() {
                broadcast._exitCabras().then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });
            waitsFor(function() { return success !== null; });

            runs(function() {
                expect(success).toBe(false);
            });
        });
    });

    describe("broadcastSession", function () {
        var broadcast;
        var instruction;
        var attachDfd;
        var pubsub;
        beforeEach(function () {
            broadcast = new BroadcastSession();
            instruction = {
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                url: "https://localhost:8282/USE-MOCK",
                roster: {}
            };
            broadcast.init(instruction);
            pubsub = new Pubsub().init();
        });

        describe("attach process", function () {
            it('will choose core token for attach V2', function() {
                spyOn(broadcast, 'didAttachToBroadcast');
                spyOn(broadcast, 'didFailToAttachToBroadcast');

                broadcast._client = jasmine.createSpyObj('client', ['init', 'attach']);
                broadcast._client.init.andReturn(Promise.resolve());
                broadcast._client.attach.andReturn(Promise.resolve());

                broadcast.coreAccessToken = 'core';
                broadcast.accessToken = 'token';
                
                broadcast.attach();

                expect(broadcast._client.init).toHaveBeenCalledWith({
                    broadcastId: broadcast.broadcastId,
                    baseUrl: broadcast.url,
                    coreAccessToken: 'core'
                });
            });

            it('subscribes to pubsub events before signalr init' , function(){
                spyOn(broadcast._client, "init").andCallFake(function () {
                    expect($.on).toHaveBeenCalledWith("B40aDCA571D/open_object", jasmine.any(Function));
                    expect($.on).toHaveBeenCalledWith("B40aDCA571D/broadcast_end", jasmine.any(Function));
                    return $.Deferred();
                });
                spyOn($, "on");
                broadcast.attach();
                expect(broadcast._client.init).toHaveBeenCalled();
            });
            
            it("calls attach if init succeeds", function () {
                spyOn(broadcast._client, "init").andReturn($.Deferred().resolve({}));
                attachDfd = $.Deferred();
                spyOn(broadcast._client, "attach").andReturn(attachDfd);
                spyOn($, "on");
                
                broadcast.attach();
                //base assumptions
                expect(broadcast._client.init).toHaveBeenCalled();
                expect($.on).toHaveBeenCalledWith("B40aDCA571D/open_object", jasmine.any(Function));
                expect(broadcast._client.attach).toHaveBeenCalled();
            });

            it("enters open_objects that were received on attach", function () {
                //https://github.com/DyKnow/DyKnowMe/issues/5327
                spyOn(broadcast._client, "init").andReturn($.Deferred().resolve({}));
                attachDfd = $.Deferred();
                spyOn(broadcast._client, "attach").andReturn(attachDfd);
                spyOn(broadcast._client, "enterCabra").andReturn($.Deferred());
                spyOn(CabraSessionFactory, "getCabraSession").andCallFake(function(name, cabraId, rules, satelliteAPIClient ) {
                    var c = new BaseCabraSession();
                    c.init(name, cabraId, rules, satelliteAPIClient);
                    return c;
                });
                spyOn($, "on");
                
                broadcast.attach();
                attachDfd.resolve({
                    broadcast_objects: [{
                        object_id: "111111",
                        cabra_id: 1,
                        cabra_name: "love"
                    },
                   {
                    object_id: "222222",
                    cabra_id: 2,
                    cabra_name: "basketball"
                    }
                   ],
                    broadcast_id: "B40aDCA571D",
                    access_token: "111111111111",
                    supported_cabras: [
                        { 
                            cabra_id: 1,
                            cabra: {
                                name: "love"
                            },
                            cabra_rules: []
                        },
                        { 
                            cabra_id: 2,
                            cabra: {
                                name: "basketball"
                            },
                            cabra_rules: []
                        }
                    ]
                });
                expect(broadcast._client.enterCabra).toHaveBeenCalledWith("111111");
                expect(broadcast._client.enterCabra).toHaveBeenCalledWith("222222");
                //and that we only called it exactly 2 times
                expect(broadcast._client.enterCabra.calls.length).toEqual(2);
                expect(CabraSessionFactory.getCabraSession.calls[0].args.slice(0,2)).toEqual(["love", "111111"]);
                expect(CabraSessionFactory.getCabraSession.calls[1].args.slice(0,2)).toEqual(["basketball", "222222"]);
                //and that we only called it exactly 2 times
                expect(CabraSessionFactory.getCabraSession.calls.length).toEqual(2);

            });
            
            it("enters open_objects that were received before attach returned", function () {
                //https://github.com/DyKnow/DyKnowMe/issues/5327
                spyOn(broadcast._client, "init").andReturn($.Deferred().resolve({}));
                attachDfd = $.Deferred();
                spyOn(broadcast._client, "attach").andReturn(attachDfd);
                spyOn(broadcast._client, "enterCabra").andReturn($.Deferred());
                spyOn(CabraSessionFactory, "getCabraSession").andCallFake(function(name, cabraId, rules, satelliteAPIClient ) {
                    var c = new BaseCabraSession();
                    c.init(name, cabraId, rules, satelliteAPIClient);
                    return c;
                });
                spyOn($, "on");
                
                broadcast.attach();
                var openObjectCallback = $.on.calls.filter(function(c){return c.args[0] === "B40aDCA571D/open_object";})[0].args[1];//second arg
                openObjectCallback({event:"object"},{
                    cabra_id: "111111",
                    cabra_name: "love"
                });
                openObjectCallback({event:"object"}, {
                    cabra_id: "222222",
                    cabra_name: "basketball"
                });
                //attach hit the race condition returning no braodcast_objects!!
                attachDfd.resolve({
                    broadcast_objects: [],
                    broadcast_id: "B40aDCA571D",
                    access_token: "111111111111",
                    supported_cabras: [
                        { 
                            cabra_id: 1,
                            cabra: {
                                name: "love"
                            }
                        },
                        { 
                            cabra_id: 2,
                            cabra: {
                                name: "basketball"
                            }
                        }
                    ]
                });
                expect(broadcast._client.enterCabra).toHaveBeenCalledWith("111111");
                expect(broadcast._client.enterCabra).toHaveBeenCalledWith("222222");
                //and that we only called it exactly 2 times
                expect(broadcast._client.enterCabra.calls.length).toEqual(2);
                expect(CabraSessionFactory.getCabraSession.calls[0].args.slice(0,2)).toEqual(["love", "111111"]);
                expect(CabraSessionFactory.getCabraSession.calls[1].args.slice(0,2)).toEqual(["basketball", "222222"]);
                //and that we only called it exactly 2 times
                expect(CabraSessionFactory.getCabraSession.calls.length).toEqual(2);
            });
            
            it("does not enter open_objects if already open", function () {
                //https://github.com/DyKnow/DyKnowMe/issues/5327
                spyOn(broadcast._client, "init").andReturn($.Deferred().resolve({}));
                attachDfd = $.Deferred();
                spyOn(broadcast._client, "attach").andReturn(attachDfd);
                spyOn(broadcast._client, "enterCabra").andReturn($.Deferred());
                spyOn(CabraSessionFactory, "getCabraSession").andCallFake(function(name, cabraId, rules, satelliteAPIClient ) {
                    var c = new BaseCabraSession();
                    c.init(name, cabraId, rules, satelliteAPIClient);
                    return c;
                });
                spyOn($, "on");
                
                broadcast.attach();
                attachDfd.resolve({
                    broadcast_objects: [{
                        object_id: "111111",
                        cabra_id: 1,
                        cabra_name: "love"
                    },
                   {
                    object_id: "222222",
                    cabra_id: 2,
                    cabra_name: "basketball"
                    }
                   ],
                    broadcast_id: "B40aDCA571D",
                    access_token: "111111111111",
                    supported_cabras: [
                        { 
                            cabra_id: 1,
                            cabra: {
                                name: "love"
                            }
                        },
                        { 
                            cabra_id: 2,
                            cabra: {
                                name: "basketball"
                            }
                        }
                    ]
                });
                
                var openObjectCallback = $.on.calls.filter(function(c){return c.args[0] === "B40aDCA571D/open_object";})[0].args[1];//second arg
                openObjectCallback({event:"object"},{
                    cabra_id: "111111",
                    cabra_name: "love"
                });
                openObjectCallback({event:"object"}, {
                    cabra_id: "222222",
                    cabra_name: "basketball"
                });
                
                expect(broadcast._client.enterCabra).toHaveBeenCalledWith("111111");
                expect(broadcast._client.enterCabra).toHaveBeenCalledWith("222222");
                //and that we only called it exactly 2 times
                expect(broadcast._client.enterCabra.calls.length).toEqual(2);
                expect(CabraSessionFactory.getCabraSession.calls[0].args.slice(0,2)).toEqual(["love", "111111"]);
                expect(CabraSessionFactory.getCabraSession.calls[1].args.slice(0,2)).toEqual(["basketball", "222222"]);
                //and that we only called it exactly 2 times
                expect(CabraSessionFactory.getCabraSession.calls.length).toEqual(2);
            });
            
            it("does not double open received open_objects before attach returned", function () {
                //https://github.com/DyKnow/DyKnowMe/issues/5327
                spyOn(broadcast._client, "init").andReturn($.Deferred().resolve({}));
                attachDfd = $.Deferred();
                spyOn(broadcast._client, "attach").andReturn(attachDfd);
                spyOn(broadcast._client, "enterCabra").andReturn($.Deferred());
                spyOn(CabraSessionFactory, "getCabraSession").andCallFake(function(name, cabraId, rules, satelliteAPIClient ) {
                    var c = new BaseCabraSession();
                    c.init(name, cabraId, rules, satelliteAPIClient);
                    return c;
                });
                spyOn($, "on");
                
                broadcast.attach();
                var openObjectCallback = $.on.calls.filter(function(c){return c.args[0] === "B40aDCA571D/open_object";})[0].args[1];//second arg
                openObjectCallback({event:"object"},{
                    cabra_id: "111111",
                    cabra_name: "love"
                });
                openObjectCallback({event:"object"}, {
                    cabra_id: "222222",
                    cabra_name: "basketball"
                });
                attachDfd.resolve({
                    broadcast_objects: [{
                        object_id: "111111",
                        cabra_id: 1,
                        cabra_name: "love"
                    },
                   {
                    object_id: "222222",
                    cabra_id: 2,
                    cabra_name: "basketball"
                    }
                   ],
                    broadcast_id: "B40aDCA571D",
                    access_token: "111111111111",
                    supported_cabras: [
                        { 
                            cabra_id: 1,
                            cabra: {
                                name: "love"
                            }
                        },
                        { 
                            cabra_id: 2,
                            cabra: {
                                name: "basketball"
                            }
                        }
                    ]
                });
                                
                expect(broadcast._client.enterCabra).toHaveBeenCalledWith("111111");
                expect(broadcast._client.enterCabra).toHaveBeenCalledWith("222222");
                //and that we only called it exactly 2 times
                expect(broadcast._client.enterCabra.calls.length).toEqual(2);
                expect(CabraSessionFactory.getCabraSession.calls[0].args.slice(0,2)).toEqual(["love", "111111"]);
                expect(CabraSessionFactory.getCabraSession.calls[1].args.slice(0,2)).toEqual(["basketball", "222222"]);
                //and that we only called it exactly 2 times
                expect(CabraSessionFactory.getCabraSession.calls.length).toEqual(2);
            });
            
            it ("does not double open received open_objects after attach returned", function () {
                //https://github.com/DyKnow/DyKnowMe/issues/5327
                spyOn(broadcast._client, "init").andReturn($.Deferred().resolve({}));
                attachDfd = $.Deferred();
                spyOn(broadcast._client, "attach").andReturn(attachDfd);
                spyOn(broadcast._client, "enterCabra").andReturn($.Deferred());
                spyOn(CabraSessionFactory, "getCabraSession").andCallFake(function(name, cabraId, rules, satelliteAPIClient ) {
                    var c = new BaseCabraSession();
                    c.init(name, cabraId, rules, satelliteAPIClient);
                    return c;
                });
                spyOn($, "on");
                //attach calls and returns
                broadcast.attach();
                attachDfd.resolve({
                    broadcast_objects: [{
                        object_id: "111111",
                        cabra_id: 1,
                        cabra_name: "love"
                    },
                   {
                    object_id: "222222",
                    cabra_id: 2,
                    cabra_name: "basketball"
                    }
                   ],
                    broadcast_id: "B40aDCA571D",
                    access_token: "111111111111",
                    supported_cabras: [
                        { 
                            cabra_id: 1,
                            cabra: {
                                name: "love"
                            }
                        },
                        { 
                            cabra_id: 2,
                            cabra: {
                                name: "basketball"
                            }
                        }
                    ]
                });
                //and yet realtime pushes these out anyway
                var openObjectCallback = $.on.calls.filter(function(c){return c.args[0] === "B40aDCA571D/open_object";})[0].args[1];//second arg
                openObjectCallback({event:"object"},{
                    cabra_id: "111111",
                    cabra_name: "love"
                });
                openObjectCallback({event:"object"}, {
                    cabra_id: "222222",
                    cabra_name: "basketball"
                });
                openObjectCallback({event:"object"},{
                    cabra_id: "111111",
                    cabra_name: "love"
                });
                openObjectCallback({event:"object"}, {
                    cabra_id: "222222",
                    cabra_name: "basketball"
                });
                                
                expect(broadcast._client.enterCabra).toHaveBeenCalledWith("111111");
                expect(broadcast._client.enterCabra).toHaveBeenCalledWith("222222");
                //and that we only called it exactly 2 times
                expect(broadcast._client.enterCabra.calls.length).toEqual(2);
                expect(CabraSessionFactory.getCabraSession.calls[0].args.slice(0,2)).toEqual(["love", "111111"]);
                expect(CabraSessionFactory.getCabraSession.calls[1].args.slice(0,2)).toEqual(["basketball", "222222"]);
                //and that we only called it exactly 2 times
                expect(CabraSessionFactory.getCabraSession.calls.length).toEqual(2);
            });
        });
        
        describe("pending cabra transition", function () {
            var enterCabraDfd;
            beforeEach(function () {
                spyOn(broadcast._client, "init").andReturn($.Deferred().resolve({}));
                attachDfd = $.Deferred();
                spyOn(broadcast._client, "attach").andReturn(attachDfd);
                enterCabraDfd = $.Deferred();
                spyOn(broadcast._client, "enterCabra").andReturn(enterCabraDfd);
                spyOn(CabraSessionFactory, "getCabraSession").andCallFake(function(name, cabraId, rules, satelliteAPIClient ) {
                    var c = new BaseCabraSession();
                    c.init(name, cabraId, rules, satelliteAPIClient);
                    return c;
                });
                spyOn($, "on");
            });
            
            it("does not add cabras to the pendingcabra list if already pending (attach)", function (){
                //not entirely sure about this requirement
                broadcast.pendingCabras["111111"] = new BaseCabraSession();
                broadcast.attach();
                attachDfd.resolve({
                    broadcast_objects: [{
                        object_id: "111111",
                        cabra_id: 1,
                        cabra_name: "love"
                    }
                   ],
                    broadcast_id: "B40aDCA571D",
                    access_token: "111111111111",
                    supported_cabras: [
                        { 
                            cabra_id: 1,
                            cabra: {
                                name: "love"
                            }
                        }
                    ]
                });
                expect(Object.keys(broadcast.pendingCabras).length).toEqual(1);
            });
            
            it("does not add cabras to the pendingcabra list if already pending (realtime)", function (){
                broadcast.pendingCabras["111111"] = new BaseCabraSession();
                broadcast.attach();
                attachDfd.resolve({
                    broadcast_objects: [],
                    broadcast_id: "B40aDCA571D",
                    access_token: "111111111111",
                    supported_cabras: [
                        { 
                            cabra_id: 1,
                            cabra: {
                                name: "love"
                            }
                        }
                    ]
                });
                var openObjectCallback = $.on.calls.filter(function(c){return c.args[0] === "B40aDCA571D/open_object";})[0].args[1];//second arg
                openObjectCallback({event:"object"},{
                    cabra_id: "111111",
                    cabra_name: "love"
                });

                expect(Object.keys(broadcast.pendingCabras).length).toEqual(1);
            });
            
            it("does not add cabras to the pendingcabra list if already open (attach)", function () {
                 //not entirely sure about this requirement
                broadcast.activeCabras["111111"] = new BaseCabraSession();
                broadcast.attach();
                attachDfd.resolve({
                    broadcast_objects: [{
                        object_id: "111111",
                        cabra_id: 1,
                        cabra_name: "love"
                    }
                   ],
                    broadcast_id: "B40aDCA571D",
                    access_token: "111111111111",
                    supported_cabras: [
                        { 
                            cabra_id: 1,
                            cabra: {
                                name: "love"
                            }
                        }
                    ]
                });
                expect(Object.keys(broadcast.pendingCabras).length).toEqual(0);             
            });

            it("does not add cabras to the pendingcabra list if already open (realtime)", function () {
                broadcast.activeCabras["111111"] = new BaseCabraSession();
                broadcast.attach();
                attachDfd.resolve({
                    broadcast_objects: [],
                    broadcast_id: "B40aDCA571D",
                    access_token: "111111111111",
                    supported_cabras: [
                        { 
                            cabra_id: 1,
                            cabra: {
                                name: "love"
                            }
                        }
                    ]
                });
                var openObjectCallback = $.on.calls.filter(function(c){return c.args[0] === "B40aDCA571D/open_object";})[0].args[1];//second arg
                openObjectCallback({event:"object"},{
                    cabra_id: "111111",
                    cabra_name: "love"
                });

                expect(Object.keys(broadcast.pendingCabras).length).toEqual(0);             
            });
            
            it("moves from pending to active on enter success", function () {
                //add through attach to ensure it's wired up
                broadcast.attach();
                attachDfd.resolve({
                    broadcast_objects: [{
                        object_id: "111111",
                        cabra_id: 1,
                        cabra_name: "love"
                    }
                   ],
                    broadcast_id: "B40aDCA571D",
                    access_token: "111111111111",
                    supported_cabras: [
                        { 
                            cabra_id: 1,
                            cabra: {
                                name: "love"
                            }
                        }
                    ]
                });              
                broadcast.pendingCabras["111111"].emitEvent(cabraEvents.CabraSessionDidEnterEvent, ["111111"]);
                expect(Object.keys(broadcast.pendingCabras).length).toEqual(0);
                expect(Object.keys(broadcast.activeCabras).length).toEqual(1);
            });
          
        });
        
        describe("cabra fails to enter handles teardown", function(){
            beforeEach(function () {
                spyOn(broadcast._client, "init").andReturn($.Deferred().resolve({}));
                attachDfd = $.Deferred();
                spyOn(broadcast._client, "attach").andReturn(attachDfd);
                spyOn(broadcast._client, "enterCabra").andReturn($.Deferred().reject());
                spyOn(CabraSessionFactory, "getCabraSession").andCallFake(function(name, cabraId, rules, satelliteAPIClient ) {
                    var c = new BaseCabraSession();
                    c.init(name, cabraId, rules, satelliteAPIClient);
                    return c;
                });
                spyOn($, "on");
            });
            
            it("broadcast.didReceiveError was called on enter cabra failure", function() {
                var err = null;
                var timed_out = false;
                var wasCalled = false;
                var timeout = 0;
                runs(function(){
                    broadcast.attach();
                    spyOn(broadcast,"_cabraDidFailToEnter").andCallFake(function(cabra){
                        delete broadcast.pendingCabras[cabra.cabra_id];
                        wasCalled = true;
                    });
                    attachDfd.resolve({
                        broadcast_objects: [{
                            object_id: "111111",
                            cabra_id: 1,
                            cabra_name: "love"
                        }
                       ],
                        broadcast_id: "B40aDCA571D",
                        access_token: "111111111111",
                        supported_cabras: [
                            { 
                                cabra_id: 1,
                                cabra: {
                                    name: "love"
                                }
                            }
                        ]
                    });  
                 });
                 waitsFor(function(){
                    if(timeout++ == 500)
                    {
                        timed_out = true;
                        wasCalled = true;
                    }
                    return wasCalled;
                 });
                runs(function(){
                 expect(timed_out).toEqual(false);           
                 expect(Object.keys(broadcast.pendingCabras).length).toEqual(0);
                 expect(Object.keys(broadcast.activeCabras).length).toEqual(0);
                 expect(wasCalled).toEqual(true);   
                });  
            });
                 
        });
        
        describe("unsupported by client but supported by server cabra tests", function () {
            beforeEach(function () {
                spyOn(broadcast._client, "init").andReturn($.Deferred().resolve({}));
                attachDfd = $.Deferred();
                spyOn(broadcast._client, "attach").andReturn(attachDfd);
            });
            
            it("does not fail attach if cabraSessionFactory returns null", function () {
                spyOn(broadcast._client, "enterCabra").andReturn($.Deferred());
                spyOn(CabraSessionFactory, "getCabraSession").andCallFake(function(name, cabraId, rules, satelliteAPIClient ) {
                    return null;
                });
                spyOn($, "on");
                spyOn(broadcast, "didFailToAttachToBroadcast");
                
                broadcast.attach();
                attachDfd.resolve({
                    broadcast_objects: [{
                        object_id: "111111",
                        cabra_id: 1,
                        cabra_name: "love"
                    }
                   ],
                    broadcast_id: "B40aDCA571D",
                    access_token: "111111111111",
                    supported_cabras: [
                        { 
                            cabra_id: 1,
                            cabra: {
                                name: "love"
                            },
                            cabra_rules: []
                        },
                        { 
                            cabra_id: 2,
                            cabra: {
                                name: "basketball"
                            },
                            cabra_rules: []
                        }
                    ]
                });
                expect(broadcast._client.enterCabra.calls.length).toEqual(0);
                expect(CabraSessionFactory.getCabraSession.calls.length).toEqual(1);
                expect(broadcast.didFailToAttachToBroadcast).not.toHaveBeenCalled();
            });
            
            it("does fail attach if cabraSessionFactory throws", function () {
                spyOn(broadcast._client, "enterCabra").andReturn($.Deferred());
                spyOn(CabraSessionFactory, "getCabraSession").andCallFake(function(name, cabraId, rules, satelliteAPIClient ) {
                    throw new Error("omg dedz");
                });
                spyOn($, "on");
                spyOn(broadcast, "didFailToAttachToBroadcast");
                
                broadcast.attach();
                attachDfd.resolve({
                    broadcast_objects: [{
                        object_id: "111111",
                        cabra_id: 1,
                        cabra_name: "love"
                    }
                   ],
                    broadcast_id: "B40aDCA571D",
                    access_token: "111111111111",
                    supported_cabras: [
                        { 
                            cabra_id: 1,
                            cabra: {
                                name: "love"
                            },
                            cabra_rules: []
                        },
                        { 
                            cabra_id: 2,
                            cabra: {
                                name: "basketball"
                            },
                            cabra_rules: []
                        }
                    ]
                });
                expect(broadcast._client.enterCabra.calls.length).toEqual(0);
                expect(CabraSessionFactory.getCabraSession.calls.length).toEqual(1);
                expect(broadcast.didFailToAttachToBroadcast).toHaveBeenCalled();
            });
        });
        
        describe("exceptions during open_object command", function () {
            beforeEach(function () {
                spyOn(broadcast._client, "init").andReturn($.Deferred().resolve({}));
                attachDfd = $.Deferred();
                spyOn(broadcast._client, "attach").andReturn(attachDfd);
            });
            
            it("open_object throws fatal error", function () {
                var cabraUUID = guid(),
                    error = new Error("yolo"),
                    open = new MockBroadcastFrameCommand(broadcast.broadcastId, "open_object", cabraUUID, "dyknow.me/screen_shot", cabraUUID);
                
                spyOn($, "trigger").andCallThrough();
                spyOn(broadcast, "_createCabraFromBroadcastObject").andCallFake(function(broadcastObject) {
                    throw error;
                });
                
                broadcast.attach();
                attachDfd.resolve({
                    broadcast_objects: [],
                    broadcast_id: broadcast.broadcastId,
                    access_token: "111111111111",
                    supported_cabras: [
                        { 
                            cabra_id: 15,
                            cabra: {
                                name: "dyknow.me/screen_shot"
                            }
                        }
                    ]
                });
                
                //TODO: make this less awful.  this is the way it goes for now because this is what the satellite.js is eventing
                $.trigger(broadcast.broadcastId + "/" + SETTINGS.EVENTS.OPEN_OBJECT, open);
                expect($.trigger).toHaveBeenCalledWith(SETTINGS.EVENTS.FATAL_ERROR,error);
            });
        });
    });
});
