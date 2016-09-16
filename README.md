Steem Feed JS
============

This is a STEEM Price Feed for witnesses on the [STEEM Network](https://steem.io). It's
written in Node.JS and uses SVK's [SteemJS-Lib](https://github.com/svk31/steemjs-lib).

Installation
========

First, download the git repository, then edit `config.json` as needed. The interval is in minutes.

```
git clone https://github.com/Someguy123/steemfeed-js.git
cd steemfeed-js
cp config.example.json config.json
nano config.json
```

I recommend using Docker, however you can also use a locally installed copy of Node v6.

**Starting Via Docker**

```
docker build -t steemfeed-js .
docker run -it --rm --name feed steemfeed-js

# Check the status with docker logs
docker logs feed
```

**Starting Via NodeJS (assuming you have v6 installed)**
```
npm install
npm start
```
