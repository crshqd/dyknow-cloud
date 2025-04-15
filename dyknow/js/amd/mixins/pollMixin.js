define(['../lib/knockout', 'amd/mixins/answerMixin', 'amd/sandbox'], function(ko, Answer, Sandbox){
    var Poll = function(config) {
        var config = config || { payload: {}};
        var sandbox = new Sandbox().init();
        if(config.payload.answers){
            this.answers = Object.keys(config.payload.answers).map(function (key) {return {answer: key, custom_answer: config.payload.answers[key]};});
            this.answers = ko.observableArray(this.answers.map(function(answer){
                return new Answer(answer);
            }));
        } else {
            this.answers = ko.observableArray([]);
        }

        this.question = ko.observable(config.payload.question || "");
        this.for_credit = ko.observable(config.payload.for_credit || false);
        this.conversation_id =config.conversation_id || false;
        this.selectedAnswer = ko.observable(false);

    };

    return Poll;
});