#!/usr/bin/env node
/**
 * get_rate.js
 * A small tool for quickly checking the calculated exchange rate for a given
 * coin pair.
 * 
 * Usage:
 *      # With no arguments, gets the STEEM/USD exchange rate
 *      ./tools/get_rate.js
 *      ./tools/get_rate.js -v
 *      # Get the HIVE/USD exchange rate via any exchange possible (including via proxy rates)
 *      ./tools/get_rate.js hive usd
 * 
 */
var exchange = require('../lib/exchange');

var args_processed = 0, 
    pair_base = "steem", 
    pair_quote = "usd", 
    pair_exchange = null;


for(var t_arg of process.argv) {
    if(t_arg == '-v') {
        global.verbose = true;
        continue;
    }
    if (args_processed == 2) pair_base = t_arg;
    if (args_processed == 3) pair_quote = t_arg;
    if (args_processed == 4) pair_exchange = t_arg;
    args_processed += 1;
}

pair_base = pair_base.toLowerCase();
pair_quote = pair_quote.toLowerCase();
var pb = pair_base.toUpperCase(), pq = pair_quote.toUpperCase();

if (pair_exchange == null) {    
    console.log(`Getting last price for pair: ${pb}/${pq}`);
    exchange.get_pair(
        pair_base, pair_quote, (err, price) => {
            if(err) {
                console.error("get_pair returned an error: " + err.toString());
                return console.error('error loading prices, please retry later');
            }
            console.log(`${pb}/${pq} is ${price.toFixed(6)} ${pq} per 1 ${pb}`);
        }
    );
} else {
    console.log(`Getting last price for pair: ${pb}/${pq} - using only exchange '${pair_exchange}'`);
    var adapter = null;
    for (var a of exchange.available_adapters) {
        if (a.code == pair_exchange.toLowerCase() || a.name == pair_exchange) {
            adapter = a;
        }
    }

    if (adapter == null) {
        console.error(`ERROR: Could not find adapter with name/code '${pair_exchange}'`)
        process.exit(1);
    }

    adapter.get_pair(pair_base, pair_quote, (err, price) => {
        if(err) {
            console.error("get_pair returned an error: " + err.toString());
            return console.error('error loading prices, please retry later');
        }
        console.log(`Using specific exchange ${pair_exchange} for price:`);
        console.log(`${pb}/${pq} is ${price.toFixed(6)} ${pq} per 1 ${pb}`);
    });

}

