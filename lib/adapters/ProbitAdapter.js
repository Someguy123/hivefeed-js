var request = require('request'),
    BaseAdapter = require('./base');

var ProbitAdapter = {
    name: 'Probit',
    code: 'probit',
    provides: [
        ['hive','usdt'],
        ['hive','btc']
    ],
    
    has_pair: (from, to) => BaseAdapter.has_pair_ext(from, to, ProbitAdapter.provides),

    get_pair: function(from,to,callback) {
        if (!ProbitAdapter.has_pair(from, to)) {
            return callback(`Pair ${from}/${to} is not supported by this adapter.`, null);
        }
        
        var pair = [from,to].join('-').toUpperCase(),
            ticker_url = `https://api.probit.com/api/exchange/v1/ticker?market_ids=${pair}`;
        request(ticker_url, function(error,response,body) {
            if(error || response.statusCode !== 200) {
                return callback(true,null);
            }
            try {
                let ticker_data = JSON.parse(body);
                if(!ticker_data.data || ticker_data.data.length === 0 || !ticker_data.data[0].last) {
                    return callback(true,null);
                }
                return callback(false, ticker_data.data[0].last)
            } catch {
                return callback(true, null)
            }
        });
    },
}

module.exports = ProbitAdapter;
