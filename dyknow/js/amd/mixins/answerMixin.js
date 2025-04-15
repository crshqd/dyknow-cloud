define(['../lib/knockout'], function(ko){
    var Answer = function(answer) {
        this.answer = answer.answer || "";
        this.custom_answer = answer.custom_answer || answer.answer;
    };
    return Answer;
});