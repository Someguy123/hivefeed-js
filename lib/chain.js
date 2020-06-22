var hive = require('@hiveio/hive-js');
var steem = require('steem');
var settings = require('./settings');
var packer = require('./packer');
var config = settings.config,
    retry_conf = settings.retry_conf;

require('./helpers');

class KeyPair {
    constructor(public_key=null, private_key=null, key_type=null) {
        this.public_key = public_key;
        this.private_key = private_key;
        this.key_type = key_type;
    }
}

class Blockchain {
    constructor(network = "hive", nodes = null) {
        this.default_nodes = config.nodes;
        this.network = network = network.toLowerCase();
        if (network == "hive") {
            console.log("Blockchain network is set to 'hive'. Using hive-js for blockchain interaction.");
            this.chain_lib = hive;
        } else if (network == "steem") {
            console.log("Blockchain network is set to 'steem'. Using steem-js for blockchain interaction.");
            this.chain_lib = steem;
        } else {
            console.error(`WARNING: Unknown network '${network}' - Using steem-js without any default nodes. This is not guaranteed to work!`);
            this.chain_lib = steem;
            // throw `Invalid network passed to Blockchain: '${network}'. Must be 'steem' or 'hive'`;
        }
        this.api = this.chain_lib.api;

        this.cache = {};
        this.cache_timeout = settings.cache_timeouts.chain;

        if (nodes === null || nodes === undefined || nodes.length < 1) {
            this.nodes = this.default_nodes;
            console.log(`Using default nodes: ${this.nodes}`);
        } else if ((typeof nodes) === 'string') {
            this.nodes = [nodes];
            console.log(`Using singular node: ${this.nodes}`);
        } else {
            this.nodes = nodes;
            console.log(`Using user configured node list: ${this.nodes}`);
        }

        this.api.setOptions({
            url: this.nodes[0],
            alternative_api_endpoints: this.nodes
        });
    }

    getChainLib() {
        /**
         * @return {hive|steem}
         */
        return this.chain_lib;
    }
    getApi() {
        /**
         * @return {hive.api|steem.api}
         */
        return this.api;
    }

    _getAccount(username, reload=false) {
        if ("accounts" in this.cache && !reload) {
            if (username in this.cache.accounts) {
                let cache_seconds = ((new Date()) - this.cache.accounts[username].cached_at) / 1000;
                if (cache_seconds < this.cache_timeout) {
                    console.log(`Returning account data from cache (only ${cache_seconds} seconds old)...`);
                    return new Promise((resolve, reject) => { resolve(this.cache.accounts[username]); });
                } else {
                    console.log(`Account cache expired (${cache_seconds} old, is >= ${this.cache_timeout} timeout)`);
                }
            }
        } else {
            this.cache.accounts = {};
        }
        return new Promise((resolve, reject) => {
            return this.api.getAccounts([username], (err, data) => {
                if(err) {
                    console.error('A problem occurred while locating the account', username);
                    console.error('Most likely the RPC node is down.');
                    var msg = ('message' in err) ? err.message : err;
                    console.error('The error returned was:', msg);
                    return reject(msg);
                    // if(tries < retry_conf.login_attempts) {
                    //     console.error(`Will retry in ${retry_conf.login_delay} seconds`);
                    //     return delay(retry_conf.login_delay * 1000)
                    //     .then(() => resolve(this.getAccountKeys(username, tries+1)))
                    //     .catch((e) => reject(e));
                    // }
                    // console.error(`Giving up. Tried ${tries} times`)
                    // return reject(`Failed to log in after ${tries} attempts.`);
                }
                if (data === null) {
                    console.error(`Error: data is empty. Account '${username}' doesn't exist?`);
                    return reject(`No data for ${username}`);
                }
                log(`Successfully connected. Getting data for ${username}`);
                this.cache.accounts[username] = {
                    ...data[0], cached_at: new Date()
                };
                return resolve(this.cache.accounts[username]);
            });
        });
    }

    getAccount(username, reload=false) {
        let fail_func = (e) => e.toString().indexOf("No data for") >= 0;

        return retry(this, this._getAccount, [username, reload], 4, 4, fail_func);
    }

    // retry(func, func_args, max_retries=4, retry_delay=5, tries=0) {
    //     /**
    //      * Usage:
    //      *      >>> this.retry(this.some_func, resolve, reject, 0, example, args, passed, to, some_func)
    //      */
    //     if(tries < max_retries) {
    //         console.error(`Will retry in ${retry_delay} seconds`);
    //         return delay(retry_delay * 1000)
    //                .then(() => resolve(func.apply(this, func_args)))
    //                .catch((e) => retry(func, func_args, max_retries, retry_delay, tries + 1));
    //     }
    //     console.error(`Giving up. Tried ${tries} times`);
    //     return reject(`Failed to run after ${tries} attempts.`);
    // }

    _getWitness(username, reload=false) {
        if ("witnesses" in this.cache && !reload) {
            if (username in this.cache.witnesses) {
                let cache_seconds = ((new Date()) - this.cache.witnesses[username].cached_at) / 1000;
                if (cache_seconds < this.cache_timeout) {
                    console.log(`Returning witness data from cache (only ${cache_seconds} seconds old)...`);
                    return new Promise((resolve, reject) => { resolve(this.cache.witnesses[username]); });
                }
                console.log(`Witness cache expired (${cache_seconds} old, is >= ${this.cache_timeout} timeout)`);
            }
        } else {
            this.cache.witnesses = {};
        }
        return new Promise((resolve, reject) => {
            return hive.api.getWitnessByAccount(username, (err, data) => {
                if(err) {
                    console.error('Failed to get witness data for', username);
                    var msg = ('message' in err) ? err.message : err;
                    console.error('The error returned was:', msg);
                    return reject(err);
                }
                if (data === null) {
                    console.error(`Error: witness data is empty. Account '${username}' isn't a witness or doesn't exist?`);
                    return reject("witness data is empty");
                }
                this.cache.witnesses[username] = {...data, cached_at: new Date()};
                return resolve(data);
            });
        });
    }

    getWitness(username, reload=false) {
        let fail_func = (e) => e.toString().indexOf("witness data is empty") >= 0;

        return retry(this, this._getWitness, [username, reload], 4, 4, fail_func);
        // return retry(this, this._getWitness, [username], fail_on=(e) => e.indexOf("witness data is empty") >= 0);
    }

    getAccountKeys(username, reload=false) {
        if ("accounts" in this.cache && !reload) {
            if (username in this.cache.accounts && 'auths' in this.cache.accounts[username]) {
                let cache_seconds = ((new Date()) - this.cache.accounts[username].cached_at) / 1000;
                if (cache_seconds < this.cache_timeout) {
                    console.log(`Returning account key data from cache (only ${cache_seconds} seconds old)...`);
                    return new Promise((resolve, reject) => { resolve(this.cache.accounts[username].auths); });
                }
                console.log(`Account key cache expired (${cache_seconds} old, is >= ${this.cache_timeout} timeout)`);
            }
        } else {
            this.cache.accounts = {};
        }
        let res = {active: [], owner: [], posting: [], memo: [], signing: null};
        
        return new Promise((resolve, reject) => {
            return this.getAccount(username).then((account) => {
                for (let k of account.owner.key_auths) { res.owner.push(k[0]); }
                for (let k of account.active.key_auths) { res.active.push(k[0]); }
                for (let k of account.posting.key_auths) { res.posting.push(k[0]); }
                res.memo = account.memo_key;

                this.cache.accounts[username].auths = res;
                return this.getWitness(username).then((wit_data) => {
                    log(`Retrieved witness data for ${username} - including found signing key ${wit_data.signing_key}`);
                    this.cache.accounts[username].auths.signing = wit_data.signing_key;
                    return resolve(this.cache.accounts[username].auths);
                }).catch((e) => {
                    console.error(`Error getting witness data: ${e} - Signing key is not essential. Resolving promise anyway with normal account keys...`);
                    return resolve(this.cache.accounts[username].auths);
                });
                // return hive.api.getWitnessByAccount(username, (err, data) => {
                //     if(err) {
                //         console.error('Failed to get witness data for', username);
                //         var msg = ('message' in err) ? err.message : err;
                //         console.error('The error returned was:', msg);
                //         console.error("Signing key is not essential. Resolving promise anyway with normal account keys...");
                //         return resolve(res);
                //     }
                //     if (data === null) {
                //         console.error(`Error: witness data is empty. Account '${username}' isn't a witness or doesn't exist?`);
                //         console.error("Signing key is not essential. Resolving promise anyway with normal account keys...");
                //         return resolve(res);
                //     }
                //     log(`Retrieved witness data for ${username} - including found signing key ${data.signing_key}`);
                //     res.signing = data.signing_key;
                //     this.cache.accounts[username].auths = res;
                //     return resolve(res);
                // }).catch((err) => {
                //     console.error("Signing key is not essential. Resolving promise anyway with normal account keys...");
                //     return resolve(res);
                // });
            }).catch((e) => {
                // if(tries < retry_conf.login_attempts) {
                //     console.error(`Will retry in ${retry_conf.login_delay} seconds`);
                //     return delay(retry_conf.login_delay * 1000)
                //            .then(() => resolve(this.getAccountKeys(username, tries+1)))
                //            .catch((e) => reject(e));
                // }
                // console.error(`Giving up. Tried ${tries} times`);
                console.error("Failed to get account keys... reason:", e);
                // return reject(`Failed to get account keys after ${tries} attempts.`);
                return reject(`Failed to get account keys`);
            });
        });
    }

    testKey(privkey, pubkey) {
        /**
         * Confirm that the private key ``privkey`` is the matching private key for the public key ``pubkey``
         * 
         * Example::
         * 
         *      >>> bc = Blockchain()
         *      >>> bc.testKey("5JyjiqByjshatm2voDK7Ui5AyqGrNXPdGy67Vv5ijuMxVrsjRAA", "STM5zTXw7SHZhrS2YqtQQDm6FSygA1oEt41eXM7zWgUJ6MWz6NnSU")
         *      true
         *      >>> bc.testKey("5JyjiqByjshatm2voDK7Ui5AyqGrNXPdGy67Vv5ijuMxVrsjRAA", "STM4yGLF9LZM9fCKXQyAFsGBFexyvdNbmYKXWzpbiPZ1EsDM93Haq")
         *      false
         * @param {string}  privkey     Private key to compare matches pubkey
         * @param {string}  pubkey      Public key to compare matches privkey
         * @return {bool}   is_valid    ``true`` if privkey matches pubkey, otherwise ``false``.
         */
        return this.chain_lib.auth.wifIsValid(privkey, pubkey);
    }

    testAuths(auths, privkey) {
        /**
         * @param  {Map<string, Iterable|string>}  auths            A dictionary/mapping of key types to their public key or list of public keys.
         * @param  {string}                        privkey          The private key to try and locate within `auths`
         * @return {Iterable<KeyPair>}             matching_keys    KeyPair objects containing info about the key or keys which matched privkey
         */
        let active_keys = getDefault(auths, 'active', []), posting_keys = getDefault(auths, 'posting', []), 
        owner_keys = getDefault(auths, 'owner', []), memo_key = getDefault(auths, 'memo', 'STM1111111111111111111111111111111114T1Anm'),
        signing_key = getDefault(auths, 'signing', 'STM1111111111111111111111111111111114T1Anm');
    
        let matching_keys = [];
        for (let v of active_keys) {
            if (this.testKey(privkey, v)) { matching_keys.push(new KeyPair(v, privkey, 'active')); }
        }
        for (let v of posting_keys) {
            if (this.testKey(privkey, v)) { matching_keys.push(new KeyPair(v, privkey, 'posting')); }
        }
        for (let v of owner_keys) {
            if (this.testKey(privkey, v)) { matching_keys.push(new KeyPair(v, privkey, 'owner')); }
        }
        try {
            if (this.testKey(privkey, signing_key)) { matching_keys.push(new KeyPair(signing_key, privkey, 'signing')); }
        } catch(e) {
            console.error(`Error while trying to compare signing public key ${signing_key.toString()} against private key... Error was:`, e);
        }
        try {
            if (this.testKey(privkey, memo_key)) { matching_keys.push(new KeyPair(memo_key, privkey, 'memo')); }
        } catch(e) {
            console.error(`Error while trying to compare memo public key ${memo_key.toString()} against private key... Error was:`, e);
        }
        return matching_keys;
    }

    scanUserKeys(username, privkey) {
        /**
         * Works the same as `Blockchain.testAuths` but automatically looks up the keys (auths) for a username, instead of requiring
         * them to be specified directly.
         */
        return new Promise((resolve, reject) => {
            return this.getAccountKeys(username).then((auths) => {
                return resolve(this.testAuths(auths, privkey));
            }).catch(reject);
        });
    }


}
// steem.api.setOptions({ url: config.node });

function to_bytes(data) {
    let x = "";
    for (let v in data) {
        x += v.toString();
    }
    return Buffer.from(x);
}

function to_hex(data) {
    return to_bytes(data).toString('hex');
}

function pack_int(obj) {

}

// used for re-trying failed promises
// function delay(t) {
//     return new Promise((r_resolve) => setTimeout(r_resolve, t) );
// }

class Account extends Blockchain {
    constructor(username, key_wif, network='hive', nodes=null) {
        /**
         * Initialises object with username and active private key
         * @param  {string}  username    The username (without @)
         * @param  {string}  key_wif     The active or signing private key
         * @throws {Error<string:msg>}   If private key is invalid
         */
        nodes = ((typeof nodes) === 'undefined' || nodes === null) ? getDefault(config, 'nodes') : null;
        super(network, nodes);
        if(!steem.auth.isWif(key_wif)) {
            throw new Error("The private key you specified is not valid. Be aware Steem private keys start with a 5.");
        }
        this.user_data = {username, key_wif};
        this.keyPair = null;
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
        log('Loading account data for', username);
        // If we already have the account loaded, and no refresh was requested
        // just use the cache.
        if(('auths' in user_data) && !reload) {
            return new Promise((resolve) => resolve(user_data));
        }

        return new Promise((resolve, reject) => {
            return this.getAccountKeys(username, reload).then((auths) => {
                this.user_data = {...user_data, auths: auths};
                resolve(this.user_data);
            });
            // steem.api.getAccounts([username], (err, res) => {
            //     if(err) {
            //         console.error('A problem occurred while locating the account', username);
            //         console.error('Most likely the RPC node is down.');
            //         var msg = ('message' in err) ? err.message : err;
            //         console.error('The error returned was:', msg);
            //         if(tries < retry_conf.login_attempts) {
            //             console.error(`Will retry in ${retry_conf.login_delay} seconds`);
            //             return delay(retry_conf.login_delay * 1000)
            //               .then(() => resolve(this.loadAccount(reload, tries+1)))
            //               .catch((e) => reject(e));
            //         }
            //         console.error(`Giving up. Tried ${tries} times`)
            //         return reject(`Failed to log in after ${tries} attempts.`);
            //     }
            //     log(`Successfully connected. Getting data for ${username}`);
            //     if(res.length < 1) {
            //         console.error(`ERROR: Account ${username} wasn't found.`);
            //         return reject('account not found');
            //     }
            //     var account = res[0];
            //     // load the public keys from the account
            //     var ud = {
            //         ...user_data,
            //         auths: {
            //             owner: account.owner.key_auths[0][0],
            //             active: account.active.key_auths[0][0],
            //             posting: account.posting.key_auths[0][0]
            //         },
            //     };
            //     this.user_data = ud;
            //     return resolve(ud);
            // });
        });
    }

    login(reload=false) {
        /**
         * Checks if an account + active private key match.
         * Resolves with user data they do, rejects if there's a problem
         */
        if(this.wif_valid) {
            return new Promise((resolve) => resolve(this.user_data));
        }
        return new Promise((resolve, reject) => {
            this.loadAccount(reload).then((user_data) => {
                let {username, key_wif, auths} = user_data;
                let keyMatches = this.testAuths(auths, key_wif);

                for (let key of keyMatches) {
                    if (key.key_type !== 'active' && key.key_type !== 'signing') {
                        console.log(`Found '${key.key_type}' key '${key.public_key}' but need active or signing key... skipping.`);
                        continue;
                    }
                    console.log(`Found matching and usable '${key.key_type}' for user private key. Pub key is: ${key.public_key}`);
                    this.keyPair = key;
                    break;
                }
                // this.wif_valid = true;
                // var is_valid = steem.auth.wifIsValid(active_wif, auths.active);
                if((typeof this.keyPair) !== 'undefined' && this.keyPair !== null) {
                    this.wif_valid = true;
                    return resolve(user_data);
                }
                return reject('Private key WIF does not match active or signing key on account');
            }).catch((e) => reject(e));
        });
    }
    publish_feed_set_props(rate, tries=0) {
        var ex_data = `${rate.toFixed(3)} ${config.base_symbol}`;
        var quote = 1;
        if(config.peg) {
            var pcnt = ((1 - config.peg_multi) * 100).toFixed(2);
            log('Pegging is enabled. Reducing price by '+pcnt+'% (set config.peg to false to disable)');
            log('Original price (pre-peg):', ex_data);
            quote = 1 / config.peg_multi;
        }
        
        // For witness_set_properties, we have to pack the exchange rate amounts into low-level Graphene Amount byte structs,
        // and then encode the structs as hexadecimal strings.
        // All this crazy low level struct code is handled by my (Someguy123) lib/packer.js module :)
        var exchangeRate = {
            base: packer.pack_graphene_amount_float(rate.toFixed(3), config.base_symbol), 
            quote: packer.pack_graphene_amount_float(quote.toFixed(3), config.quote_symbol)
        };
        var {username, key_wif, auths} = this.user_data;
        // let witProps = [
        //     [config.properties_key, exchangeRate]
        // ];
        // We glue together the base exchange rate (HBD or SBD amount) hex string with the quote exchange rate (HIVE or STEEM amount),
        // and that gets us our hbd_exchange_rate / sbd_exchange_rate value - both amounts, encoded as hexadecimal Graphene Amount struct's.
        let witProps = [
            [config.properties_key, exchangeRate.base + exchangeRate.quote]
        ];

        // witProps[config.properties_key] = exchangeRate.base + exchangeRate.quote;
        console.log("properties_key:", config.properties_key, "exchangeRate:", exchangeRate);
        console.log("key_wif:", key_wif, "username:", username, "witProps:", witProps);
        return this.chain_lib.broadcast.witnessSetProperties(key_wif, username, [witProps], [], (err, r) => {
            if(err) {
                console.error('Failed to publish feed...');
                var msg = ('message' in err) ? err.message : err;
                console.error('reason:', msg);
                if(tries < retry_conf.feed_attempts) {
                    console.error(`Will retry in ${retry_conf.feed_delay} seconds`);
                    return delay(retry_conf.feed_delay * 1000)
                        .then(() => this.publish_feed(rate, tries+1))
                        .catch(console.error);
                }
                console.error(`Giving up. Tried ${tries} times`);
                return reject(err);                 
            }
            log('Data published at: ', ""+new Date());
            log('Successfully published feed.');
            log(`TXID: ${r.id} TXNUM: ${r.trx_num}`);
        });
    }
    publish_feed(rate, tries=0) {
        try {
            // var tr = new TransactionBuilder();
            var ex_data = `${rate.toFixed(3)} ${config.base_symbol}`;
            var quote = 1;
            if(config.peg) {
                var pcnt = ((1 - config.peg_multi) * 100).toFixed(2);
                log('Pegging is enabled. Reducing price by '+pcnt+'% (set config.peg to false to disable)');
                log('Original price (pre-peg):', ex_data);
                quote = 1 / config.peg_multi;
            }
            
            var exchangeRate = {base: ex_data, quote: `${quote.toFixed(3)} ${config.quote_symbol}`};
            var {username, key_wif, auths} = this.user_data;
            // let witProps = [
            //     [config.properties_key, exchangeRate]
            // ];
            // let witProps = {};
            // witProps[config.properties_key] = exchangeRate;
            // console.log("properties_key:", config.properties_key, "exchangeRate:", exchangeRate);
            // console.log("key_wif:", key_wif, "username:", username, "witProps:", witProps);
            // return this.chain_lib.broadcast.witnessSetProperties(key_wif, username, witProps, 0, (err, r) => {
            //     if(err) {
            //         console.error('Failed to publish feed...');
            //         var msg = ('message' in err) ? err.message : err;
            //         console.error('reason:', msg);
            //         if(tries < retry_conf.feed_attempts) {
            //             console.error(`Will retry in ${retry_conf.feed_delay} seconds`);
            //             return delay(retry_conf.feed_delay * 1000)
            //               .then(() => this.publish_feed(rate, tries+1))
            //               .catch(console.error);
            //         }
            //         console.error(`Giving up. Tried ${tries} times`);
            //         return reject(err);                 
            //     }
            //     log('Data published at: ', ""+new Date());
            //     log('Successfully published feed.');
            //     log(`TXID: ${r.id} TXNUM: ${r.trx_num}`);
            // });

            return this.chain_lib.broadcast.feedPublish(key_wif, username, exchangeRate, 
                (err, r) => {
                    if(err) {
                        console.error('Failed to publish feed...');
                        var msg = ('message' in err) ? err.message : err;
                        console.error('reason:', msg);
                        if(tries < retry_conf.feed_attempts) {
                            console.error(`Will retry in ${retry_conf.feed_delay} seconds`);
                            return delay(retry_conf.feed_delay * 1000)
                              .then(() => this.publish_feed(rate, tries+1))
                              .catch(console.error);
                        }
                        console.error(`Giving up. Tried ${tries} times`);
                        return reject(err);                 
                    }
                    log('Data published at: ', ""+new Date());
                    log('Successfully published feed.');
                    log(`TXID: ${r.id} TXNUM: ${r.trx_num}`);
                });
        } catch(e) {
            console.error(e);
        }
        console.log();
    }
}


module.exports = {
    Blockchain, Account
};
