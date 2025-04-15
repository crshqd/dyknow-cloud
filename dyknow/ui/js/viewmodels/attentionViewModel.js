define(['amd/lib/knockout', 'amd/sandbox'], function(ko, Sandbox){
    var AttentionViewModel = function() {
        this.message = ko.observable('');
        this.details = ko.observable('');
    };

    return AttentionViewModel;
});