require.config({
    paths: {
        amd: "/js/amd",
        viewmodels: "/ui/js/viewmodels",
        cabras: "/ui/js/cabras"
    }
});

define(['cabras/attention'], function(attention){
    attention.init();
});