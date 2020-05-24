var request = require('request'),
    BaseAdapter = require('./base');

var IonomyAdapter = {
    name: 'Ionomy',
    code: 'ionomy',
    provides: [
        ['hive','btc'],
        ['steem','btc'],
    ],
    
    has_pair: (from, to) => BaseAdapter.has_pair_ext(from, to, IonomyAdapter.provides),

    get_pair: function(from,to,callback) {
        if (!IonomyAdapter.has_pair(from, to)) {
            return callback(`Pair ${from}/${to} is not supported by this adapter.`, null);
        }
        // Ionomy pairs are all backwards, so flip the pair!
        var tmp = to; to = from; from = tmp;
        
        var pair = [from,to].join('-'),
            ticker_url = `https://ionomy.com/api/v1/public/market-summary?market=${pair}`;
        request(ticker_url, function(error,response,body) {
            if(error || response.statusCode != 200) {
                console.error('Invalid response code or server error:',error,response.statusCode);
                return callback(true,null);
            }
            var ticker_data = JSON.parse(body);
            var success = ('success' in ticker_data) && ticker_data['success'] == true;
            if(!success || !('data' in ticker_data) || !('price' in ticker_data['data'])) {
                return callback(true,null);
            }
            return callback(false, ticker_data['data']['price']);

        });
    },
}

module.exports = IonomyAdapter;
