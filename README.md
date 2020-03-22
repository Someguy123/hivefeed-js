Steem Feed JS
============

This is a STEEM Price Feed for witnesses on the [STEEM Network](https://steem.io). It's
written in Node.JS and uses Steemit's [Steem-JS](https://github.com/steemit/steem-js).

Recommended NodeJS version: v8.11.4

Installation
========

First, download the git repository, then edit `config.json` as needed. The interval is in minutes.

```
git clone https://github.com/Someguy123/steemfeed-js.git
cd steemfeed-js
cp config.example.json config.json
nano config.json
```

I recommend using Docker, however you can also use a locally installed copy of Node v8.11.4.

**Starting Via Docker**

```
docker build -t steemfeed-js .
docker run -itd --rm --name steemfeed steemfeed-js

# Check the status with docker logs
docker logs steemfeed
```

**Starting Via NodeJS (assuming you have the correct version installed)**
```
npm install
npm start
```

**Easy update with Docker**

To update the dockerised version simply do the following:

```
git pull
docker build -t steemfeed-js .
docker stop steemfeed
docker rm steemfeed
docker run -itd --name=steemfeed steemfeed-js
######
# You can also use this one-liner for the docker commands
###
docker build -t steemfeed-js .; docker stop steemfeed; docker rm steemfeed; docker run -itd --name=steemfeed steemfeed-js
```

**Crontab**

As NodeJS is somewhat unreliable, it's recommended to use a cron to restart it every 2 hrs.

    crontab -e

For docker you can use the following

```
0 */2   *  *    *    docker restart steemfeed
```

Configuration
===========
```
{
    "name": "your steem/hive name",
    "wif": "your active private key",
    "network": "steem",
    "interval": 60,
    "peg": false,
    "peg_multi": 1
}
```

- **name** (REQUIRED) - The name of the steem account that will publish the feed

- **wif** (REQUIRED) - The active private key for the steem account

- **node** (default: `https://api.steemit.com`) - The HTTP(S) URL of the steem node to use, e.g. `https://steemd.privex.io`

- **interval** (default: `60`) - The number of minutes between publishing the feed

- **network** (default: `steem`) - The network (chain) you're using this for. Options are: `steem` and `hive`

- **peg** (default: `false`) - Set to true only if you want to adjust your price feed bias

- **peg_multi** (default: `1`) - If "peg" is set to true, then this will change the "quote" to 1 / peg_multi. If you set "peg_multi" to 2 it will show a 100% bias on your feed.


Advanced Configuration Options
==============================

**NOTE:** The settings `ex_symbol`, `ex_compare`, `base_symbol` and `quote_symbol` normally do not need to be adjusted.

Just set the correct `network`, and those settings will be automatically updated to the correct values.


`ex_symbol` - The symbol we're obtaining the price of. Default: `steem`

`ex_compare` - The symbol we're pricing `ex_symbol` with (i.e. the other half of the exchange pair). Default: `usd`

`base_symbol` - The symbol used for the `"base": "0.512 SBD"` part of the feed. Default: `SBD`

`quote_symbol` - The symbol used for the `"quote": "1.000 STEEM"` part of the feed. Default: `STEEM`


`disable_exchanges` - A list of exchange `code` 's to disable. Exchanges listed here will not be used
directly (i.e. get price for A/B), nor indirectly (i.e. get price for A/D by converting A/C then C/D).

Example (disable all exchanges...):

```json
{
    "disable_exchanges": ["bittrex", "poloniex", "kraken", "ionomy", "binance"]
}
```

`exchanges_no_provide` - Disable use of specific coin pairs per exchange, for example, you might want
to temporarily ban the usage of STEEM/BTC from Poloniex.

Example (block STEEM/BTC from poloniex, block BTC/USDT on Kraken):

```json
{
    "exchanges_no_provide": {
        "poloniex": [
            ["steem", "btc"]
        ],
        "kraken": [
            ["btc", "usdt"]
        ]
    },
}
```

`exchanges_provide` - Add new coin pairs to exchanges, allowing the user to inform steemfeed-js of
new pairs supported by a given exchange.

By default, most exchange adapters have the following pairs enabled (if the exchange supports them):

    - BTC/USD
    - BTC/USDT
    - USDT/USD
    - STEEM/BTC
    - HIVE/BTC
    - STEEM/USD (preferred over STEEM/BTC)
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



