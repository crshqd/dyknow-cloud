// Karma configuration
// Generated on Fri Jan 23 2015 14:14:03 GMT-0500 (EST)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine', 'requirejs'],


      // list of files / patterns to load in the browser
      files: [
          "js/lib/jquery-2.1.1.min.js",
          "js/lib/jquery.signalR-2.0.2.js",
          "js/amd/lib/linkify.amd.js",
          "js/amd/lib/linkify.min.js",
          "js/amd/lib/linkify-string.min.js",
          { pattern: "js/globals.js", included: false },
          { pattern: "js/amd/lib/*.js", included: false },
          { pattern: "js/amd/*.js", included: false },
          { pattern: "js/amd/**/*.js", included: false },
          { pattern: "js/test/**/*.tests.js", included: false },
          { pattern: "js/test/*.js", included: false },
          { pattern: "js/test/**/*.js", included: false },
          { pattern: "ui/js/**/*.js", included: false },
          'test-main.js'
      ],
      // list of files to exclude
      exclude: [
          "js/test/filesystem/**/*.tests.js",
          "js/test/**/logger.tests.js",
          "js/amd/desktop.js",
          "js/test/testAppBlock.js"
      ],


      // preprocess matching files before serving them to the browser
      // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
      preprocessors: {
          'js/amd/application.js': ['coverage'],
          'js/amd/broadcast/**/*.js': ['coverage'],
          'js/amd/cabra/**/*.js': ['coverage'],
          'js/amd/clients/**/*.js': ['coverage'],
          'js/amd/desktop.js': ['coverage'],
          'js/amd/filesystem.js': ['coverage'],
          'js/amd/helpers.js': ['coverage'],
          'js/amd/logger/**/*.js': ['coverage'],
          'js/amd/mixins/**/*.js': ['coverage'],
          'js/amd/qsr/**/*.js': ['coverage'],
          'js/amd/sandbox.js': ['coverage'],
          'js/amd/settings.js': ['coverage'],
          'js/amd/util/**/*.js': ['coverage'],
          'js/amd/windowKeepAlive.js': ['coverage'],
          'js/amd/windowKeepAliveManager.js': ['coverage'],
          'js/background.js': ['coverage'],
          'js/content/**/*.js': ['coverage'],
          'js/globals.js': ['coverage'],
          'ui/**/*.js': ['coverage']
      },
    coverageReporter: {
        type : 'html',
        dir : 'coverage/',
        subdir: '.'
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'coverage'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    browserNoActivityTimeout:60000,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
