var request = require('request'),
    BaseAdapter = require('./base');

var GateIOAdapter = {
    name: 'GateIO',
    code: 'gateio',
    provides: [
        ['hive','usdt']
    ],
    
    has_pair: (from, to) => BaseAdapter.has_pair_ext(from, to, GateIOAdapter.provides),

    get_pair: function(from,to,callback) {
        if (!GateIOAdapter.has_pair(from, to)) {
            return callback(`Pair ${from}/${to} is not supported by this adapter.`, null);
        }
        
        var pair = [from,to].join('_'),
            ticker_url = `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${pair}`;
        request(ticker_url, function(error,response,body) {
            if(error || response.statusCode !== 200) {
                return callback(true,null);
            }
            try {
                let ticker_data = JSON.parse(body);
                if(!ticker_data || ticker_data.length === 0 || !ticker_data[0].last) {
                    return callback(true,null);
                }
                return callback(false, ticker_data[0].last)
            } catch {
                return callback(true, null)
            }
        });
    },
}

module.exports = GateIOAdapter;
