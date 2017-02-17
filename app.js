/**
 *
 * Node.JS pricefeed script for steem
 * Created by @Someguy213
 * https://github.com/someguy123
 * Released under GNU GPL 3.0
 * Requires Node v6.3+
 */

var config = require('./config.json');
var exchange = require('./lib/exchange');

if(!('node' in config)) { config['node'] = 'wss://node.steem.ws'; }
if(!('peg' in config)) { config['peg'] = true; }
if(!('peg_multi' in config)) { config['peg_multi'] = 0.88; }

var options = {url: config['node']}
var { TransactionBuilder, Login } = require('steemjs-lib');
var {Client} = require('steem-rpc');
var Api = Client.get(options, true);
var request = require('request');
// Needs to be global scope to access elsewhere
var user = new Login();

var shouldPublish = process.argv.length > 2 && process.argv[2] == "publishnow";

function loginAccount(username, wif, roles, callback) {
    user.setRoles(roles);

    Api.initPromise.then(function(r) {
        // step 1. find the account
        Api.database_api().exec("get_accounts", [[username]]).then(function(res) {
            log('finding account', username);
            if(res.length < 1) {
                console.error('account not found')
                return callback(true, null);
            }
            var account = res[0];
            // load the keys from the account
            var user_data = {
                accountName: username,
                auths: {
                    owner: account.owner.key_auths,
                    active: account.active.key_auths,
                    posting: account.posting.key_auths
                },
                privateKey: config.wif
            };
            // try to log in
            log('attempting to login account', username);
            try {
                var success_key = user.checkKeys(user_data);
            } catch(e) {
                success_key = false;
                console.error('error logging in:', e);
            }
            if(success_key) {
                log('logged in');
                callback(false, user);
            } else {
                console.error('failed to log in');
            }
        });
    });
}

var get_price = function(callback) {
    exchange.get_pair('steem','usd', function(price) {
        callback(false, parseFloat(price));
    });
}

// function get_price(callback) {
//     request('https://value.steem.network/exdata.json', function(error,response,body) {
//         if(error || response.statusCode != 200) {
//             return callback(true,null);
//         }
//         var prices = JSON.parse(body),
//             price = 0;

//         if('usd_steem' in prices) {
//             var price = 1 / prices['usd_steem'];
//         }
//         if('steem_usd' in prices) {
//             var price = prices['steem_usd'];
//         }
//         if(price == 0) {
//             return callback(true,null);
//         }
//         return callback(false, parseFloat(price));
//     })
//     //callback(false, price);
//     //callback(true, null);
// }

function publish_feed(rate, account_data) {
    try {
        var tr = new TransactionBuilder();
        var ex_data = rate.toFixed(3) + " SBD";
        var quote = 1;
        if(config.peg) {
            var pcnt = ((1 - config['peg_multi']) * 100).toFixed(2)
            log('Pegging is enabled. Reducing price by '+pcnt+'% (set config.peg to false to disable)');
            log('Original price (pre-peg):', ex_data);
            quote = 1 / config['peg_multi'];
        }
        var feed_data = {
            publisher: account_data.name,
            exchange_rate: {base: ex_data, quote: quote.toFixed(3) + " STEEM"}
        }
        tr.add_type_operation("feed_publish", feed_data);
        tr.process_transaction(account_data, null, true)
    } catch(e) {
        console.error(e);
    }
    log('Data published at: ', ""+new Date())
    console.log();
}

function main(account_data) {
    get_price(function(err,price) {
        if(err) {
            return console.error('error loading prices, will retry later');
        }
        log('STEEM/USD is ', price.toFixed(3));
        publish_feed(price, account_data);
    });
}

loginAccount(config.name, config.wif, ['active'], function(err,account_data) {
    if(err) {
        console.error('account failed to log in...', err);
        return process.exit();
    }
    log('Successfully logged into user', account_data.name);
    console.log();
    if(shouldPublish) {
        log('Publishing immediately, then every %s minute(s)',config.interval);
        main(account_data);
    } else {
        log('Not publishing immediately');
        log('If you want to update your price feed RIGHT NOW, use node app.js publishnow');
    }
    console.log();
    // convert interval to minutes
    var interval = parseInt(config.interval) * 1000 * 60;
    setInterval(function() { main(account_data) }, interval)
});

