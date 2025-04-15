define(['amd/lib/uuid'], function (guid) {
    function mockLockedAttentionFrame(cabraUUID, conversationID, payload) {
        this.cabra_id = cabraUUID;
        this.frame_id = 123;
        this.conversation_id = conversationID;
        this.object_id = guid();
        this.payload_id = '35b75155-44f9-4a83-aa7d-80d6fd371bcf';
        this.payload = payload;
        this.to = 'participants';
        this.from = 'broadcaster';
    }
    return mockLockedAttentionFrame;
});