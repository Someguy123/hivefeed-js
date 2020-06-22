// Returns UNIX time
function now() {
    return parseInt((new Date()).getTime() / 10e3);
}
global.now = now;

global.Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

global.median = function(values) {

    values.sort( function(a,b) {return a - b;} );

    var half = Math.floor(values.length/2);

    if(values.length % 2)
        return values[half];
    else
        return (values[half-1] + values[half]) / 2.0;
};
var orig_log = console.log;

// Node String Colors Support. (global version) (https://git.io/colors)
// Usage console.log(green("Hello world!")
const _c = require('util').inspect.colors;
Object.keys(_c).forEach(c =>global[c] = s =>`\x1b[${_c[c][0]}m${s}\x1b[${_c[c][1]}m`);

global.log = function () {
    var first_parameter = arguments[0];
    if(first_parameter == '' || first_parameter == null || first_parameter == undefined) {
        orig_log();
    }
    var other_parameters = Array.prototype.slice.call(arguments, 1);

    function formatConsoleDate (date) {return '['+date.toISOString()+'] ';}

    orig_log.apply(console, [formatConsoleDate(new Date()) + first_parameter].concat(other_parameters));
};
// Debug logging. Only to be shown during verbose
global.dbg_log = function () {
    if(!global.verbose) return;
    global.log.apply(null, ['[DEBUG]'].concat(Array.prototype.slice.call(arguments, 0)))
};
global.console.error = global.console.log;

// used for re-trying failed promises
global.delay = function delay(t) {
    return new Promise((r_resolve) => setTimeout(r_resolve, t) );
};

global.getDefault = function getDefault (obj, key, fallback=null) {
    if (key in obj) {
        return obj[key];
    }
    if (obj.indexOf(key) >= 0) {
        return obj[obj.indexOf(key)];
    }
    return fallback;
};

// class SubObj extends Object {

//     getDefault(key, fallback=null) {
//         if (key in this) {
//             return this[key];
//         }
//         if (this.indexOf(key) >= 0) {
//             return this[this.indexOf(key)];
//         }
//         return fallback;
//     }
// }

// global.Object = SubObj;

// Object.prototype.getDefault = function(key, fallback=null) {
//     if (key in this) {
//         return this[key];
//     }
//     if (this.indexOf(key) >= 0) {
//         return this[this.indexOf(key)];
//     }
//     return fallback;
// };

// global.get_config = function get_config(key, fallback=null) {
//     let config = require('../config.json');
//     if (key in config) {
//         return config[key];
//     }
//     if (config.has)
// }

global.retry = function retry(self, func, func_args, max_retries=4, retry_delay=3, fail_on=null, tries=0) {
    /**
     * Automatic retry wrapper function for functions which return promises.
     * 
     * Retries the function `func` up to `max_retries` times, spaced `retry_delay` seconds apart, every time a Promise rejection
     * error is detected (unless `fail_on` is configured with a fatal error detection function).
     * 
     * 
     * Handling "no retry" / "fail on" errors::
     *  
     *      By setting ``fail_on`` to a simple boolean function, you can intercept a Promise error returned by ``func``,
     *      and return either ``true`` to stop retrying and call reject() immediately - or ``false`` to ignore this
     *      error and continue retrying until ``max_retries`` is hit.
     * 
     *      In the below example, if a promise error is raised containing the phrase "username was: hello", then auto-retry
     *      will be stopped immediately, and the error which contained "username was: hello" will be raised via reject().
     * 
     *      >>> let fail_on = (e) => e.indexOf("username was: hello") >= 0;
     *      >>> this.retry(this, some_func, ["args", "for", "some_func"], fail_on=fail_on)
     *      >>>     .then((d) => console.log("success! got data:", d))
     *      >>>     .catch((e) => console.error("failed all retries! got error:", e))
     * 
     * Usage::
     * 
     *      >>> function _otherFunc(username) {
     *      >>>     return new Promise((resolve, reject) => {
     *      >>>         // when reject() is called, retry() will auto-retry _otherFunc up to max_retries times.
     *      >>>     });
     *      >>> }
     *      >>> function otherFunc(username) {
     *      >>>     // Retry _otherFunc with the arguments `username` for up to 6 reject()'s
     *      >>>     // with just 0.1 seconds between each retry.
     *      >>>     return retry(this, _otherFunc, [username], max_retries=6, retry_delay=0.1);
     *      >>> }
     * 
     *      // Retrying normal standalone functions
     *      >>> this.retry(this, otherFunc, [example, args, passed, to, some_func])
     *      >>>     .then((d) => console.log("success! got data:", d))
     *      >>>     .catch((e) => console.error("failed all retries! got error:", e))
     * 
     *      // Retrying class methods
     *      >>> this.retry(this, this.some_func, [example, args, passed, to, some_func])
     *      >>>     .then((d) => console.log("success! got data:", d))
     *      >>>     .catch((e) => console.error("failed all retries! got error:", e))
     * 
     * 
     * @param {object}      self          The context (``this``) for the function, used within `func.apply(self, func_args)`
     * @param {function}    func          A function which returns a promise - to handle automatic retries for.
     * @param {Array}       func_args     The positional arguments, in order, to pass to ``func`` when calling it.
     * @param {number}      max_retries   (default: 4)  Maximum number of times to retry ``func`` before giving up.
     * @param {number}      retry_delay   (default: 3)  Number of seconds to wait between each retry.
     * 
     * @param {function}    fail_on       (default: `null`) If not `null` - a synchronous function which returns `true` when a promise error should be considered
     *                                    fatal and the function should not be retried - otherwise returns `false` to continue retrying until max_retries is hit.
     * 
     * @param {number}      tries         (default: 0)  This is an internal parameter used by `retry` itself to track the amount of tries that have occurred so far.
     *                                    This does not need to be passed or modified when calling this function.
     * 
     */
    return new Promise((resolve, reject) => {
        // tries += 1;
        let _retry = (e) => retry(
            self, func, func_args, max_retries=max_retries, retry_delay=retry_delay, fail_on=fail_on, tries=tries + 1
        ).then(resolve).catch(reject);

        let _handle_fail = (e) => {
            if (tries >= max_retries) {
                return reject(`Giving up. Retried ${func.name} ${tries} / ${max_retries} times without success. Last error: ${e.toString()}`);
            }
            if (typeof(fail_on) !== 'undefined' && fail_on !== null && fail_on(e)) {
                return reject(e);
            }
            console.log(`Function ${func.name} rejected last call. Will retry. Last error reason: ${e.toString()}`);
            return _retry().then(resolve).catch(reject);
        };
        let _func = () => func.apply(self, func_args).then(resolve).catch(_handle_fail);

        if (tries <= 0) { return _func(); }
        if (tries <= max_retries) {
            console.warn(`Will retry ${func.name} in ${retry_delay} seconds (tries: ${tries} / ${max_retries})`);
            return delay(retry_delay * 1000).then(_func).catch(reject);
        }
        tries -= 1;
        console.error(`Giving up. Tried to run ${func.name} ${tries} times`);
        return reject(`Failed to run after ${tries} attempts.`);
    });
};

