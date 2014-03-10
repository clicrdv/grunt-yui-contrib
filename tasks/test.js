/*
Copyright (c) 2013, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/


var exec = require('child_process').spawn,
    path = require('path'),
    fs = require('fs');

module.exports = function(grunt) {
    var CLI = false, COVERAGE = false, BASE_PORT = 5000;

    grunt.registerTask('test-coverage', 'Testing with coverage', function() {
        COVERAGE = true;
        grunt.task.run('test');
    });

    grunt.registerTask('test-cli', 'Testing via the CLI', function() {
        CLI = true;
        grunt.task.run('test');
    });

    grunt.registerMultiTask('test', 'Testing', function() {
        var done = this.async(),
            yogi = path.join(process.cwd(), 'node_modules/yogi/bin/yogi.js'),
            module_regex = new RegExp('src\/([^\/#]+?)\/'),
            module = '',
            self = this,
            count_tests = this.data.length,
            effective_count = 0,
            args = [
                yogi,
                'test'
            ],
            child;

        // echo-based load-tests require a longer timeout.
        args.push('-t');
        args.push(120);

        if (CLI) {
            CLI = false;
            args.push('--cli');
        }

        if (COVERAGE) {
            COVERAGE = false;
            args.push('--coverage');
        }

        if ('TEST_RESULTS_DIR' in process.env) {
            grunt.log.ok('Saving JUnitXML file to: ' + process.env.TEST_RESULTS_DIR);
            args.push('--junit');
            args.push('--outfile');
	    var writable = false, index = 0;
	    while (!writable) {
		var results_file = index + '-junit.xml';
		fs.existsSync(path.join(process.env.TEST_RESULTS_DIR, results_file), function(exists) {
		    if (!exists) {
			args.push(path.join(process.env.TEST_RESULTS_DIR, results_file));
			writable = true;
		    }
		});            
		index++;
	    }
        }

        if (this.target === 'modules') {
            if (this.data.length > 0) {
               args.push('--port');
            }
            grunt.util.recurse(this.data, function (m) {
                if (module_regex.test(m)) {
                    module = module_regex.exec(m)[1];
                }

                if (module && !fs.existsSync('src/'+module+'/tests/unit')) {
                   return;
                }

                grunt.log.ok('Testing ' + self.target +': '+ module);
                effective_count++;

                // To be sure not to concurrence with another test
                var port = BASE_PORT+effective_count*100;
                args.push(''+port);
                child = exec(process.execPath, args, {
                    cwd: path.join(process.cwd(), 'src/'+module),
                    stdio: 'inherit',
                    env: process.env
                });
                args.pop();

                child.on('exit', function(code) {
                    if (code) {
                        grunt.fail.fatal('yogi test exited with code: ' + code);
                    }
                    count_tests--;
                    if (effective_count === (self.data.length-count_tests)) {
                       done();
                    }
                });
            });
        }

        if (effective_count === 0) {
           done();
        }
    });
};


