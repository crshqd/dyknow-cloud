define([], function () {
    function mockStateFrame(payload) {
        this.cabra_id = null;
        this.frameId = null;
        this.conversationId = null;
        this.objectId = null;
        this.payloadId = null;
        this.payload = payload;
        this.to = null;
        this.from = null;
        this.fromOption = null;
        this.accountId = null;
    }
    return mockStateFrame;
});