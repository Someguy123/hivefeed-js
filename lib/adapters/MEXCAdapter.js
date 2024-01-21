var request = require('request'),
    BaseAdapter = require('./base');

var MEXCAdapter = {
    name: 'MEXC',
    code: 'mexc',
    provides: [
        ['hive','usdt'],
        ['hive','btc']
    ],
    
    has_pair: (from, to) => BaseAdapter.has_pair_ext(from, to, MEXCAdapter.provides),

    get_pair: function(from,to,callback) {
        if (!MEXCAdapter.has_pair(from, to)) {
            return callback(`Pair ${from}/${to} is not supported by this adapter.`, null);
        }
        
        var pair = [from,to].join('').toUpperCase(),
            ticker_url = `https://api.mexc.com/api/v3/ticker/price?symbol=${pair}`;
        request(ticker_url, function(error,response,body) {
            if(error || response.statusCode !== 200) {
                return callback(true,null);
            }
            try {
                let ticker_data = JSON.parse(body);
                if(!ticker_data.price) {
                    return callback(true,null);
                }
                return callback(false, ticker_data.price)
            } catch {
                return callback(true, null)
            }
        });
    },
}

module.exports = MEXCAdapter;
