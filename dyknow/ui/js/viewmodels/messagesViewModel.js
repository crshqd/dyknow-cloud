define([
    'amd/cabra/attentionSession.events', 'amd/lib/knockout', 'amd/sandbox'
], function(
    attentionEvents, ko, Sandbox
) {
    var MessagesViewModel = function(sandbox) {
        var sandbox = sandbox || new Sandbox().init();
        var self = this;

        this.messages = ko.observableArray([]);
        this.teacher = ko.observable('');
        
        this.ack = function (message) {
            sandbox.publish(attentionEvents.AttentionSessionAcknowledgeMessageEvent, { conversationId: message.conversationId});
        };

        this.formatMessages = ko.computed(function() {
           self.messages().forEach(function(message) {
               message.message = message.message.linkify({ target: "_blank" });
               message.message = message.message.replace(/\n/g, "<br/>");
           });
        });
    };

    return MessagesViewModel;
});
