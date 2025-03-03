Hive Feed JS
============

This is a Hive Price Feed for witnesses on the [HIVE Network](https://hive.io). It's
written in Node.JS and uses Hive's [Hive-JS](https://www.npmjs.com/package/@hiveio/hive-js).

Recommended Node Version: Node 18

Installation
========

First, download the git repository, then edit `config.json` as needed. The interval is in minutes.

```
git clone https://github.com/Someguy123/hivefeed-js.git
cd hivefeed-js
cp config.example.json config.json
nano config.json
```

I recommend using Docker, however you can also use a locally installed copy of Node v8.11.4 or higher.

**Starting Via Docker**

```sh

# If you don't have docker installed yet, you can easily install it using run.sh
./run.sh install_docker

# (Optional) To save a little time, you can use my binary docker image, instead of having
# to build the container - which takes a few minutes (vs. a few seconds via binary install)
./run.sh install

# Now just start your feed :)
./run.sh start

# Check the logs / status to make sure it's working properly
./run.sh logs       # Check the status with docker logs
./run.sh status     # This will also help you check if it's running or not.

# If you need to force update your feed at any point
./run.sh publish

# Other useful commands:
./run.sh stop       # To stop the hivefeed-js container
./run.sh restart    # To restart the hivefeed-js container (e.g. after config changes)
./run.sh build      # If you don't want to / can't use my binary image, this will force build a new image locally.

```

**Starting Via NodeJS (assuming you have the correct version installed)**

```
npm install
npm start
```

Full explanation for usage with nodejs: https://peakd.com/witness/@rishi556/how-to-setup-hive-witness-pricefeed-using-hivefeed-js

**Easy update with Docker**

To update the dockerised version simply do the following:

```sh
git pull
./run.sh install
./run.sh restart
```

Configuration
===========

```
{
    "name": "your hive name",
    "signing_keys" : {
    "Public Signing Key" : "Private Signing Key"
    },
    "network": "hive",
    "interval": 60,
    "peg": false,
    "peg_multi": 1
}
```

- **name** (REQUIRED) - The name of the hive account that will publish the feed

- **signing_keys** (dictionary - alternative/combo to `wif`) - Witness signing keys as a dictionary `{"pubkey": "privkey", ...}`, can be used as either an alternative to `wif`, or in combination as backup keys

- **node** (default: `https://api.deathwing.me/`) - The HTTP(S) URL of the hive node to use, e.g. `https://api.deathwing.me`

- **interval** (default: `60`) - The number of minutes between publishing the feed

- **network** (default: `hive`) - The network (chain) you're using this for. For using the hive long term testnet, set to `testnet`. Options are: `hive` `testnet`

- **peg** (default: `false`) - Set to true only if you want to adjust your price feed bias

- **peg_multi** (default: `1`) - If "peg" is set to true, then this will change the "quote" to 1 / peg_multi. If you set "peg_multi" to 2 it will show a 100% bias on your feed.


Advanced Configuration Options
==============================

**NOTE:** The settings `ex_symbol`, `ex_compare`, `base_symbol` and `quote_symbol` normally do not need to be adjusted.

Just set the correct `network`, and those settings will be automatically updated to the correct values.

`wif` - Your private active key if you'd use that instead. You can use this in replacement to `signing_keys` or alongside it.

`ex_symbol` - The symbol we're obtaining the price of. Default: `hive`

`ex_compare` - The symbol we're pricing `ex_symbol` with (i.e. the other half of the exchange pair). Default: `usd`

`base_symbol` - The symbol used for the `"base": "0.512 HBD"` part of the feed. Default: `HBD`

`quote_symbol` - The symbol used for the `"quote": "1.000 HIVE"` part of the feed. Default: `HIVE`

`alternate_nodes` - Alternate nodes to use if the main provided one is down. Provided as an array of nodes. Default : `["https://api.hive.blog", "https://api.deathwing.me"]`

`chain_id` - Chain id of the chain that you are using. Default: `beeab0de00000000000000000000000000000000000000000000000000000000`

`address_prefix` -  Address prefix of the chain that you are using. Default: `STM`

`disable_exchanges` - A list of exchange `code` 's to disable. Exchanges listed here will not be used
directly (i.e. get price for A/B), nor indirectly (i.e. get price for A/D by converting A/C then C/D).

Example (disable all exchanges...):

```json
{
    "disable_exchanges": ["bittrex", "poloniex", "kraken", "ionomy", "binance"]
}
```

`exchanges_no_provide` - Disable use of specific coin pairs per exchange, for example, you might want
to temporarily ban the usage of HIVE/BTC from Poloniex.

Example (block HIVE/BTC from poloniex, block BTC/USDT on Kraken):

```json
{
    "exchanges_no_provide": {
        "poloniex": [
            ["hive", "btc"]
        ],
        "kraken": [
            ["btc", "usdt"]
        ]
    },
}
```

`exchanges_provide` - Add new coin pairs to exchanges, allowing the user to inform hivefeed-js of
new pairs supported by a given exchange.

By default, most exchange adapters have the following pairs enabled (if the exchange supports them):

    - BTC/USD
    - BTC/USDT
    - USDT/USD
    - HIVE/BTC
    - HIVE/USD (preferred over HIVE/BTC)

Example (add BTC/DASH, EOS/USD, EOS/BTC to bittrex - add EOS/BTC to kraken):

```json
{
    "exchanges_provide": {
        "bittrex": [
            ["btc","dash"],
            ["eos","usd"],
            ["eos","btc"]
        ],
        "kraken": [
            ["eos", "btc"]
        ]
    }
}
```



