var request = require('request'),
    BaseAdapter = require('./base');

var HuobiAdapter = {
    name: 'Huobi',
    code: 'huobi',
    provides: [
        ['hive','btc'],
        ['btc', 'usdt']
    ],
    has_pair: (from, to) => BaseAdapter.has_pair_ext(from, to, HuobiAdapter.provides),

    get_pair: function(from,to,callback) {
        if (!HuobiAdapter.has_pair(from, to)) {
            return callback(`Pair ${from}/${to} is not supported by this adapter.`, null);
        }

        to = to.toLowerCase(); from = from.toLowerCase();
        var pair = [from,to].join(''),
            ticker_url = 'https://api.huobi.pro/market/history/trade?symbol='+pair;

        request(ticker_url, function(error,response,body) {
            if(error || response.statusCode != 200) {
                console.error('Invalid response code or server error:',error,response.statusCode);
                return callback(true,null);
            }
            var ticker_data = JSON.parse(body);
            var success = ('status' in ticker_data) && ticker_data.status == 'ok';
            if(!success || !('data' in ticker_data) || ticker_data.data[0].data.length < 1) {
                return callback(true,null);
            }
            return callback(false, ticker_data.data[0].data[0].price);

        });
    },
}

module.exports = HuobiAdapter;
