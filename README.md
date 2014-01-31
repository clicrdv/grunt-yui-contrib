Grunt YUI Contrib
=================

Various Grunt tasks to be used within a YUI project. 

** Note: Be careful, this version of grunt-yui-contrib isn't in the NPM repositories. You will need to target the GitHub tar package in your ```package.json``` if you wish to use it. (```"grunt-yui-contrib": "https://github.com/popox/grunt-yui-contrib/tarball/vX.Y.Z"``` for version X.Y.Z for example)
**

Configuration
----
For the builds:
```
"yogi-build": {
   modules: ['*']
},
```
will build all modules of your yui based project. You can also specify a list of modules.


For the tests:
```
test: {
   modules: ['*']
}
```
will test all modules of your project.

Usage
-----

```
>> 
>> Showing specific task commands
>> 

  build         Build the entire library locally with yogi
  build-test    Build and test the entire library
  test          Test the library with yogi
  test-cli      Test the library via CLI with yogi
  test-coverage Test the library with yogi --coverage
  travis        Perform a travis test (uses enviroment vars to determine tests)
  help          Show this stuffs

>> Options:

  --cache-build                 Cache the shifter build.

>> Env Vars:

GRUNT_SKIP_BUILD=1      Skip the `build` step (used if you need to `npm i` more than once.
GRUNT_SKIP_PREBUILD=1   Will skip release prebuild (don't build into ./build, only build into ./release)

```

Example usage
----

Coupled with the grunt watcher tasks, it's very nice to automatically build&test your modified modules with the following ```gruntfile.js```:
```
module.exports = function(grunt) {
   grunt.loadNpmTasks('grunt-yui-contrib');
   grunt.loadNpmTasks('grunt-contrib-watch');
   grunt.initConfig({
      watch: {
         scripts: {
            files: ['**/js/*.js', '!**/*loader*/**/*.*'],
            tasks: ['build', 'test'],
            options: {
               spawn: false
            }
         }
      },
      "yogi-build": {
         modules: ['*']
      },
      test: {
         modules: ['*']
      }
   });
   var changedFiles = Object.create(null);
   var onChange = grunt.util._.debounce(function() {
      var changed = Object.keys(changedFiles);
      grunt.config('yogi-build.modules', changed);
      grunt.config('test.modules', changed);
      changedFiles = Object.create(null);
   }, 200);
   grunt.event.on('watch', function(action, filepath) {
      changedFiles[filepath] = action;
      onChange();
   });
   grunt.registerTask('default', ['watch']);
};
```

Build Status
------------

[![Build Status](https://secure.travis-ci.org/clicrdv/grunt-yui-contrib.png?branch=master)](http://travis-ci.org/clicrdv/grunt-yui-contrib)
