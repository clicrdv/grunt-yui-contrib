/*
Copyright (c) 2013, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/


var exec = require('child_process').spawn,
    path = require('path');

module.exports = function(grunt) {

    grunt.registerMultiTask('yogi-build', 'Building YUI', function() {
        var done = this.async(),
            yogi = path.join(process.cwd(), 'node_modules/yogi/bin/yogi.js'),
            module_regex = new RegExp('src\/([^\/#]+?)\/'),
            modules = [],
            args = [
                yogi,
                'build',
                '--istanbul'
            ], walkArgs, child,
            buildCore = function() {
                grunt.log.ok('Building Loader Meta-Data');
                var child = exec(process.execPath, [
                    yogi,
                    'loader',
                    '--mix',
                    '--yes'
                ], {
                    cwd: path.join(process.cwd(), 'src'),
                    stdio: 'inherit',
                    env: process.env
                });

                child.on('exit', function(code) {
                    if (code) {
                        grunt.fail.fatal('yogi seed build exited with code: ' + code);
                    }
                    done();
                });
            };

        walkArgs = [].concat(args);
        walkArgs.push('-x');
        walkArgs.push('yui');
        walkArgs.push('-x');
        walkArgs.push('loader');
        walkArgs.push('-x');
        walkArgs.push('get');

        if (this.target === 'modules') {
           grunt.util.recurse(this.data, function (m) {
              if (module_regex.test(m)) {
                 walkArgs.push('-m');
                 walkArgs.push(module_regex.exec(m)[1]);
                 modules.push(module_regex.exec(m)[1]);
              }
           })
        }

        grunt.log.ok('Building ' + this.target + ': ' + modules);


        child = exec(process.execPath, walkArgs, {
            cwd: path.join(process.cwd(), 'src'),
            stdio: 'inherit',
            env: process.env
        });

        child.on('exit', function(code) {
            if (code) {
                grunt.fail.fatal('yogi build exited with code: ' + code);
            }
            //buildCore();
            done();
        });

    });

};

