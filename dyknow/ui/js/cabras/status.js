define(['amd/lib/knockout', 'viewmodels/statusViewModel', 'amd/mixins/statusMixin','amd/sandbox'], function(ko, StatusViewModel, Status, Sandbox){
    return {
        init:function(){
            var sandbox = new Sandbox().init();
            var vm = new StatusViewModel();
            sandbox.subscribe('statusRequest', function(data){
                //clear our current status out of the local storage'
                vm.conversation_id = data.conversation_id;
                chrome.storage.local.remove("status", function(){
                    if(chrome.runtime.lastError){
                        console.error(chrome.runtime.lastError);
                    }
                    vm.selectedStatus(new Status());
                    vm.statusOptions(data.payload.statuses.map(function(status){
                        return new Status(status);
                    }));
                    vm.loaded(true);
                });
            });

            chrome.windows.getCurrent(function(window){
                sandbox.publish("dyknowWindowReady", window.id);
            });

            vm.isWindow = true;
            ko.applyBindings(vm, document.getElementById('status'));
        }
    };
});