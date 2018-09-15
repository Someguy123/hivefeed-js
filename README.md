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
    "node": "https://steemd.privex.io/",
    "name": "your steem name",
    "wif": "your active private key",
    "interval": 60,
    "peg": false,
    "peg_multi": 1
}
```

- **node** - The URL of the steem node to use.
- **name** - The name of the steem account that will publish the feed
- **wif** - The active private key for the steem account
- **interval** - The number of minutes between publishing the feed
- **peg** - Set to true only if you want to adjust your price feed bias
- **peg_multi** - If "peg" is set to true, then this will change the "quote" to 1 / peg_multi. If you set "peg_multi" to 2 it will show a 100% bias on your feed.
