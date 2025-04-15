define([
    'amd/helpers',
    'amd/sandbox',
    'amd/windowKeepAlive',
    'js/test/mocks/chrome',
    'js/test/mocks/logger',
    'underscore'
], function(
    WindowHelper,
    Sandbox,
    WindowKeepAlive,
    chrome,
    logger,
    _
) {
    describe('WindowKeepAlive', function () {
        var getResolvedPromise = function (obj) {
            var promise = new Promise(function (resolve, reject) {
                if (obj !== undefined) {
                    resolve(obj);
                } else {
                    resolve();
                }
            });
            return promise;
        };
        var getRejectedPromise = function (obj) {
            var promise = new Promise(function (resolve, reject) {
                if (obj !== undefined) {
                    reject(obj);
                } else {
                    reject();
                }
            });
            return promise;
        };
        var vm = {
            open: function () {},
            keepOpen: function () {}
        };

        beforeEach(function() {
            chrome.useMock();
            logger.useMock();
        });

        afterEach(function() {
            chrome.resetMock();
        });

        it("open rejects if windowId already exists", function () {
            spyOn(vm, 'open').andReturn(getResolvedPromise());

            var done = false,
                wasRejected = false,
                keepAlive = new WindowKeepAlive(vm.open);

            waitsFor(function(){
                return done;
            });
            keepAlive.windowId = 123;
            keepAlive.open().then(function (windowId) {
                done = true;
            }, function () {
                done = true;
                wasRejected = true;
            });
            runs(function(){
                expect(vm.open).not.toHaveBeenCalled();
                expect(wasRejected).toBe(true);
            });
        });

        it("open calls provided open promise if window id is undefined", function () {
            spyOn(vm, 'open').andReturn(getResolvedPromise({ id: 123 }));

            var done = false,
                resolvedWindow = false,
                keepAlive = new WindowKeepAlive(vm.open);

            waitsFor(function(){
                return done;
            });
            keepAlive.open().then(function (window) {
                done = true;
                resolvedWindow = window;
            }, function () {
                done = true;
            });
            runs(function(){
                expect(vm.open).toHaveBeenCalled();
                expect(resolvedWindow).toEqual({ id: 123 });
            });
        });

        it("open calls provided open promise if window id is undefined, fails to open", function () {
            spyOn(vm, 'open').andReturn(getRejectedPromise());

            var done = false,
                wasRejected = false,
                keepAlive = new WindowKeepAlive(vm.open);

            waitsFor(function(){
                return done;
            });
            keepAlive.open().then(function (window) {
                done = true;
            }, function () {
                wasRejected = true;
                done = true;
            });
            runs(function(){
                expect(vm.open).toHaveBeenCalled();
                expect(wasRejected).toEqual(true);
            });
        });

        it("close resolves if window is undefined", function () {
            var done = false,
                resolvedWindowId = false,
                keepAlive = new WindowKeepAlive();
            keepAlive.windowId = false;
            spyOn(keepAlive.windowHelper, 'closeWindow').andReturn(getResolvedPromise());
            spyOn(keepAlive, 'isOpened').andReturn(getRejectedPromise());

            waitsFor(function(){
                return done;
            });
            var promise = keepAlive.close().then(function (windowId) {
                resolvedWindowId = windowId;
                done = true;
            }, function () {
                done = true;
            });

            runs(function(){
                expect(keepAlive.isOpened).not.toHaveBeenCalled();
                expect(keepAlive.windowHelper.closeWindow).not.toHaveBeenCalled();
                expect(resolvedWindowId).toEqual(false);
                expect(keepAlive.windowId).toBe(false);
            });
        });

        it("close resolves if window was open and close succeeds", function () {
            var done = false,
                resolvedWindowId = false,
                keepAlive = new WindowKeepAlive();
            keepAlive.windowId = 123;
            spyOn(keepAlive.windowHelper, 'closeWindow').andReturn(getResolvedPromise());
            spyOn(keepAlive, 'isOpened').andReturn(getResolvedPromise());

            waitsFor(function(){
                return done;
            });
            var promise = keepAlive.close().then(function (windowId) {
                resolvedWindowId = windowId;
                done = true;
            }, function () {
                done = true;
            });

            runs(function(){
                expect(keepAlive.isOpened).toHaveBeenCalled();
                expect(keepAlive.windowHelper.closeWindow).toHaveBeenCalledWith(123);
                expect(resolvedWindowId).toEqual(123);
                expect(keepAlive.windowId).toBe(false);
            });
        });

        it("close rejects if window was open and close failed", function () {
            var done = false,
                resolvedWindowId = false,
                keepAlive = new WindowKeepAlive();
            keepAlive.windowId = 123;
            spyOn(keepAlive.windowHelper, 'closeWindow').andReturn(getRejectedPromise());
            spyOn(keepAlive, 'isOpened').andReturn(getResolvedPromise());

            waitsFor(function(){
                return done;
            });
            var promise = keepAlive.close().then(function (windowId) {
                resolvedWindowId = windowId;
                done = true;
            }, function () {
                done = true;
            });

            runs(function(){
                expect(keepAlive.isOpened).toHaveBeenCalled();
                expect(keepAlive.windowHelper.closeWindow).toHaveBeenCalledWith(123);
                expect(keepAlive.windowId).toBe(123);
            });
        });

         it("close resolves if window was closed", function () {
            var done = false,
                resolvedWindowId = false,
                keepAlive = new WindowKeepAlive();
            keepAlive.windowId = 123;
            spyOn(keepAlive.windowHelper, 'closeWindow').andReturn(getResolvedPromise());
            spyOn(keepAlive, 'isOpened').andReturn(getRejectedPromise());

            waitsFor(function(){
                return done;
            });
            var promise = keepAlive.close().then(function (windowId) {
                resolvedWindowId = windowId;
                done = true;
            }, function () {
                done = true;
            });

            runs(function(){
                expect(keepAlive.isOpened).toHaveBeenCalled();
                expect(keepAlive.windowHelper.closeWindow).not.toHaveBeenCalled();
                expect(resolvedWindowId).toEqual(123);
                expect(keepAlive.windowId).toBe(false);
            });
        });

        it("isOpened rejects if windowId is undefined", function () {
              var done = false,
                  wasRejected = false,
                  keepAlive = new WindowKeepAlive();
            spyOn(keepAlive.windowHelper, 'isWindowOpen').andReturn(getResolvedPromise());

            waitsFor(function(){
                return done;
            });
            keepAlive.isOpened().then(function () {
                done = true;
            }, function () {
                done = true;
                wasRejected = true;
            });
            runs(function(){
                expect(keepAlive.windowHelper.isWindowOpen).not.toHaveBeenCalled();
                expect(wasRejected).toBe(true);
            });
        });

        it("isOpened resolves if windowHelper determines window is open", function () {
              var done = false,
                  wasResolved = false,
                  keepAlive = new WindowKeepAlive();
            spyOn(keepAlive.windowHelper, 'isWindowOpen').andReturn(getResolvedPromise());

            waitsFor(function(){
                return done;
            });
            keepAlive.windowId = 123;
            keepAlive.isOpened().then(function () {
                done = true;
                wasResolved = true;
            }, function () {
                done = true;
            });
            runs(function(){
                expect(keepAlive.windowHelper.isWindowOpen).toHaveBeenCalled();
                expect(wasResolved).toBe(true);
            });
        });

        it("isOpened rejects if windowHelper determines window is closed", function () {
              var done = false,
                  wasRejected = false,
                  keepAlive = new WindowKeepAlive();
            spyOn(keepAlive.windowHelper, 'isWindowOpen').andReturn(getRejectedPromise());

            waitsFor(function(){
                return done;
            });
            keepAlive.windowId = 123;
            keepAlive.isOpened().then(function () {
                done = true;
            }, function () {
                done = true;
                wasRejected = true;
            });
            runs(function(){
                expect(keepAlive.windowHelper.isWindowOpen).toHaveBeenCalled();
                expect(wasRejected).toBe(true);
            });
        });

        it("isFocused  rejects if windowId is undefined", function () {
              var done = false,
                  wasRejected = false,
                  keepAlive = new WindowKeepAlive();

            waitsFor(function(){
                return done;
            });
            keepAlive.isFocused ().then(function () {
                done = true;
            }, function () {
                done = true;
                wasRejected = true;
            });
            runs(function(){
                expect(wasRejected).toBe(true);
            });
        });

        it("isFocused resolves if windowHelper fails to get a window", function () {
              var done = false,
                  wasRejected = false,
                  keepAlive = new WindowKeepAlive();
            spyOn(keepAlive.windowHelper, 'getWindow').andReturn(getRejectedPromise());

            waitsFor(function(){
                return done;
            });
            keepAlive.windowId = 123;
            keepAlive.isFocused().then(function () {
                done = true;
            }, function () {
                done = true;
                wasRejected = true;
            });
            runs(function(){
                expect(keepAlive.windowHelper.getWindow).toHaveBeenCalled();
                expect(wasRejected).toBe(true);
            });
        });

        it("isFocused resolves if windowHelper returns window that is focused", function () {
              var done = false,
                  wasResolved = false,
                  keepAlive = new WindowKeepAlive();
            spyOn(keepAlive.windowHelper, 'getWindow').andReturn(getResolvedPromise({ focused: true }));

            waitsFor(function(){
                return done;
            });
            keepAlive.windowId = 123;
            keepAlive.isFocused().then(function () {
                done = true;
                wasResolved = true;
            }, function () {
                done = true;
            });
            runs(function(){
                expect(keepAlive.windowHelper.getWindow).toHaveBeenCalled();
                expect(wasResolved).toBe(true);
            });
        });

        it("isFocused reject if windowHelper returns window that is not focused", function () {
              var done = false,
                  wasRejected = false,
                  keepAlive = new WindowKeepAlive();
            spyOn(keepAlive.windowHelper, 'getWindow').andReturn(getResolvedPromise({ focused: false }));

            waitsFor(function(){
                return done;
            });
            keepAlive.windowId = 123;
            keepAlive.isFocused().then(function () {
                done = true;
            }, function () {
                done = true;
                wasRejected = true;
            });
            runs(function(){
                expect(keepAlive.windowHelper.getWindow).toHaveBeenCalled();
                expect(wasRejected).toBe(true);
            });
        });

        it("processWindowRemovedEvent resets windowId if removed window is the watched window", function () {
            var keepAlive = new WindowKeepAlive();
            keepAlive.windowId = 123;
            keepAlive._processWindowRemovedEvent(123);

            expect(keepAlive.windowId).toEqual(false);
        });

        it("processWindowRemovedEvent does nothing if removed window is not the watched window", function () {
            var keepAlive = new WindowKeepAlive();
            keepAlive.windowId = 123;
            keepAlive._processWindowRemovedEvent(456);

            expect(keepAlive.windowId).toEqual(123);
        });

        it("processWindowRemovedEvent does nothing if removed window is not the watched window", function () {
            var keepAlive = new WindowKeepAlive();
            keepAlive.windowId = 123;
            keepAlive._processWindowRemovedEvent(-1);

            expect(keepAlive.windowId).toEqual(123);
        });

        it("shouldKeepAlive calls provided shouldBeOpen promise and resolves", function () {
            spyOn(vm, 'keepOpen').andReturn(getResolvedPromise());

            var done = false,
                wasResolved = false,
                keepAlive = new WindowKeepAlive(false, vm.keepOpen);

            waitsFor(function(){
                return done;
            });
            keepAlive.shouldKeepAlive().then(function () {
                done = true;
                wasResolved = true;
            }, function () {
                done = true;
            });
            runs(function(){
                expect(vm.keepOpen).toHaveBeenCalled();
                expect(wasResolved).toEqual(true);
            });
        });

        it("shouldKeepAlive calls provided shouldBeOpen promise and is rejected", function () {
            spyOn(vm, 'keepOpen').andReturn(getRejectedPromise());

            var done = false,
                wasRejected = false,
                keepAlive = new WindowKeepAlive(false, vm.keepOpen);

            waitsFor(function(){
                return done;
            });
            keepAlive.shouldKeepAlive().then(function () {
                done = true;
            }, function () {
                done = true;
                wasRejected = true;
            });
            runs(function(){
                expect(vm.keepOpen).toHaveBeenCalled();
                expect(wasRejected).toEqual(true);
            });
        });
    });

    describe('subscriptions', function() {
        var keepAlive;
        beforeEach(function() {
            chrome.useMock();
            logger.useMock();
            keepAlive = new WindowKeepAlive();
        });

        afterEach(function() {
            chrome.resetMock();
        });

        it('can subscribe to chrome events', function() {
            keepAlive.subscribe();
            expect(chrome.windows.onRemoved.addListener).toHaveBeenCalled();
            expect(chrome.windows.onRemoved.addListener.calls.length).toEqual(1);
        });

        it('will not subscribe if already subscribed', function() {
            keepAlive._subscribed = true;
            keepAlive.subscribe();
            expect(chrome.windows.onRemoved.addListener).not.toHaveBeenCalled();
        });

        it('will not re-subscribe to chrome events', function() {
            keepAlive.subscribe();
            keepAlive.subscribe();
            expect(chrome.windows.onRemoved.addListener).toHaveBeenCalled();
            expect(chrome.windows.onRemoved.addListener.calls.length).toEqual(1);
        });

        it('can unsubscribe to chrome events', function() {
            keepAlive.subscribe();
            keepAlive.unsubscribe();
            expect(chrome.windows.onRemoved.removeListener).toHaveBeenCalled();
            expect(chrome.windows.onRemoved.removeListener.calls.length).toEqual(1);
        });

        it('will not unsubscribe if not subscribed', function() {
            keepAlive._subscribed = false;
            keepAlive.unsubscribe();
            expect(chrome.windows.onRemoved.removeListener).not.toHaveBeenCalled();
        });

        it('will only unsubscribe once', function() {
            keepAlive.subscribe();
            keepAlive.unsubscribe();
            keepAlive.unsubscribe();
            expect(chrome.windows.onRemoved.removeListener).toHaveBeenCalled();
            expect(chrome.windows.onRemoved.removeListener.calls.length).toEqual(1);
        });
    });

    describe('WindowKeepAlive helpers', function() {
        var request, sandbox, windowHelper;
        var lastWindow = null, windowId = 0;

        // Helper used to mock opening a window.
        var opener = function(failOpen, callback) {
            windowId = windowId + 1;
            this.opened = null;
            var mockWindow = failOpen ? undefined : {
                id: windowId
            };
            lastWindow = mockWindow;
            if (failOpen) {
                chrome.runtime.lastError = {error: 'fail'};
            }
            callback(mockWindow);
            this.opened = !failOpen;
            delete chrome.runtime.lastError;
        };

        // Helper to fire window ready.
        var windowReady = function() {
            sandbox._processEvents({dyknowWindowReady: windowId});
        };

        // Convenience function to return a closure that returns a value.
        var identity = function(value) {
            return function() { return value; };
        };

        beforeEach(function() {
            chrome.useMock();
            logger.useMock();
            request = {hello: 'world'};
            sandbox = new Sandbox().init();
            windowHelper = WindowKeepAlive.windowHelper;
            spyOn(sandbox, 'subscribe').andCallThrough();
            spyOn(sandbox, 'unsubscribe').andCallThrough();
            spyOn(sandbox, 'publish');
            spyOn(_, 'delay');
        });

        afterEach(function() {
            chrome.resetMock();
            lastWindow = null;
            sandbox._reset();
        });

        it('can pass open promise', function() {
            var args = [false];
            var context = {};
            var success = null;
            var response = null;
            WindowKeepAlive.openPromise('test', request, opener, context, args)
            .then(
                function(resolved) { response = resolved; success = true; },
                function(rejected) { response = rejected; success = false; }
            );
            windowReady();
            waitsFor(function() { return success !== null; });
            runs(function() {
                expect(success).toBe(true);
                expect(context.opened).toBe(true);
                expect(response).toBe(lastWindow);
                expect(_.delay).toHaveBeenCalled();
                expect(sandbox.publish).toHaveBeenCalledWith(
                    'testRequest', request);
                expect(sandbox.subscribe).toHaveBeenCalledWith(
                    'dyknowWindowReady', jasmine.any(Function));
                expect(sandbox.unsubscribe).toHaveBeenCalledWith(
                    'dyknowWindowReady', jasmine.any(Function));
            });
        });

        it('can fail open promise', function() {
            var args = [true];
            var context = {};
            var success = null;
            WindowKeepAlive.openPromise('test', request, opener, context, args)
            .then(
                function() { success = true; },
                function() { success = false; }
            );
            waitsFor(function() { return success !== null; });
            runs(function() {
                expect(success).toBe(false);
                expect(context.opened).toBe(false);
                expect(_.delay).not.toHaveBeenCalled();
                expect(sandbox.publish).not.toHaveBeenCalled();
                expect(sandbox.subscribe).not.toHaveBeenCalled();
            });
        });

        it('can catch open error', function() {
            var throwError = jasmine.createSpy().andCallFake(function() {
                throw 'whoops';
            });
            var success = null;
            WindowKeepAlive.openPromise('test', request, throwError)
            .then(
                function() { success = true; },
                function() { success = false; }
            );
            waitsFor(function() { return success !== null; });
            runs(function() {
                expect(success).toBe(false);
                expect(_.delay).not.toHaveBeenCalled();
                expect(sandbox.publish).not.toHaveBeenCalled();
                expect(sandbox.subscribe).not.toHaveBeenCalled();
            });
        });

        it('can timeout open', function() {
            _.delay.andCallFake(function(callback, delay) {
                setTimeout(function() { callback(); }, 1);
            });
            var args = [false];
            var context = {};
            var success = null;
            var response = null;
            WindowKeepAlive.openPromise('test', request, opener, context, args)
            .then(
                function(resolved) { response = resolved; success = true; },
                function(rejected) { response = rejected; success = false; }
            );
            waitsFor(function() { return success !== null; });
            runs(function() {
                expect(success).toBe(false);
                expect(context.opened).toBe(true);
                expect(response).toBe('test window was not ready fast enough');
                expect(_.delay).toHaveBeenCalled();
                expect(sandbox.publish).not.toHaveBeenCalled();
                expect(sandbox.subscribe).toHaveBeenCalledWith(
                    'dyknowWindowReady', jasmine.any(Function));
                expect(sandbox.unsubscribe).toHaveBeenCalledWith(
                    'dyknowWindowReady', jasmine.any(Function));
            });
        });

        it('uses open promise for open popup', function() {
            spyOn(WindowKeepAlive, 'openPromise').andReturn('done');
            expect(WindowKeepAlive.openPopupPromise(
                'test', request, 'foo/bar', 320, 240)).toBe('done');
            expect(WindowKeepAlive.openPromise).toHaveBeenCalledWith(
                'test', request, windowHelper.openWindow, windowHelper,
                jasmine.any(Array));
            expect(WindowKeepAlive.openPromise.calls[0].args[4])
                .toEqual(['foo/bar', 'popup', 240, 320, 0,
                jasmine.any(Number), true]);
        });

        it('should be open should resolve promise', function() {
            var success = null;
            WindowKeepAlive.shouldBeOpenPromise(identity(true)).then(
                function() { success = true; },
                function() { success = false; }
            );
            waitsFor(function() { return success !== null; });
            runs(function() {
                expect(success).toBe(true);
            });
        });

        it('should be open should reject promise', function() {
            var success = null;
            WindowKeepAlive.shouldBeOpenPromise(identity(false)).then(
                function() { success = true; },
                function() { success = false; }
            );
            waitsFor(function() { return success !== null; });
            runs(function() {
                expect(success).toBe(false);
            });
        });
    });
});
