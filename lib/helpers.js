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
}
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