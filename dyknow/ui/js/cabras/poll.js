define(['amd/lib/knockout', 'viewmodels/pollViewModel', 'amd/mixins/pollMixin','amd/sandbox'], function(ko, PollViewModel, Poll, Sandbox){
    return {
        init:function(){
            var sandbox = new Sandbox().init();
            var vm = new PollViewModel();
            vm.activePoll(new Poll());
            sandbox.subscribe('assessmentRequest', function(data){
                console.log(data);
                vm.activePoll(new Poll(data));
                vm.loaded(true);
            });

            chrome.windows.getCurrent(function(window){
                sandbox.publish("dyknowWindowReady", window.id);
            });

            ko.applyBindings(vm, document.getElementById('polls'));
        }
    };
});