require.config({
    paths: {
        amd: "/js/amd",
        viewmodels: "/ui/js/viewmodels",
        cabras: "/ui/js/cabras"
    }
});

define(['cabras/poll'], function(poll){
    poll.init();
});