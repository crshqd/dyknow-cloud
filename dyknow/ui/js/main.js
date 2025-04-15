require.config({
    paths: {
        amd: "/js/amd",
        viewmodels: "/ui/js/viewmodels",
        cabras: "/ui/js/cabras"
    }
});

define(['cabras/status'], function(status){
    status.init();
});