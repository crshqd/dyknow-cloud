define(['amd/lib/knockout', 'viewmodels/attentionViewModel','amd/sandbox'], function(ko, AttentionViewModel, Sandbox){
    return {
        init:function(){
            var sandbox = new Sandbox().init();
            var vm = new AttentionViewModel();
            sandbox.subscribe('attentionRequest', function(data){
                vm.message(data.message.replace(/\n/g, "<br/>"));
                vm.details(data.details.replace(/\n/g, "<br/>"));
            });

            chrome.windows.getCurrent(function(window){
                sandbox.publish("dyknowWindowReady", window.id);
            });

            ko.applyBindings(vm, document.getElementById('attention'));
        }
    };
});