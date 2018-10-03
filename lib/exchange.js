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
    BittrexAdapter = require('./adapters/BittrexAdapter'),
    KrakenAdapter = require('./adapters/KrakenAdapter'),
    BinanceAdapter = require('./adapters/BinanceAdapter')
    ;
/**
 * This file handles communication
 * with various exchanges
 * Basic runtime of this file:
 * At the bottom of the file, add_adapter registers adapters
 * get_pair is the main function
 * 
 * Usage: get_pair('btc', 'usd', function(err, price) { log('btc/usd:', price) })
 * 
 * See the doc comment for get_pair which has a full explanation of how it works
 */

/**
 * The adapter list is an object containing initialised adapters 
 * which are mapped to the coin pairs that they support.
 * It is structured as such:
 * _AdapterList[from][to][adapter_name] = adapter
 * 
 * Example:
 * _AdapterList['btc']['usd']['Bittrex'] = BittrexAdapter()
 */
var _AdapterList = {};

// What coins should we proxy through if we can't find
// a certain pair? Prevents needless proxying
var _Proxies = ['btc','usd', 'usdt'];

/**
 * Allows a pair such as USD_BTC to work for BTC_USD
 * Example: 
 * var r = ReverseAdapter('btc', 'usd', BittrexAdapter()) 
 * r.get_pair('btc', 'usd', function(err, price) { log('btc/usd:', price) });
 * 
 * This would query Bittrex for USD/BTC instead of BTC/USD, and then invert the price so
 * that the BTC/USD price is returned.
 * 
 * @param {str} from - Starting coin
 * @param {str} to - Destination coin
 * @param {adapter} p_adapter - An exchange adapter such as BittrexAdapter
 */
function ReverseAdapter(from, to, p_adapter) {
    if(Object.keys(_AdapterList[to][from]).length < 1) {
        dbg_log(`[exchange.ReverseAdapter] Adapter for ${to}/${from} was not found`)
        return false;
    }
    return {
        get_pair: function(from,to,callback) {
            p_adapter.get_pair(to,from, function(err,data) {
                if(err) {
                    console.error('reverse error',p_adapter.name, err);
                    return callback(true,null); 
                }
                dbg_log(`[exchange.ReverseAdapter] Data for ${to}/${from} is ${1.0 / parseFloat(data)}`)
                return callback(false, 1.0 / parseFloat(data))
            })
        }
    }
}

/**
 * Load an adapter into the global adapter list by generating
 * from/to mappings in the _AdapterList
 * @param {adapter} - Adapter to load
 */
function add_adapter(adapter) {
    for(var p in adapter.provides) {
        var from = adapter.provides[p][0],
            to   = adapter.provides[p][1];
        if(!(from in _AdapterList)) _AdapterList[from] = {};
        if(!(to in _AdapterList[from])) _AdapterList[from][to] = {};
        _AdapterList[from][to][adapter.name] = adapter;
    }
}

/**
 * Find adapters which can handle the given from/to pair.
 * @param {str} from - From coin
 * @param {str} to - Destination coin
 * @return {array<adapter>} - List of exchanges which support this pair
 */
function get_adapters(from,to) {
    if(!(from in _AdapterList)) _AdapterList[from] = {};
    if(!(to in _AdapterList[from])) _AdapterList[from][to] = {};

    return _AdapterList[from][to];
}

/**
 * Find adapters which can handle the given from/to pair assuming it is inverted
 * For example, find adapters which can handle usd/btc by using btc/usd and inverting the price
 * @param {str} from - From coin
 * @param {str} to - Destination coin
 * @return {array<ReverseAdapter>} - List of exchanges (wrapped with ReverseAdapter) which support this pair
 */
function get_reverse_adapters(from,to) {
    if(!(to in _AdapterList)) _AdapterList[to] = {};
    if(!(from in _AdapterList[to])) _AdapterList[to][from] = {};
    var new_adapters = {}
    dbg_log(`[exchange.get_reverse_adapters] Finding adapter for ${from}/${to}`)
    for(var k in _AdapterList[to][from]) {
        new_adapters[k] = ReverseAdapter(from,to, _AdapterList[to][from][k]);
    }
    if(Object.keys(new_adapters).length > 0) {
        dbg_log(green(`[exchange.get_reverse_adapters] Potential reverse adapters: ${Object.keys(new_adapters)}`))
    } else {
        dbg_log(yellow(`[exchange.get_reverse_adapters] No reverse adapters found`))
    }
    return new_adapters;
}
/**
 * Check if a pair can be gotten via a proxy (e.g. steem/usd via steem/btc -> btc/usd)
 * @param {str} from - From coin
 * @param {str} to - Destination coin
 * @return {str} - Coin name which can be proxied (e.g. btc)
 */
function find_proxy(from,to) {
    dbg_log(`[exchange.find_proxy] Trying proxy for ${from}/${to}`)

    // Loop over the pre-defined proxy coins
    for(var p in _Proxies) {
        var proxy = _Proxies[p];
        // Can we proxy directly? If so, return the name of the coin we should use to proxy
        var adapters = get_adapters(from,proxy);        
        if(Object.keys(adapters).length > 0) {
            return proxy;
        }
        // Can we proxy in reverse? If so, return the name of the coin we should use to proxy
        var adapters = get_reverse_adapters(from,proxy);        
        if(Object.keys(adapters).length > 0) {
            return proxy;
        }
    }
    dbg_log('No proxy found');
    return false;
}
/**
 * Attempt to handle a pair using a proxy (e.g. steem/usd via steem/btc -> btc/usd)
 * @param {str} from - From coin
 * @param {str} to - Destination coin
 * @param {str} proxy - The coin to proxy using
 * @callback {float} - Average price for from/to determined from the proxies
 */
function try_proxy(from,to,proxy,callback) {
    var tgt = {}
    var promises = [
        /**
         * The "from" proxy handles the first connection
         * E.g. Steem->USD via BTC - this would handle Steem->BTC
         */
        new Promise(function(resolve,reject) { 
            dbg_log(green(`[try_proxy] [from] Using proxy ${from} / ${proxy}`))
            get_pair(from,proxy,function(err,price) {
                if(err) return reject();
                tgt['from'] = price;
                resolve();
            });
        }),
        /**
         * The "to" proxy handles the conversion of the proxy coin
         * E.g. Steem->USD via BTC - this would handle BTC->USD
         */
        new Promise(function(resolve,reject) { 
            dbg_log(green(`[try_proxy] [to] Using proxy ${proxy} / ${to}`))
            get_pair(proxy,to,function(err,price) {
                if(err) return reject();
                tgt['to'] = price;
                resolve();
            });
        })
    ];
    Promise.all(promises).then(function() {
        dbg_log(`[try_proxy] --- Proxy Prices (${from} to ${to} via proxy ${proxy}) ---`)
        dbg_log(`[try_proxy] From (${proxy}/${from}):`, tgt['from'].toFixed(5))
        dbg_log(`[try_proxy] To (${proxy}/${to}):`, tgt['to'].toFixed(5))
        var avg_price = tgt['to'] * tgt['from'];
        dbg_log(green(`[try_proxy] Final average price is: ${avg_price.toFixed(4)} ${to.toUpperCase()} per ${from.toUpperCase()}`))
        return callback(false, avg_price);
    }, function(e) {console.error("Something went wrong proxying...",e); callback(false, null)});
}
/**
 * Obtain the median average for a set of price points
 * @param {object} data - An object in the form of {'exchange': price<float>}
 * @return {float} - The median average of the values
 */
function get_avg(data) {
    // Pull out just the values
    var vals = [];
    for(var k in data) { vals.push(data[k]); }
    return median(vals);
}

/**
 * Obtains the median average price for a coin pair (e.g. btc/usd)
 * Attempts in order: direct path (btc/usd), reverse path (usd/btc), and proxies (btc->ltc->usd)
 * 
 * Example: get_pair('steem', 'usd', function(err, price) { log('steem/usd:', price) })
 * -> Check if direct path (steem/usd) possible using get_adapters(from,to,callback)
 * -> If not, try an inverted path (usd/steem) with get_reverse_adapters(from,to,callback)
 * -> If no reverse path possible, call find_proxy(from,to) to see if a proxy is possible
 *    for example steem->btc->usd
 * -> Assuming a proxy is available, fire off to try_proxy(from,to,fp,callback) (fp = find_proxy output)
 *    which will recursively call get_pair for from/to via the proxy.
 *    Nested proxies are possible, for example steem -> btc -> usdt -> usd
 *    however, note that proxies will not be used unless there is no direct or reverse path.
 *    Once the proxies call back, the median average price is returned via callback
 * -> If no proxy is possible, give up.
 * @param {str} from 
 * @param {str} to 
 * @param {function} callback - Callback function(err,price)
 * @callback (1) {bool} - Error
 * @callback (2) {float} - Median average price (or null if error)
 */
function get_pair(from,to,callback) {
    var cached = cache.get(from+'_'+to+':price');
    if(cached !== null) return cached;

    var adapters = get_adapters(from,to);
    var output = {};
    var promises = [];
    if(Object.keys(adapters).length < 1) {
        // No direct connections, try reverse
        dbg_log(yellow(`[get_pair] No direct path to ${from}/${to}. Finding reverse`));
        adapters = get_reverse_adapters(from,to);
    }
    if(Object.keys(adapters).length < 1) {
        dbg_log(yellow(`[get_pair] No reverse path to ${from}/${to}. Finding proxy`))
        // Can't reverse pair... try proxy?
        var fp = find_proxy(from,to);
        if(!fp) return console.error('(1) No adapter found');
        return try_proxy(from,to,fp,function(err, price) {
            if(err) return callback(true,null);
            dbg_log(`[get_pair] try_proxy (${from}/${to} via ${fp}) called back to get_pair with price ${price}`)
            return callback(false, parseFloat(price));
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
            dbg_log(green(`[get_pair] Requesting ${from}/${to} via ${exname}`))
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
        function() { 
            if(Object.keys(output).length < 1) {
                log(red('Something went wrong loading prices... Output was empty'));
                return callback(true, null)
            }
            var avg = get_avg(output);
            dbg_log(green(`[get_pair] (${from}/${to}) - Exchange Prices:`), output)
            dbg_log(green(`[get_pair] (${from}/${to}) - Median average price: ${avg.toFixed(5)} ${to.toUpperCase()} per ${from.toUpperCase()}`))
            return callback(false, avg);
        }, 
        function(e) { log(red('Problem loading prices... Will try to continue'), e); return callback(true, null) }
    );
}

add_adapter(PoloniexAdapter);
// add_adapter(BTCEAdapter);
add_adapter(BittrexAdapter);
add_adapter(BinanceAdapter);
add_adapter(KrakenAdapter);

// Simple usage of this file:
//
// get_pair('steem','usd', function(err, price) {
//     log('Median price is: ', parseFloat(price).toFixed(3));
// });

module.exports = {
    get_pair: get_pair,
    get_avg: get_avg,
    add_adapter: add_adapter,
    get_adapters: get_adapters
}
