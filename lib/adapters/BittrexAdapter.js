var request = require('request');

var BittrexAdapter = {
    name: 'Bittrex',
    provides: [
        ['steem','btc'],
        ['sbd','btc'],
        ['btc','usdt'],
        // ['btc','usd'],
        ['usdt','usd'],
        ['ltc','btc']
    ],
    get_pair: function(from,to,callback) {
        // bittrex pairs are all backwards, so flip the pair!
        var tmp = to;
        to = from;
        from = tmp;
        var pair = [from,to].join('-'),
            ticker_url = 'https://bittrex.com/api/v1.1/public/getticker?market='+pair;
        request(ticker_url, function(error,response,body) {
            if(error || response.statusCode != 200) {
                console.error('Invalid response code or server error:',error,response.statusCode);
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
