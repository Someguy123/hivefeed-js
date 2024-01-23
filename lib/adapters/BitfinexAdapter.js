var request = require('request'),
    BaseAdapter = require('./base');

var BitfinexAdapter = {
    name: 'Bitfinex',
    code: 'bitfinex',
    provides: [
        ['usdt','usd'],
        ['btc','usd']
    ],
    
    has_pair: (from, to) => BaseAdapter.has_pair_ext(from, to, BitfinexAdapter.provides),

    get_pair: function(from,to,callback) {
        if (!BitfinexAdapter.has_pair(from, to)) {
            return callback(`Pair ${from}/${to} is not supported by this adapter.`, null);
        }

        if (from === 'usdt')
            from = 'ust'
        
        var pair = [from,to].join('').toUpperCase(),
            ticker_url = `https://api-pub.bitfinex.com/v2/ticker/t${pair}`;
        request(ticker_url, function(error,response,body) {
            if(error || response.statusCode !== 200) {
                return callback(true,null);
            }
            try {
                let ticker_data = JSON.parse(body);
                if(!ticker_data || !ticker_data[6]) {
                    return callback(true,null);
                }
                return callback(false, ticker_data[6])
            } catch {
                return callback(true, null)
            }
        });
    },
}

module.exports = BitfinexAdapter;
