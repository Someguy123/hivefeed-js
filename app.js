/**
 *
 * Node.JS pricefeed script for steem
 * Created by @Someguy213
 * https://github.com/someguy123
 * Released under GNU GPL 3.0
 * Requires Node v6.3+
 */

var config = require('./config.json');
if(!('node' in config)) { config['node'] = 'wss://node.steem.ws'; }
if(!('peg' in config)) { config['peg'] = true; }

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
            console.log('finding account', username);
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
            console.log('attempting to login account', username);
            try {
                var success_key = user.checkKeys(user_data);
            } catch(e) {
                success_key = false;
                console.error('error logging in:', e);
            }
            if(success_key) {
                console.log('logged in');
                callback(false, user);
            } else {
                console.error('failed to log in');
            }
        });
    });
}

function get_price(callback) {
    request('https://value.steem.network/exdata.json', function(error,response,body) {
        if(error || response.statusCode != 200) {
            return callback(true,null);
        }
        var prices = JSON.parse(body),
            price = 0;

        if('usd_steem' in prices) {
            var price = 1 / prices['usd_steem'];
        }
        if('steem_usd' in prices) {
            var price = prices['steem_usd'];
        }
        if(price == 0) {
            return callback(true,null);
        }
        return callback(false, parseFloat(price));
    })
    //callback(false, price);
    //callback(true, null);
}

function publish_feed(rate, account_data) {
    try {
        var tr = new TransactionBuilder();
        var ex_data = rate.toFixed(3) + " SBD";
        var feed_data = {
            publisher: account_data.name,
            exchange_rate: {base: ex_data, quote: "1.000 STEEM"}
        }
        tr.add_type_operation("feed_publish", feed_data);
        tr.process_transaction(account_data, null, true)
    } catch(e) {
        console.error(e);
    }
    console.log('Data published at: ', ""+new Date())
    console.log();
}

function main(account_data) {
    get_price(function(err,price) {
        if(err) {
            return console.error('error loading prices, will retry later');
        }
        if(config.peg) {
            console.log('Pegging is enabled. Reducing price by 10% (set config.peg to false to disable)');
            console.log('Original price (pre-peg):', price.toFixed(3));
            price = price * 0.9;
        }
        console.log('STEEM/USD is ', price.toFixed(3));
        publish_feed(price, account_data);
    });
}

loginAccount(config.name, config.wif, ['active'], function(err,account_data) {
    if(err) {
        console.error('account failed to log in...', err);
        return process.exit();
    }
    console.log('Successfully logged into user', account_data.name);
    console.log();
    if(shouldPublish) {
        console.log('Publishing immediately, then every %s minute(s)',config.interval);
        main(account_data);
    } else {
        console.log('Not publishing immediately');
        console.log('If you want to update your price feed RIGHT NOW, use node app.js publishnow');
    }
    console.log();
    // convert interval to minutes
    var interval = parseInt(config.interval) * 1000 * 60;
    setInterval(function() { main(account_data) }, interval)
});

