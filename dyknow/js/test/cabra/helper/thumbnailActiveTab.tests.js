define([
    'amd/cabra/helper/thumbnailActiveTab','amd/cabra/helper/browserEvents', 'js/test/mocks/chrome',
    'js/test/mocks/logger', 'amd/logger/logger',
], function(
    ThumbnailActiveTab, browserEvents, chrome, 
    logger, Logger
) {
    describe('ThumbnailActiveTab', function() {
        var thumbnail, shouldResolve;

        beforeEach(function() {
            jasmine.Clock.useMock();
            chrome.useMock();
            chrome.runtime.lastError = null;//in case it's been reset
            logger.useMock();
            browserEvents._resetForTest();
            //spyOn(browserEvents, "register");//just so we dont accidentally do something
            thumbnail = new ThumbnailActiveTab();
            thumbnail.init();
            spyOn(thumbnail, 'getImageBlob').andCallFake(
                function(data, width, height, resolve, reject) {
                    if (shouldResolve) { resolve(); } else { reject(); }
                });
            //weird case where eventemitter isnt null checking and ive got stuff to do
            //browserEvents.on(browserEvents.TABCHANGE, $.noop);
            //browserEvents.on(browserEvents.FAILACTIVEWINDOW, $.noop);
        });

        afterEach(function() {
            thumbnail.stop();
            browserEvents._resetForTest();
            chrome.runtime.lastError = null;
            chrome.resetMock();
            jasmine.Clock.reset();
        });

        it('can resolve', function() {
            shouldResolve = true;
            chrome.tabs.captureVisibleTab.andCallFake(function(windowId, cfg, callback) {
                callback('fake-data');
            });
            chrome.windows.getLastFocused.andCallFake(function(params, callback) {
                callback({id:99, focused: true});
            });

            var success = null;
            runs(function() {
                thumbnail._getScreenshot(1, 2)
                .then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });
            waitsFor(function() { 
                return success !== null; 
            });
            runs(function() {
                expect(success).toBe(true);
                expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
                expect(thumbnail.getImageBlob).toHaveBeenCalledWith('fake-data', 1, 2, jasmine.any(Function), jasmine.any(Function));
                expect(Logger.error).not.toHaveBeenCalled();
            });
        });

        it('catches thrown errors', function() {
            shouldResolve = false;
            var err = {message: 'nope', stack: null};
            chrome.tabs.captureVisibleTab.andCallFake(function() { throw err; });
            chrome.windows.getLastFocused.andCallFake(function(params, callback) {
                callback({id:99, focused: true});
            });

            var success = null;
            runs(function() {
                thumbnail._getScreenshot(1, 2)
                .then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });
            waitsFor(function() { return success !== null; });
            runs(function() {
                expect(success).toBe(false);
                expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
                expect(thumbnail.getImageBlob).toHaveBeenCalledWith(false, 1, 2, jasmine.any(Function), jasmine.any(Function));
                expect(Logger.error).toHaveBeenCalledWith(err.message, err.stack);
            });
        });

        it('catches runtime errors', function() {
            shouldResolve = false;
            chrome.tabs.captureVisibleTab.andCallFake(function(windowId, cfg, callback) {
                chrome.runtime.lastError = {message: 'nope'};
                callback();
                delete chrome.runtime.lastError;
            });
            chrome.windows.getLastFocused.andCallFake(function(params, callback) {
                callback({id:99, focused: true});
            });

            var success = null;
            runs(function() {
                thumbnail._getScreenshot(1, 2)
                .then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });
            waitsFor(function() { 
                return success !== null; 
            });
            runs(function() {
                expect(success).toBe(false);
                expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
                expect(thumbnail.getImageBlob).toHaveBeenCalledWith(false, 1, 2, jasmine.any(Function), jasmine.any(Function));
                expect(Logger.error).toHaveBeenCalledWith('runtime error capturing image: {"message":"nope"}');
            });
        });

        it('passes a chromeprotected runtime errors', function() {
            shouldResolve = false;
            chrome.tabs.captureVisibleTab.andCallFake(function(windowId, cfg, callback) {
                //yeah tahts the message. typo and all
                chrome.runtime.lastError = {message: "The 'activeTab' permission is not in effect because this extension has not been in invoked."};
                callback();
                delete chrome.runtime.lastError;
            });
            chrome.windows.getLastFocused.andCallFake(function(params, callback) {
                callback({id:99, focused: true});
            });

            var success = null;
            runs(function() {
                thumbnail._getScreenshot(1, 2)
                .then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });
            waitsFor(function() { 
                return success !== null; 
            });
            runs(function() {
                expect(success).toBe(false);
                expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
                expect(thumbnail.getImageBlob).toHaveBeenCalledWith("chromeprotected", 1, 2, jasmine.any(Function), jasmine.any(Function));
                expect(Logger.error).toHaveBeenCalledWith('runtime error capturing image: chromeprotected');
            });
        });

        it('passes a chromeblocked runtime errors', function() {
            shouldResolve = false;
            chrome.tabs.captureVisibleTab.andCallFake(function(windowId, cfg, callback) {
                //yeah tahts the message. typo and all
                chrome.runtime.lastError = {message: "Taking screenshots has been disabled"};
                callback();
                delete chrome.runtime.lastError;
            });
            chrome.windows.getLastFocused.andCallFake(function(params, callback) {
                callback({id:99, focused: true});
            });

            var success = null;
            runs(function() {
                thumbnail._getScreenshot(1, 2)
                .then(
                    function() { success = true; },
                    function() { success = false; }
                );
            });
            waitsFor(function() { 
                return success !== null; 
            });
            runs(function() {
                expect(success).toBe(false);
                expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
                expect(thumbnail.getImageBlob).toHaveBeenCalledWith("chromeblocked", 1, 2, jasmine.any(Function), jasmine.any(Function));
                expect(Logger.error).toHaveBeenCalledWith('runtime error capturing image: chromeblocked');
            });
        });


        it("tracks past windows when there's an unlocked message", function (){
            chrome.webNavigation.onCommitted.addListener.mostRecentCall.args[0]({
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                windowId: 4,
                tabId: 100,
                frameId: 0,
                pendingUrl: "https://facebook.com",
                url: ""
            });
            chrome.webNavigation.onCompleted.addListener.mostRecentCall.args[0]({
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                windowId: 4,
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.onCreated.addListener.mostRecentCall.args[0]({
                tabId: 101,
                windowId: 5,
                url: "",
                pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            chrome.webNavigation.onCommitted.addListener.mostRecentCall.args[0]({
                tabId: 102,
                frameId: 0,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                tabId: 101,
                windowId: 5,
                url: "",
                pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            chrome.webNavigation.onCompleted.addListener.mostRecentCall.args[0]({
                tabId: 102,
                frameId: 0,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                tabId: 101,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            thumbnail._getScreenshot(1, 2);
            chrome.windows.getLastFocused.mostRecentCall.args[1]({
                id: 5,
                focused: true,
                tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"}]
            });
            expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(4, {}, jasmine.any(Function));
        });
        it("tracks past windows when there's a question", function (){
            chrome.webNavigation.onCommitted.addListener.mostRecentCall.args[0]({
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                windowId: 4,
                tabId: 100,
                frameId: 0,
                pendingUrl: "https://facebook.com",
                url: ""
            });
            chrome.webNavigation.onCompleted.addListener.mostRecentCall.args[0]({
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                windowId: 4,
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.onCreated.addListener.mostRecentCall.args[0]({
                tabId: 101,
                windowId: 5,
                url: "",
                pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html"
            });
            chrome.webNavigation.onCommitted.addListener.mostRecentCall.args[0]({
                tabId: 102,
                frameId: 0,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                tabId: 101,
                windowId: 5,
                url: "",
                pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html"
            });
            chrome.webNavigation.onCompleted.addListener.mostRecentCall.args[0]({
                tabId: 102,
                frameId: 0,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                tabId: 101,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html"
            });
            thumbnail._getScreenshot(1, 2);
            chrome.windows.getLastFocused.mostRecentCall.args[1]({
                id: 5,
                focused: true,
                tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/pollRequest.html"}]
            });
            expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(4, {}, jasmine.any(Function));
        });
        it("tracks past windows when there's a status request", function (){
            chrome.webNavigation.onCommitted.addListener.mostRecentCall.args[0]({
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                windowId: 4,
                tabId: 100,
                frameId: 0,
                pendingUrl: "https://facebook.com",
                url: ""
            });
            chrome.webNavigation.onCompleted.addListener.mostRecentCall.args[0]({
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                windowId: 4,
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.onCreated.addListener.mostRecentCall.args[0]({
                tabId: 101,
                windowId: 5,
                url: "",
                pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html"
            });
            chrome.webNavigation.onCommitted.addListener.mostRecentCall.args[0]({
                tabId: 102,
                frameId: 0,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                tabId: 101,
                windowId: 5,
                url: "",
                pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html"
            });
            chrome.webNavigation.onCompleted.addListener.mostRecentCall.args[0]({
                tabId: 102,
                frameId: 0,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                tabId: 101,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html"
            });
            thumbnail._getScreenshot(1, 2);
            chrome.windows.getLastFocused.mostRecentCall.args[1]({
                id: 5,
                focused: true,
                tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/statusRequest.html"}]
            });
            expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(4, {}, jasmine.any(Function));
        });
        
        //NOTE:  health check doesnt currently have an issue as it doesnt render as the
        //current window/last active window

        it("shows the locked message", function (){
            chrome.webNavigation.onCommitted.addListener.mostRecentCall.args[0]({
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                windowId: 4,
                tabId: 100,
                frameId: 0,
                pendingUrl: "https://facebook.com",
                url: ""
            });
            chrome.webNavigation.onCompleted.addListener.mostRecentCall.args[0]({
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                windowId: 4,
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.onCreated.addListener.mostRecentCall.args[0]({
                tabId: 101,
                windowId: 5,
                url: "",
                pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html"
            });
            chrome.webNavigation.onCommitted.addListener.mostRecentCall.args[0]({
                tabId: 102,
                frameId: 0,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                tabId: 101,
                windowId: 5,
                url: "",
                pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html"
            });
            chrome.webNavigation.onCompleted.addListener.mostRecentCall.args[0]({
                tabId: 102,
                frameId: 0,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                tabId: 101,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html"
            });
            thumbnail._getScreenshot(1, 2);
            chrome.windows.getLastFocused.mostRecentCall.args[1]({
                id: 5,
                focused: true,
                tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/attentionRequest.html"}]
            });
            expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(5, {}, jasmine.any(Function));
        });

        it("sends the out of browser response when the last thing prior to the message was out of browser", function () {
            //we go to facebook.com 
            //we change to out of browser (something else was on top)
            //we send a message
            //verify that we dont call our captureVisibleTab and resolve the 
            chrome.webNavigation.onCommitted.addListener.mostRecentCall.args[0]({
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                windowId: 4,
                tabId: 100,
                frameId: 0,
                pendingUrl: "https://facebook.com",
                url: ""
            });
            chrome.webNavigation.onCompleted.addListener.mostRecentCall.args[0]({
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                windowId: 4,
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            //now, we've gone out of browser
            jasmine.Clock.tick(1000);//you can tell bc on the periodic check, there's nothing enabled
            chrome.windows.getLastFocused.mostRecentCall.args[1]({
                id: 4,
                focused: false,//<--- see that? that means Out of Browser
                tabs: [ { url: "https://facebook.com"}]
            });
            //oh but look we launched a message it seems
            chrome.tabs.onCreated.addListener.mostRecentCall.args[0]({
                tabId: 101,
                windowId: 5,
                url: "",
                pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            chrome.webNavigation.onCommitted.addListener.mostRecentCall.args[0]({
                tabId: 102,
                frameId: 0,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                tabId: 101,
                windowId: 5,
                url: "",
                pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            chrome.webNavigation.onCompleted.addListener.mostRecentCall.args[0]({
                tabId: 102,
                frameId: 0,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                tabId: 101,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            var resolved = null, val;
            thumbnail._getScreenshot(1, 2).then(function (result){
                resolved = true;
                val = result;
            }, function (){
                resolved = false;
            });
            chrome.windows.getLastFocused.mostRecentCall.args[1]({
                id: 5,
                focused: true,
                tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"}]
            });
            
            waitsFor(function () {
                return resolved !== null;
            });
            runs(function (){
                expect(resolved).toEqual(false);
                //so we're not calling that api 
                expect(chrome.tabs.captureVisibleTab).not.toHaveBeenCalled();
            });
        });
        it("estimates the underlying window if the last good got closed when there's an unlocked message", function (){
            chrome.webNavigation.onCommitted.addListener.mostRecentCall.args[0]({
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                windowId: 4,
                tabId: 100,
                frameId: 0,
                pendingUrl: "https://facebook.com",
                url: ""
            });
            chrome.webNavigation.onCompleted.addListener.mostRecentCall.args[0]({
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                windowId: 4,
                tabId: 100,
                frameId: 0,
                url: "https://facebook.com"
            });
            chrome.tabs.onCreated.addListener.mostRecentCall.args[0]({
                tabId: 101,
                windowId: 5,
                url: "",
                pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            chrome.webNavigation.onCommitted.addListener.mostRecentCall.args[0]({
                tabId: 102,
                frameId: 0,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                tabId: 101,
                windowId: 5,
                url: "",
                pendingUrl: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            chrome.webNavigation.onCompleted.addListener.mostRecentCall.args[0]({
                tabId: 102,
                frameId: 0,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            chrome.tabs.get.mostRecentCall.args[1]({
                tabId: 101,
                windowId: 5,
                url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"
            });
            chrome.windows.onRemoved.addListener.mostRecentCall.args[0](4);
            chrome.windows.getLastFocused.mostRecentCall.args[1]({
                id: 5,
                focused: true,
                tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"}]
            });
            //it gets called again, filtering out the recent 
            chrome.windows.getLastFocused.mostRecentCall.args[1]({
                id: 6,
                focused: false,
                tabs: [ { url: "https://www.google.com", active: true, windowId: 6}]
            });
            thumbnail._getScreenshot(1, 2);
            chrome.windows.getLastFocused.mostRecentCall.args[1]({
                id: 5,
                focused: true,
                tabs: [ { url: "chrome-extension://kmpjlilnemjciohjckjadmgmicoldglf/ui/views/cabras/messagesRequest.html"}]
            });
            expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(6, {}, jasmine.any(Function));
        });
    });
});
