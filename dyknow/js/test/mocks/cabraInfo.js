define(['amd/lib/uuid'], function (guid) {
    function mockCabraInfo(cabraId, cabraUUID, state, user) {
        this.cabra_id = (!!cabraId) ? cabraId : 1234;
        this.broadcast_cabra_id = (!!cabraUUID) ? cabraUUID : guid();
        this.status = "open";
        this.state = (!!state) ? state : false;
        this.user = {};
    }
    return mockCabraInfo;
});