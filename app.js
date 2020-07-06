#!/usr/bin/env node
/**
 *
 * Node.JS pricefeed script for steem
 * Created by @Someguy213
 * https://github.com/someguy123
 * Updated by @Rishi556
 * https://github.com/rishi556
 * Released under GNU GPL 3.0
 * Requires Node v8.11.4
 */

var settings = require('./lib/settings');
var exchange = require('./lib/exchange');
var request = require('request');
var steem = require('steem');

var config = settings.config,
    retry_conf = settings.retry_conf;

console.log('-------------');
log(`Loaded configuration:
Username: ${config.name}
Bias: ${config.peg ? config.peg_multi : 'Disabled'}
RPC Node: ${config.node}`);
console.log('-------------');

global.verbose = false;
for(var t_arg of process.argv) {
    if(t_arg == '-v') {
        global.verbose = true;
    }
}

steem.api.setOptions({ url: config.node });

// used for re-trying failed promises
function delay(t) {
    return new Promise((r_resolve) => setTimeout(r_resolve, t) );
}

class SteemAcc {
    constructor(username, active_wif) {
        /**
         * Initialises object with username and active private key
         * @param  {string}  username    The username (without @)
         * @param  {string}  active_wif  The active private key
         * @throws {Error<string:msg>}   If private key is invalid
         */
        if(!steem.auth.isWif(config.wif)) {
            throw new Error('The private key you specified is not valid. Be aware Steem private keys start with a 5.');
        }
        this.user_data = {username, active_wif};
        this.wif_valid = null;
        
    }

    loadAccount(reload=false, tries=0) {
        /**
         * Loads an account's info (public keys) into this.user_data
         * then returns it. Automatically caches the data
         * @param {bool}    reload  Refresh the account cache
         * @param {int}     tries   Internal parameter used for retries on failure
         * @return {Promise.<user_data, str:err>}
         */
        var {user_data} = this;
        var {username} = user_data;
        log(`Loading account data for ${username}`);
        // If we already have the account loaded, and no refresh was requested
        // just use the cache.
        if(('auths' in user_data) && !reload) {
            return new Promise((resolve) => {
                return resolve(user_data);
            });
        }
        return new Promise((resolve, reject) => {
            steem.api.getAccounts([username], (err, res) => {
                if(err) {
                    console.error(`A problem occurred while locating the account ${username}`);
                    console.error('Most likely the RPC node is down.');
                    var msg = ('message' in err) ? err.message : err;
                    console.error('The error returned was:', msg);
                    if(tries < retry_conf.login_attempts) {
                        console.error(`Will retry in ${retry_conf.login_delay} seconds`);
                        return delay(retry_conf.login_delay * 1000)
                          .then(() => resolve(this.loadAccount(reload, tries+1)))
                          .catch((e) => reject(e));
                    }
                    console.error(`Giving up. Tried ${tries} times`)
                    return reject(`Failed to log in after ${tries} attempts.`);
                }
                log(`Successfully connected. Getting data for ${username}`);
                if(res.length < 1) {
                    console.error(`ERROR: Account ${username} wasn't found.`);
                    return reject('account not found');
                }
                var account = res[0];
                // load the public keys from the account
                var ud = {
                    ...user_data,
                    auths: {
                        owner: account.owner.key_auths[0][0],
                        active: account.active.key_auths[0][0],
                        posting: account.posting.key_auths[0][0]
                    },
                };
                this.user_data = ud;
                return resolve(ud);
            });
        });
    }

    login(reload=false) {
        /**
         * Checks if an account + active private key match.
         * Resolves with user data they do, rejects if there's a problem
         */
        if(this.wif_valid) {
            return new Promise((resolve) => resolve(this.user_data))
        }
        return new Promise((resolve, reject) => {
            this.loadAccount(reload).then((user_data) => {
                var {username, active_wif, auths} = user_data;
                var is_valid = steem.auth.wifIsValid(active_wif, auths.active);
                if(is_valid) {
                    this.wif_valid = true;
                    return resolve(user_data);
                }
                return reject('Private key WIF does not match key on account')
            }).catch((e) => reject(e));
        });
    }
    publish_feed(rate, tries=0) {
        try {
            // var tr = new TransactionBuilder();
            var ex_data = rate.toFixed(3) + ` ${config.base_symbol}`;
            var quote = 1;
            if(config.peg) {
                var pcnt = ((1 - config.peg_multi) * 100).toFixed(2);
                log(`Pegging is enabled. Reducing price by ${pcnt}% (set config.peg to false to disable)`);
                log(`Original price (pre-peg): ${ex_data}`);
                quote = 1 / config.peg_multi;
            }
            
            var exchangeRate = {base: ex_data, quote: quote.toFixed(3) + ` ${config.quote_symbol}`};
            var {username, active_wif} = this.user_data;
            steem.broadcast.feedPublish(active_wif, username, exchangeRate, 
                (err, r) => {
                    if(err) {
                        console.error('Failed to publish feed...');
                        var msg = ('message' in err) ? err.message : err;
                        console.error(`reason: ${msg}`);
                        if(tries < retry_conf.feed_attempts) {
                            console.error(`Will retry in ${retry_conf.feed_delay} seconds`);
                            return delay(retry_conf.feed_delay * 1000)
                              .then(() => this.publish_feed(rate, tries+1))
                              .catch(console.error);
                        }
                        console.error(`Giving up. Tried ${tries} times`);
                        return reject(err);                 
                    }
                    log(`Data published at: ${new Date()}`); //Not cure if this one will work
                    log('Successfully published feed.');
                    log(`TXID: ${r.id} TXNUM: ${r.trx_num}`);
                });
        } catch(e) {
            console.error(e);
        }
        console.log();
    }
}

try {
    var accountmgr = new SteemAcc(config.name, config.wif);
} catch(e) {
    console.error(`A serious error occurred while checking your account: ${e}`);
    process.exit(1);
}

var shouldPublish = settings.shouldPublish;
var dryRun = settings.dryRun;

var cap_sym = config.ex_symbol.toUpperCase(), 
    cap_comp = config.ex_compare.toUpperCase();

function get_price(callback) {
    exchange.get_pair( config.ex_symbol, config.ex_compare,
        (err, price) => callback(err, parseFloat(price))
    );
}

function main() {
    get_price((err,price) => {
        if(err) {
            return console.error('error loading prices, will retry later');
        }
        log(`${cap_sym}/${cap_comp} is: ${price.toFixed(3)} ${cap_comp} per ${cap_sym}`);
        log('Attempting to publish feed...');
        if(!dryRun) {
            accountmgr.publish_feed(price);
        } else {
            console.log('Dry Run. Not actually publishing.');
        }
    });
}

log('Attempting to login into account', config.name);
accountmgr.login().then((user_data) => {
    var {username} = user_data;
    log(`Successfully logged into ${username}`);
    console.log();
    if (settings.publishOnce) {
        log('Argument "publishonce" passed. Publishing immediately, then exiting.');
        return main();
    } else if (shouldPublish || dryRun) {
        log(`Publishing immediately, then every %s minute(s) ${config.interval}`);
        main();
    } else {
        log('Not publishing immediately');
        log('If you want to update your price feed RIGHT NOW, use node app.js publishnow');
    }
    console.log();
    // convert interval from minutes to ms
    var interval = parseInt(config.interval) * 1000 * 60;
    setInterval(() => main(), interval);
}).catch((e) => {
    console.error(`An error occurred attempting to log into ${config.name}... Exiting`);
    console.error(`Reason: ${e}`, e);
    process.exit(1);
});

