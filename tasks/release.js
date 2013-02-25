/*
Copyright (c) 2013, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/


var path = require('path'),
    fs = require('fs'),
    timethat = require('timethat'),
    cpr = require('cpr').cpr,
    crypto = require('crypto'),
    cssproc = require('cssproc'),
    rimraf = require('rimraf');

module.exports = function(grunt) {

    var VERSION = grunt.option('release-version'),
        BUILD = grunt.option('release-build'),
        start = path.join(process.cwd(), 'release', VERSION),
        startTime, head, sha;

    if (VERSION && (!BUILD || BUILD === 'git' || BUILD === 'sha')) {
        head = grunt.file.read('.git/HEAD').replace('ref: ', '').trim();
        if (head) {
            sha = grunt.file.read(path.join('.git/', head)).trim();
            if (sha) {
                sha = sha.substr(0, 7);
                grunt.log.warn('No --release-build passed, using sha: ' + sha);
                BUILD = sha;
                grunt.config.set('build', BUILD);
            }
        }
    }

    grunt.config.set('version', VERSION);

    grunt.registerTask('release', 'Create a YUI Release', [
        'release-boot',
        'release-prebuild',
        'release-prep',
        'release-clean',
        'build',
        'dist',
        'cdn',
        'cdn-ssl',
        'release-validate',
        'release-zip',
        'release-finish'
    ]);
    grunt.registerTask('release-prebuild', 'Build and test before prep', [
        'build',
        'test'
    ]);

    grunt.registerTask('release-validate', 'Validate the release before zipping', function() {
        grunt.log.ok('Validating the Release files.');
        /*
            Only looks for common, predictable files to make sure the other
            tasks did their job.
        */
        var dirs = [
            'cdn',
            'cdn/build',
            'cdn/build/yui',
            'cdn/build/yui/yui-min.js',
            'cdn-ssl',
            'cdn-ssl/build',
            'cdn-ssl/build/yui',
            'cdn-ssl/build/yui/yui-min.js',
            'npm',
            'npm/package.json',
            'npm/index.js',
            'npm/debug.js',
            'dist',
            'dist/api',
            'dist/api/index.html',
            'dist/api/data.json',
            'dist/docs',
            'dist/docs/index.html',
            'dist/releasenotes',
            'dist/releasenotes/HISTORY.yui.md',
            'dist/tests',
            'dist/tests/yui/tests/unit/index.html',
            'dist/README.md',
            'dist/LICENSE.md'
        ],
        fail = function(file) {
            grunt.fail.fatal('Failed to find: ' + file);
        },
        base = path.join('release', VERSION);

        if (!grunt.file.exists(base)) {
            fail(base);
        } else {
            grunt.log.writeln('Found!: '.green + base.cyan);
        }

        dirs.forEach(function(d) {
            var file = path.join(base, d);
            if (!grunt.file.exists(file)) {
                fail(file);
            } else {
                grunt.log.writeln('Found!: '.green + file.cyan);
            }
        });

    });
    
    grunt.registerTask('release-zip', 'Zipping up', [
        'compress:dist',
        'compress:cdn',
        'compress:cdn-ssl',
        'release-md5'
    ]);

    grunt.registerTask('release-md5', 'Create MD5 for release file', function() {
        var done = this.async(),
            file = path.join(start, 'archives', 'yui_' + VERSION + '.zip'),
            md5File = file + '.MD5',
            shasum = crypto.createHash('md5'),
            s = fs.ReadStream(file),
            finish = function() {
                grunt.log.ok('Checking for release zips');
                var files = [
                    'akamai_' + VERSION + '.zip',
                    'akamaissl_' + VERSION + '.zip',
                    'yui_' + VERSION + '.zip',
                    'yui_' + VERSION + '.zip.MD5'
                ];
                files.forEach(function(f) {
                    var file = path.join('release', VERSION, 'archives', f);
                    if (grunt.file.exists(file)) {
                        grunt.log.writeln('Found!: '.green + ' ' + file.cyan);
                    } else {
                        grunt.fail.fatal('Failed to find: ' + file.red);
                    }
                });
                done();
            };

        s.on('data', function(d) { shasum.update(d); });
        s.on('end', function() {
            var md5 = shasum.digest('hex');
            grunt.log.ok('Setting MD5 for release to: ' + md5);
            grunt.log.writeln('');
            grunt.file.write(md5File, md5 + '\n');
            finish();
        });
    });

    grunt.registerTask('release-boot', 'Booting the YUI Release', function() {
        startTime = new Date();

        if (!VERSION) {
            grunt.fail.fatal('No version found, use --release-version=x.y.z');
        }

        if (!BUILD) {
            grunt.fail.fatal('No build number found, use --release-build=x.y.z');
        }

        grunt.log.ok('Preparing YUI release for ' + VERSION + ', building and testing raw');
    });

    grunt.registerTask('release-prep', 'Booting the YUI Release', function() {
        grunt.cli.options.release = true;
        grunt.log.ok('All tests passed, starting offical build now');
    });

    grunt.registerTask('release-finish', 'Complete the YUI Release', function() {
        var endTime = new Date();
        grunt.log.ok('YUI Release for ' + VERSION + ' completed in ' + timethat.calc(startTime, endTime));
    });

    grunt.registerTask('release-clean', 'Cleaning release', function() {
        grunt.log.write('Deleting release directory');
        var done = this.async();
        rimraf(start, function() {
            grunt.log.writeln('...OK');
            done();
        });
    });

    grunt.registerTask('cdn', 'Preparing CDN Release', function() {
        grunt.log.writeln('Preparing CDN Release');
        var done = this.async(),
            source = path.join(start, 'dist', 'build'),
            dest = path.join(start, 'cdn', 'build');

        grunt.log.write('Copying build');

        cpr(source, dest, function() {
            grunt.log.writeln('...OK');
            grunt.log.writeln('Processing CSS files');
            var count = 0,
                complete = 0;

            grunt.file.recurse(dest, function(file) {
                if (path.extname(file) === '.css') {
                    count++;
                    var str = grunt.file.read(file);
                    cssproc.parse({
                        root: path.join(dest, '../'),
                        path: file,
                        base: 'http:/'+'/yui.yahooapis.com/' + VERSION + '/'
                    }, str, function(err, data) {
                        if (str !== data) {
                            complete++;
                            grunt.file.write(file, data);
                        }
                    });
                }
            });
            
            grunt.log.writeln('Processed ' + complete + ' of ' + count + ' css files.');
            done();
        });

    });

    grunt.registerTask('cdn-ssl', 'Preparing CDN SSL Release', function() {
        grunt.log.writeln('Preparing CDN SSL Release');
        var done = this.async(),
            source = path.join(start, 'dist', 'build'),
            dest = path.join(start, 'cdn-ssl', 'build');

        grunt.log.write('Copying build');

        cpr(source, dest, function() {
            grunt.log.writeln('...OK');
            grunt.log.writeln('Processing CSS files');
            var count = 0,
                complete = 0;

            grunt.file.recurse(dest, function(file) {
                if (path.extname(file) === '.css') {
                    count++;
                    var str = grunt.file.read(file);
                    cssproc.parse({
                        root: path.join(dest, '../'),
                        path: file,
                        base: 'https:/'+'/yui-s.yahooapis.com/' + VERSION + '/'
                    }, str, function(err, data) {
                        if (str !== data) {
                            complete++;
                            grunt.file.write(file, data);
                        }
                    });
                }
            });
            
            grunt.log.writeln('Processed ' + complete + ' of ' + count + ' css files.');
            done();
        });
    });

};
