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
    hive: {
        node: 'https://api.deathwing.me/',
        alternate_nodes : ['https://api.deathwing.me', 'https://api.hive.blog'],
        ex_symbol: 'hive', ex_compare: 'usd',
        base_symbol: 'HBD', quote_symbol: 'HIVE',
        chain_id: 'beeab0de00000000000000000000000000000000000000000000000000000000',
        address_prefix : 'STM',
    },
    testnet : {
        node: 'https://testnet.openhive.network/',
        alternate_nodes : [],
        ex_symbol: 'hive', ex_compare: 'usd',
        base_symbol: 'TBD', quote_symbol: 'TESTS',
        chain_id : '18dcf0a285365fc58b71f18b3d3fec954aa0c141c44e4e5cb4cf777b9eab274e',
        address_prefix : 'TST',
    }
};

if(!('network' in config)) { config.network = 'hive'; }

// Contains defaults for the network selected by the user
var ndef = defaults[config.network];

if(!('node' in config)) { config.node = ndef.node; }
if(!('alternate_nodes' in config)) { config.alternate_nodes = ndef.alternate_nodes; }
if(!('chain_id' in config)) { config.chain_id = ndef.chain_id; }
if(!('address_prefix' in config)) { config.address_prefix = ndef.address_prefix; }
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
    if (t_arg == 'publishnow') settings.shouldPublish = true;
    if (t_arg == 'dry') settings.dryRun = true;
    if (t_arg == 'publishonce') settings.publishOnce = true;
}

if (!config.alternate_nodes.includes(config.node)){
    config.alternate_nodes.push(config.node)
}

settings.config = config;

module.exports = settings;
