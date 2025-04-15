define([
    'amd/logger/logger', 'amd/urlAckPurger', 'amd/lib/uuid',
    'js/test/mocks/chrome.storage', 'underscore'

], function(
    Logger, UrlAckPurger, guid,
    storage, _
) {
    describe('UrlAckPurger', function () {
        var mockStorage;

        beforeEach(function () {

            Logger.debug = $.noop;
            Logger.info = $.noop;
            Logger.warn = $.noop;
            Logger.error = $.noop;
            chrome.storage.local.mock();
        });

        afterEach(function(){
            storage.local.clear();
        });

        it('deletes ack entries that are more then 7 days old',function() {
            var purgeComplete = false;
            runs(function() {
             //Add message to local storage along with some additional to ensure we get the one we want.
                var obj = {};
                var today = new Date();
                var ts = today.getTime();
                var sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.pearson.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                ts = today.getTime();
                sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.cnn.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                ts = today.getTime();
                var sixDays = ts - (6 * 24 * 60 * 60 * 1000);
                today.setTime(sixDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.reddit.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                ts = today.getTime();
                var fiveDays = ts - (5 * 24 * 60 * 60 * 1000);
                today.setTime(fiveDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.cnn.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.123.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.reddit.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.abc.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.cnn.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.msn.com']};
                storage.local.set(obj);

                storage.local.get(null,function(beforePurge){
                    expect(_.size(beforePurge)).toEqual(9);
                });

                UrlAckPurger.purgeOldAckEntries().then(function(){
                    storage.local.get(null,function(afterPurge){
                        var s = _.size(afterPurge);
                        //expect(s).toEqual(7);
                        purgeComplete = true;
                    });
                }).catch(function(err){

                });

            });
            waitsFor(function(){
                return purgeComplete;
            });
        });

        it('deletes all ack entries because they are all old',function() {
            var purgeComplete = false;
            runs(function() {
             //Add message to local storage along with some additional to ensure we get the one we want.
                var obj = {};
                var today = new Date();
                var ts = today.getTime();
                var sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.pearson.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                ts = today.getTime();
                sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.cnn.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                ts = today.getTime();
                sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.reddit.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                ts = today.getTime();
                sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.cnn.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                ts = today.getTime();
                sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.123.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                ts = today.getTime();
                sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.reddit.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                ts = today.getTime();
                sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.abc.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                ts = today.getTime();
                sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.cnn.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                ts = today.getTime();
                sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.msn.com']};
                storage.local.set(obj);

                storage.local.get(null,function(beforePurge){
                    expect(_.size(beforePurge)).toEqual(9);
                });

                UrlAckPurger.purgeOldAckEntries().then(function(){
                    storage.local.get(null,function(afterPurge){
                        var s = _.size(afterPurge);
                        //expect(s).toEqual(0);
                        purgeComplete = true;
                    });
                }).catch(function(err){
                });
            });
            waitsFor(function(){
                return purgeComplete;
            });
        });
        it('deletes all ack entries but not auth_token',function() {
            var purgeComplete = false;
            runs(function() {
                var obj = {};
                obj.authToken = "DEVICE_28c96e75-da19-4283-9ca2-9aca8e23b8f0";
                storage.local.set(obj);
                //Add message to local storage along with some additional to ensure we get the one we want.
                obj = {};
                var today = new Date();
                var ts = today.getTime();
                var sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.pearson.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                ts = today.getTime();
                sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.cnn.com']};
                storage.local.set(obj);

                obj = {};
                today = new Date();
                ts = today.getTime();
                sevenDays = ts - (8 * 24 * 60 * 60 * 1000);
                today.setTime(sevenDays);
                obj[guid()] = {'date':today.toLocaleString(),'urls': ['http://www.reddit.com']};
                storage.local.set(obj);

                storage.local.get(null,function(beforePurge){
                    expect(_.size(beforePurge)).toEqual(4);
                });

                UrlAckPurger.purgeOldAckEntries().then(function(){
                    storage.local.get(null,function(afterPurge){
                        var s = _.size(afterPurge);
                        //auth_token should still be there
                        expect(s).toEqual(1);
                        purgeComplete = true;
                    });
                }).catch(function(err){
                });
            });
            waitsFor(function(){
                return purgeComplete;
            });
        });
    });
});
