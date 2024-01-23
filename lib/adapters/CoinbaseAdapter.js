var request = require('request'),
    BaseAdapter = require('./base');

var CoinbaseAdapter = {
    name: 'Coinbase',
    code: 'coinbase',
    provides: [
        ['usdt','usd'],
        ['btc','usd']
    ],
    
    has_pair: (from, to) => BaseAdapter.has_pair_ext(from, to, CoinbaseAdapter.provides),

    get_pair: function(from,to,callback) {
        if (!CoinbaseAdapter.has_pair(from, to)) {
            return callback(`Pair ${from}/${to} is not supported by this adapter.`, null);
        }
        
        var pair = [from,to].join('-').toUpperCase(),
            ticker_url = `https://api.exchange.coinbase.com/products/${pair}/ticker`;
        request(ticker_url, function(error,response,body) {
            if(error || response.statusCode !== 200) {
                return callback(true,null);
            }
            try {
                let ticker_data = JSON.parse(body);
                if(!ticker_data || !ticker_data.price) {
                    return callback(true,null);
                }
                return callback(false, ticker_data.price)
            } catch {
                return callback(true, null)
            }
        });
    },
}

module.exports = CoinbaseAdapter;
