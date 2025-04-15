define(['amd/lib/uuid','./cabra'], function (guid, cabra) {
    function mockBroadcastObject(cabraName, cabraUUID) {
        this.cabra_name = cabraName;
        this.cabra_id = cabra.cabraIDFromCabraName(cabraName);
        this.object_id = (!!cabraUUID) ? cabraUUID : guid();
        this.status = "open";
    }
    return mockBroadcastObject;
});