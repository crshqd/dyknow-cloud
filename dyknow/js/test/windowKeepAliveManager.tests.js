define(['amd/logger/logger', 'amd/windowKeepAliveManager', 'amd/windowKeepAlive'], function(Logger, WindowKeepAliveManager, WindowKeepAlive) {
    describe('WindowKeepAliveManager', function () {
        var getResolvedPromise = function (obj) {
            var promise = new Promise(function (resolve, reject) {
                if (obj !== undefined) {
                    resolve(obj);
                } else {
                    resolve();
                }
            });
            return promise;
        },
        getRejectedPromise = function (obj) {
            var promise = new Promise(function (resolve, reject) {
                if (obj !== undefined) {
                    reject(obj);
                } else {
                    reject();
                }
            });
            return promise;
        };
        
        beforeEach(function () {
            Logger.debug = $.noop;
            Logger.info = $.noop;
            Logger.warn = $.noop;
            Logger.error = $.noop;
            
            WindowKeepAliveManager.keepAlives = [];
        });
        
        it("addKeepAlive pushes keepAlive on and subscribes and opens if shouldKeepAlive is true", function () {
            var done = false,
                wasResolved = false,
                keepAlive = new WindowKeepAlive();
            spyOn(keepAlive, 'subscribe');
            spyOn(keepAlive, 'shouldKeepAlive').andReturn(getResolvedPromise());
            spyOn(keepAlive, 'open').andReturn(getResolvedPromise());

            waitsFor(function(){
                return done;
            });
            
            WindowKeepAliveManager.addKeepAlive(keepAlive).then(function() {
                done = true;
                wasResolved = true;
            }, function () {
                done = true;
            });
            runs(function(){
                expect(keepAlive.subscribe).toHaveBeenCalled();
                expect(keepAlive.shouldKeepAlive).toHaveBeenCalled();
                expect(keepAlive.open).toHaveBeenCalled();
                expect(wasResolved).toBe(true);
                expect(WindowKeepAliveManager.keepAlives.length).toBe(1);
            });
        });
        
        it("addKeepAlive pushes keepAlive on and subscribes and does not open if shouldKeepAlive is false", function () {
            var done = false,
                wasResolved = false,
                keepAlive = new WindowKeepAlive();
            spyOn(keepAlive, 'subscribe');
            spyOn(keepAlive, 'shouldKeepAlive').andReturn(getRejectedPromise());
            spyOn(keepAlive, 'open').andReturn(getResolvedPromise());
            
            waitsFor(function(){
                return done;
            });
            
            WindowKeepAliveManager.addKeepAlive(keepAlive).then(function() {
                done = true;
                wasResolved = true;
            }, function () {
                done = true;
            });
            runs(function(){
                expect(keepAlive.subscribe).toHaveBeenCalled();
                expect(keepAlive.shouldKeepAlive).toHaveBeenCalled();
                expect(keepAlive.open).not.toHaveBeenCalled();
                expect(wasResolved).toBe(true);
                expect(WindowKeepAliveManager.keepAlives.length).toBe(1);
            });
        });
        
        
        it("addKeepAlive pushes keepAlive on and subscribes rejects if open fails", function () {
            var done = false,
                wasRejected = false,
                keepAlive = new WindowKeepAlive();
            spyOn(keepAlive, 'subscribe');
            spyOn(keepAlive, 'shouldKeepAlive').andReturn(getResolvedPromise());
            spyOn(keepAlive, 'open').andReturn(getRejectedPromise());

            waitsFor(function(){
                return done;
            });
            
            WindowKeepAliveManager.addKeepAlive(keepAlive).then(function() {
                done = true;
            }, function () {
                done = true;
                wasRejected = true;
            });
            runs(function(){
                expect(keepAlive.subscribe).toHaveBeenCalled();
                expect(keepAlive.shouldKeepAlive).toHaveBeenCalled();
                expect(keepAlive.open).toHaveBeenCalled();
                expect(wasRejected).toBe(true);
                expect(WindowKeepAliveManager.keepAlives.length).toBe(1);
            });
        });
        
        it("removeKeepAlive is rejected if keepAlive is not found (no keepalives)", function() {
            var done = false,
                wasRejected = false,
                keepAlive = new WindowKeepAlive();
            spyOn(keepAlive, 'unsubscribe');
            spyOn(keepAlive, 'close').andReturn(getResolvedPromise());
            
            waitsFor(function(){
                return done;
            });
            
            WindowKeepAliveManager.removeKeepAlive(keepAlive).then(function() {
                done = true;
            }, function () {
                done = true;
                wasRejected = true;
            });
            
            runs(function(){
                expect(keepAlive.unsubscribe).not.toHaveBeenCalled();
                expect(keepAlive.close).not.toHaveBeenCalled();
                expect(wasRejected).toBe(true);
                expect(WindowKeepAliveManager.keepAlives.length).toBe(0);
            });
        });
        
        it("removeKeepAlive is rejected if keepAlive is not found", function() {
            var done = false,
                wasRejected = false,
                keepAlive1 = new WindowKeepAlive(),
                keepAlive2 = new WindowKeepAlive();
            spyOn(keepAlive1, 'shouldKeepAlive').andReturn(getResolvedPromise());
            spyOn(keepAlive1, 'open').andReturn(getResolvedPromise());
            spyOn(keepAlive2, 'unsubscribe');
            spyOn(keepAlive2, 'close').andReturn(getResolvedPromise());
            
            waitsFor(function(){
                return done;
            });
            
            WindowKeepAliveManager.keepAlives.push(keepAlive1);
            WindowKeepAliveManager.removeKeepAlive(keepAlive2).then(function() {
                done = true;
            }, function () {
                done = true;
                wasRejected = true;
            });
            
            runs(function(){
                expect(keepAlive2.unsubscribe).not.toHaveBeenCalled();
                expect(keepAlive2.close).not.toHaveBeenCalled();
                expect(wasRejected).toBe(true);
                expect(WindowKeepAliveManager.keepAlives.length).toBe(1);
            });
        });
        
        it("removeKeepAlive is resolved if keepAlive is found and resolves when close is successful ", function() {
            var done = false,
                wasResolved = false,
                keepAlive = new WindowKeepAlive();
            spyOn(keepAlive, 'unsubscribe');
            spyOn(keepAlive, 'close').andReturn(getResolvedPromise());
            
            waitsFor(function(){
                return done;
            });
            
            WindowKeepAliveManager.keepAlives.push(keepAlive);
            WindowKeepAliveManager.removeKeepAlive(keepAlive).then(function() {
                done = true;
                wasResolved = true;
            }, function () {
                done = true;
            });
            
            runs(function(){
                expect(keepAlive.unsubscribe).toHaveBeenCalled();
                expect(keepAlive.close).toHaveBeenCalled();
                expect(wasResolved).toBe(true);
                expect(WindowKeepAliveManager.keepAlives.length).toBe(0);
            });
        });
        
        it("removeKeepAlive is resolved if keepAlive is found and rejects when close is fails", function() {
            var done = false,
                wasRejected = false,
                keepAlive = new WindowKeepAlive();
            spyOn(keepAlive, 'unsubscribe');
            spyOn(keepAlive, 'close').andReturn(getRejectedPromise());
            
            waitsFor(function(){
                return done;
            });
            
            WindowKeepAliveManager.keepAlives.push(keepAlive);
            WindowKeepAliveManager.removeKeepAlive(keepAlive).then(function() {
                done = true;
            }, function () {
                done = true;
                wasRejected = true;
            });
            
            runs(function(){
                expect(keepAlive.unsubscribe).toHaveBeenCalled();
                expect(keepAlive.close).toHaveBeenCalled();
                expect(wasRejected).toBe(true);
                expect(WindowKeepAliveManager.keepAlives.length).toBe(0);
            });
        });
    });
});