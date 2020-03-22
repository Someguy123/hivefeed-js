var config = require('../config.json');

var settings = {
    shouldPublish: false,
    dryRun: false,
    publishOnce: false,
    // Attempts = how many times to allow an RPC problem before giving up
    // Delay = how long before a retry
    retry_conf: {
        feed_attempts: 10,
        feed_delay: 60,
        login_attempts: 6,
        login_delay: 10
    }
};


var defaults = {
    steem: {
        node: 'https://api.steemit.com/',
        ex_symbol: 'steem', ex_compare: 'usd',
        base_symbol: 'SBD', quote_symbol: 'STEEM',
    },
    // steem-js requires we reference STEEM / SBD instead of HIVE / HBD
    hive: {
        node: 'https://anyx.io/',
        ex_symbol: 'hive', ex_compare: 'usd',
        base_symbol: 'SBD', quote_symbol: 'STEEM',
    }
};

if(!('network' in config)) { config.network = 'steem'; }

// Contains defaults for the network selected by the user
var ndef = defaults[config.network];

if(!('node' in config)) { config.node = ndef.node; }
// disable peg by default. 0% peg (bias)
if(!('peg' in config)) { config.peg = false; }
if(!('peg_multi' in config)) { config.peg_multi = 1; }
if(!('interval' in config)) { config.interval = 60; }

if(!('ex_symbol' in config)) { config.ex_symbol = ndef.ex_symbol; }
if(!('ex_compare' in config)) { config.ex_compare = ndef.ex_compare; }
if(!('base_symbol' in config)) { config.base_symbol = ndef.base_symbol; }
if(!('quote_symbol' in config)) { config.quote_symbol = ndef.quote_symbol; }

if(!('disable_exchanges' in config)) { config.disable_exchanges = []; }
if(!('exchanges_no_provide' in config)) { config.exchanges_no_provide = {}; }
if(!('exchanges_provide' in config)) { config.exchanges_provide = {}; }

config.ex_symbol = config.ex_symbol.toLowerCase();
config.ex_compare = config.ex_compare.toLowerCase();
config.quote_symbol = config.quote_symbol.toUpperCase();
config.base_symbol = config.base_symbol.toUpperCase();

// Parse any command line arguments
global.verbose = false;
for(var t_arg of process.argv) {
    if(t_arg == '-v') global.verbose = true;
    if (t_arg == "publishnow") settings.shouldPublish = true;
    if (t_arg == "dry") settings.dryRun = true;
    if (t_arg == "publishonce") settings.publishOnce = true;
}

settings.config = config;

module.exports = settings;
