define([
    'amd/logger/logger', 'amd/cabra/helper/thumbnail', 'amd/cabra/helper/thumbnailDesktopSingleton'
], function(
       Logger, Thumbnail, thumbnailDesktop
) {
    describe('Thumbnail', function () {
        var thumbnail = null;
        
        beforeEach(function () {
            Logger.debug = $.noop;
            Logger.info = $.noop;
            Logger.warn = $.noop;
            Logger.error = $.noop;
            //reset initial everytime
            thumbnailDesktop._activeThumbnailCount = 0;
            spyOn(thumbnailDesktop, "_showUI");
            thumbnail = new Thumbnail();    
            thumbnail.init();
        });
        
        it("requests desktop access on thumbnail request with default", function() {
            thumbnail.withScale(3);
            expect(thumbnailDesktop._showUI).toHaveBeenCalled();
        });
        
        it("requests desktop access on thumbnail request with true request_thumbnail", function() {
            thumbnail.withScale(3, true);
            expect(thumbnailDesktop._showUI).toHaveBeenCalled();
        });
        
        it("requests desktop access on thumbnail request with false request_thumbnail", function() {
            thumbnail.withScale(3, false);
            expect(thumbnailDesktop._showUI).not.toHaveBeenCalled();
        });
        
    });
});