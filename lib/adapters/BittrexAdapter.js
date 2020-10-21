var request = require('request'),
    BaseAdapter = require('./base');

var BittrexAdapter = {
    name: 'Bittrex',
    code: 'bittrex',
    provides: [
        ['hive','btc'],
        ['btc','usdt'],
        // ['btc','usd'],
        ['usdt','usd'],
        ['usd','usdt'],
        ['ltc','btc']
    ],
    has_pair: (from, to) => BaseAdapter.has_pair_ext(from, to, BittrexAdapter.provides),

    get_pair: function(from,to,callback) {
        if (!BittrexAdapter.has_pair(from, to)) {
            return callback(`Pair ${from}/${to} is not supported by this adapter.`, null);
        }

        // bittrex pairs are all backwards, so flip the pair!
        var tmp = to; to = from; from = tmp;
        var pair = [from,to].join('-'),
            ticker_url = `https://bittrex.com/api/v1.1/public/getticker?market=${pair}`;

        request(ticker_url, function(error,response,body) {
            if(error || response.statusCode != 200) {
                console.error(`Invalid response code or server error: ${error};Status CodeL ${response.statusCode}`);
                return callback(true,null);
            }
            var ticker_data = JSON.parse(body);
            var success = ('success' in ticker_data) && ticker_data['success'] == true;
            if(!success || !('result' in ticker_data) || !('Last' in ticker_data['result'])) {
                return callback(true,null);
            }
            return callback(false, ticker_data['result']['Last']);

        });
    },
}

module.exports = BittrexAdapter;
