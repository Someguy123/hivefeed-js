var request = require('request');

var KrakenAdapter = {
    name: 'Kraken',
    provides: [
        ['usdt', 'usd'],
        // ['btc', 'usd']
    ],
    get_pair: function(from,to,callback) {
        if(from == 'btc') from = 'xbt';
        if(to == 'btc') to = 'xbt';

        var pair = [from,to].join('').toUpperCase(),
            ticker_url = 'https://api.kraken.com/0/public/Ticker?pair='+pair;
        request(ticker_url, function(error,response,body) {
            if(error || response.statusCode != 200) {
                console.error('Invalid response code or server error:',error,response.statusCode);
                return callback(true,null);
            }
            var ticker_data = JSON.parse(body);
            var success = ('error' in ticker_data) && ticker_data['error'].length == 0;
            if(!success || !('result' in ticker_data)) {
                dbg_log(`[KrakenAdapter] ERROR - Success: ${success}, Error Length: ${ticker_data['error'].length} 
                         Result in ticker data: ${'result' in ticker_data}`)
                if('error' in ticker_data) console.error(ticker_data['error'])
                return callback(true,null);
            }
            // Kraken returns strange key names on their result, that don't directly match the pair
            // e.g. XBT USD = XXBTZUSD, but USD USDT = USDTZUSD
            // So just get whatever the first key is.
            var result_key = Object.keys(ticker_data['result'])[0]
            // c = last trade closed array(<price>, <lot volume>),
            return callback(false, ticker_data['result'][result_key]['c'][0]);

        });
    },
}

module.exports = KrakenAdapter;
