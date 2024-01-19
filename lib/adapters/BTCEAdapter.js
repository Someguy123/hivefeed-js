var request = require('request'),
    BaseAdapter = require('./base');

var BTCEAdapter = {
    name: 'BTC-e',
    code: 'btce',
    provides: [
        ['btc','usd'],
        ['btc','eur'],
        ['btc','ltc']
    ],

    has_pair: (from, to) => BaseAdapter.has_pair_ext(from, to, BTCEAdapter.provides),

    get_pair: function(from,to,callback) {
        if(['usd', 'eur', 'gbp', 'rub'].indexOf(to) == -1) {
            // btc-e is backwards for altcoins, so flip the pair!
            var tmp = to;
            to = from;
            from = tmp;
        }

        if (!BTCEAdapter.has_pair(from, to)) {
            return callback(`Pair ${from}/${to} is not supported by this adapter.`, null);
        }

        var pair = [from,to].join('_'),
            ticker_url = `https://btc-e.com/api/2/${pair}/ticker`;
        
        request(ticker_url, function(error,response,body) {
            if(error || response.statusCode != 200) {
                console.error('Invalid response code or server error:',error,response);
                return callback(true,null);
            }
            var ticker_data = JSON.parse(body);
            if(!('ticker' in ticker_data) || !('last' in ticker_data['ticker'])) {
                return callback(true,null);
            }
            return callback(false, ticker_data['ticker']['last']);

        });
    },
}

module.exports = BTCEAdapter;