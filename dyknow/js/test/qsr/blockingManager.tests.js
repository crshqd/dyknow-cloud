define([
    'amd/qsr/blockingManager',
    'amd/qsr/state',
    'underscore'
], function(
    BlockingManager,
    State,
    _
) {
    describe('BlockingManager', function() {
        var blockingManager = null;
        var bundles;

        function mockBundles() {
            var bundleOsList = Array.prototype.slice.call(arguments);
            return bundleOsList.map(function(osList) {
                return {
                    applications: osList.map(function(os) {
                        return {
                            name: 'name',
                            identifier: 'identifier',
                            os: {
                                type: os
                            }
                        };
                    })
                };
            });
        }

        beforeEach(function() {
            blockingManager = BlockingManager.instance();
            bundles = mockBundles(
                ['web', 'windows', 'mac'],
                ['web', 'web', 'chrome'],
                ['web', 'web-fragment'],
                ['web-fragment']
            );
        });

        it('can fetch instance', function() {
            expect(blockingManager).toBeTruthy();
        });

        it('will reuse instance', function() {
            expect(BlockingManager.instance()).toBe(blockingManager);
        });

        it('can apply application rule', function() {
            spyOn(blockingManager.appBlock, 'applicationRule');

            var whitelist = ['thing 1'];
            var blacklist = ['thing 2'];
            blockingManager.applyApplicationRule(whitelist, blacklist);

            expect(blockingManager.appBlock.applicationRule).toHaveBeenCalledWith(
                blockingManager.coreApplicationWhiteList,
                blockingManager.customerApplicationWhiteList,
                whitelist,
                blacklist
            );
        });

        it('can apply url filtering', function() {
            spyOn(blockingManager.urlFilter, 'filter');

            var whitelist = ['thing 1'];
            var blacklist = ['thing 2'];
            blockingManager.applyUrlFiltering(whitelist, blacklist);

            expect(blockingManager.urlFilter.filter).toHaveBeenCalledWith(
                blockingManager.coreUrlWhiteList,
                blockingManager.customerUrlWhiteList,
                whitelist,
                blacklist
            );
        });

        it('can collapse bundles', function() {
            var apps = blockingManager.bundledApplications(bundles);
            expect(apps.length).toBe(9);
        });

        it('can get apps for OS', function() {
            var apps = blockingManager.applicationsForOsType(
                blockingManager.bundledApplications(bundles),
                'chrome'
            );
            expect(apps.length).toBe(1);
        });

        it('can get apps for other OSes', function() {
            var apps = blockingManager.applicationsForOsType(
                blockingManager.bundledApplications(bundles),
                'chrome',
                true
            );
            expect(apps.length).toBe(8);
        });

        it('can filter for chrome applications', function() {
            var apps = blockingManager.applicationsFromBundles(bundles);
            expect(apps.length).toBe(3);
        });

        it('can filter for websites', function() {
            var apps = blockingManager.websitesFromBundles(bundles);
            expect(apps.length).toBe(7);
        });
        
        it('apps return name/identifier correctly', function() {
            var apps = blockingManager.applicationsFromBundles(bundles);
            expect(apps[0]).toEqual({name: 'name', identifier: 'identifier'});
            expect(apps[1]).toEqual({name: 'name', identifier: 'identifier'});
            expect(apps[2]).toEqual({name: 'name', identifier: 'identifier'});
        });
        
        it('websites return identifier/ostype correctly', function() {
            var apps = blockingManager.websitesFromBundles(bundles);
            expect(apps[0]).toEqual({identifier: 'identifier', ostype: 'web'});
            expect(apps[1]).toEqual({identifier: 'identifier', ostype: 'web'});
            expect(apps[2]).toEqual({identifier: 'identifier', ostype: 'web'});
            expect(apps[3]).toEqual({identifier: 'identifier', ostype: 'web'});
            expect(apps[4]).toEqual({identifier: 'identifier', ostype: 'web-fragment'});
            expect(apps[5]).toEqual({identifier: 'identifier', ostype: 'web-fragment'});
            expect(apps[6]).toEqual({identifier: 'identifier', ostype: 'chrome'});
        });

        it('can apply whitelist application rules', function() {
            var apps = blockingManager.applicationsFromBundles(bundles);
            var state = {
                payload: {
                    type: 'whitelist',
                    bundles: bundles
                }
            };
            spyOn(blockingManager, 'applyApplicationRule');

            blockingManager.applyApplicationRulesFromState(state);
            expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith(apps, []);
        });

        it('can apply blacklist application rules', function() {
            var apps = blockingManager.applicationsFromBundles(bundles);
            var state = {
                payload: {
                    type: 'blacklist',
                    bundles: bundles
                }
            };
            spyOn(blockingManager, 'applyApplicationRule');

            blockingManager.applyApplicationRulesFromState(state);
            expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith([], apps);
        });

        it('can apply whitelist url filtering', function() {
            var apps = blockingManager.websitesFromBundles(bundles);
            var state = {
                payload: {
                    type: 'whitelist',
                    bundles: bundles
                }
            };
            spyOn(blockingManager, 'applyUrlFiltering');

            blockingManager.applyUrlFilteringFromState(state);
            expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith(apps, []);
        });

        it('can apply blacklist url filtering', function() {
            var apps = blockingManager.websitesFromBundles(bundles);
            var state = {
                payload: {
                    type: 'blacklist',
                    bundles: bundles
                }
            };
            spyOn(blockingManager, 'applyUrlFiltering');

            blockingManager.applyUrlFilteringFromState(state);
            expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith([], apps);
        });

        it('can apply whitelist state', function() {
            var apps = blockingManager.applicationsFromBundles(bundles);
            var sites = blockingManager.websitesFromBundles(bundles);
            var state = {
                payload: {
                    type: 'whitelist',
                    bundles: bundles
                }
            };
            spyOn(blockingManager, 'applyApplicationRule');
            spyOn(blockingManager, 'applyUrlFiltering');

            blockingManager.applyState(state);
            expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith(apps, []);
            expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith(sites, []);
        });

        it('can apply blacklist state', function() {
            var apps = blockingManager.applicationsFromBundles(bundles);
            var sites = blockingManager.websitesFromBundles(bundles);
            var state = {
                payload: {
                    type: 'blacklist',
                    bundles: bundles
                }
            };
            spyOn(blockingManager, 'applyApplicationRule');
            spyOn(blockingManager, 'applyUrlFiltering');

            blockingManager.applyState(state);
            expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith([], apps);
            expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith([], sites);
        });

        it('undefined state clears rules', function() {
            spyOn(blockingManager, 'applyApplicationRule');
            spyOn(blockingManager, 'applyUrlFiltering');

            blockingManager.applyState();
            expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith([], []);
            expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith([], []);
        });

        it('null state clears rules', function() {
            spyOn(blockingManager, 'applyApplicationRule');
            spyOn(blockingManager, 'applyUrlFiltering');

            blockingManager.applyState(null);
            expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith([], []);
            expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith([], []);
        });

        it('empty state clears rules', function() {
            spyOn(blockingManager, 'applyApplicationRule');
            spyOn(blockingManager, 'applyUrlFiltering');

            blockingManager.applyState({});
            expect(blockingManager.applyApplicationRule).toHaveBeenCalledWith([], []);
            expect(blockingManager.applyUrlFiltering).toHaveBeenCalledWith([], []);
        });

        it('can restore state', function() {
            spyOn(blockingManager, 'applyState');
            var stateObject = {test: 'testing'};
            var state = new State({blocking: stateObject});

            blockingManager.restoreState(state);
            expect(blockingManager.applyState).toHaveBeenCalledWith(stateObject);
        });
    });
});
