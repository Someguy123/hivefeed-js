/**
 * Auto-magic exchange tracker
 * with inverted pairs and automatic proxying.
 * 
 * Released under GNU AGPL 3.0
 * Author: Someguy123 (https://github.com/someguy123)
 * 
 */

var request = require('request'),
    cache = require('./cache');

global.cache = cache;
require('./helpers');

//var BTCEAdapter = require('./adapters/BTCEAdapter'),
var PoloniexAdapter = require('./adapters/PoloniexAdapter'),
    BittrexAdapter = require('./adapters/BittrexAdapter')
    ;
/**
 * This file handles communication
 * with various exchanges
 */


var _AdapterList = {};

// What coins should we proxy through if we can't find
// a certain pair?
var _Proxies = ['btc','usd'];

// Allows a pair such as USD_BTC to work for BTC_USD
function ReverseAdapter(from, to, p_adapter) {
    if(Object.keys(_AdapterList[to][from]).length < 1) {
        return false;
    }
    return {
        get_pair: function(from,to,callback) {
            p_adapter.get_pair(to,from, function(err,data) {
                if(err) {
                    console.error('reverse error',p_adapter.name, err);
                    return callback(true,null); 
                }
                return callback(false, 1.0 / parseFloat(data))
            })
        }
    }
}

/**
 * Load an adapter into the global adapter list
 */
function add_adapter(adapter, name) {
    for(var p in adapter.provides) {
        var from = adapter.provides[p][0],
            to   = adapter.provides[p][1];
        if(!(from in _AdapterList)) _AdapterList[from] = {};
        if(!(to in _AdapterList[from])) _AdapterList[from][to] = {};
        _AdapterList[from][to][adapter.name] = adapter;
    }
}

function get_adapters(from,to) {
    if(!(from in _AdapterList)) _AdapterList[from] = {};
    if(!(to in _AdapterList[from])) _AdapterList[from][to] = {};

    return _AdapterList[from][to];
}
function get_reverse_adapters(from,to) {
    if(!(to in _AdapterList)) _AdapterList[to] = {};
    if(!(from in _AdapterList[to])) _AdapterList[to][from] = {};
    var new_adapters = {}
    for(var k in _AdapterList[to][from]) {
        new_adapters[k] = ReverseAdapter(from,to, _AdapterList[to][from][k]);
    }
    return new_adapters;
}
// Can we proxy via another coin, e.g. BTC, or USD?
function find_proxy(from,to) {
    for(var p in _Proxies) {
        var proxy = _Proxies[p];
        var adapters = get_adapters(from,proxy);        
        if(Object.keys(adapters).length > 0) {
            return _Proxies[p];
        }
        var adapters = get_reverse_adapters(from,proxy);        
        if(Object.keys(adapters).length > 0) {
            return _Proxies[p];
        }
    }
    log('No proxy found');
    return false;
}
function try_proxy(from,to,proxy,callback) {
    var tgt = {}
    var promises = [
        new Promise(function(resolve,reject) { 
            get_pair(proxy,from,function(price) {
                tgt['from'] = price;
                resolve();
            });
        }),
        new Promise(function(resolve,reject) { 
            get_pair(proxy,to,function(price) {
                tgt['to'] = price;
                resolve();
            });
        })
    ];
    Promise.all(promises).then(function() {
        return callback(get_avg(tgt['to']) * get_avg(tgt['from']));
    }, function(e) {return console.error("Something went wrong proxying...",e)});
}

function get_avg(data) {
    // Pull out just the values
    var vals = [];
    for(var k in data) { vals.push(data[k]); }
    return median(vals);
}

function get_pair(from,to,callback) {
    var cached = cache.get(from+'_'+to+':price');
    if(cached !== null) return cached;

    var adapters = get_adapters(from,to);
    var output = {};
    var promises = [];
    if(Object.keys(adapters).length < 1) {
        // No direct connections, try reverse
        adapters = get_reverse_adapters(from,to);
    }
    if(Object.keys(adapters).length < 1) {
        // Can't reverse pair... try proxy?
        var fp = find_proxy(from,to);
        if(!fp) return console.error('(1) No adapter found');
        return try_proxy(from,to,fp,function(price) {
            return callback(price);
        });
    }    
    if(Object.keys(adapters).length < 1) {        
        return console.error('(2) No adapter found');
    }

    for(var k in adapters) {
        if (!adapters.hasOwnProperty(k)) continue;
        log('Querying',k,'('+from+'/'+to+')');
        var prom = new Promise(function(resolve,reject) {
            // k will be overwritten in the next for loop
            // so store it here in the promise...
            var exname = k;
            adapters[exname].get_pair(from,to,function(err,price) {
                if(err) {
                    // rather than hang up if an exchange is dead
                    // we just log it and move on...
                    console.error('Exchange %s is down! Skipping...',exname, err); 
                    return resolve(); 
                }
                output[exname] = parseFloat(price);
                resolve();
            });
        });
        promises.push(prom);
    }

    // Run all of the exchange queries
    // then callback the output
    Promise.all(promises)
    .then(
        function() { callback(output) }, 
        function(e) { log('An unexpected error has occurred', e)}
    );
}

add_adapter(PoloniexAdapter);
// add_adapter(BTCEAdapter);
add_adapter(BittrexAdapter);

// get_pair('steem','usd', function(price) {
//     log('Median price is: ', parseFloat(price).toFixed(3));
// });
module.exports = {
    get_pair: get_pair,
    get_avg: get_avg,
    add_adapter: add_adapter,
    get_adapters: get_adapters
}
