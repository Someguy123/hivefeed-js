var request = require('request');

var BinanceAdapter = {
    name: 'Binance',
    provides: [
        ['btc','usdt'],
        ['steem','btc']
    ],
    get_pair: function(from, to, callback) {
        if(from == 'usd') from = 'usdt';
        if(to == 'usd') to = 'usdt';
        var p_cached_data = cache.get('binance_data');
        if(p_cached_data === null) return BinanceAdapter.load_data(function(err) {
            if(err) return callback(true,null)
            return BinanceAdapter._get_pair(from,to,callback);
        });
        return BinanceAdapter._get_pair(from,to,callback);
    },
    load_data: function(callback) {
        try {
            request('https://api.binance.com/api/v1/ticker/24hr', function(error,response,body) {
                if(error || response.statusCode != 200) {
                    return callback(true,null);
                }
                try {
                    var p_pairs = JSON.parse(body);
                } catch(e) {
                    console.error('Error parsing polo data', e);
                    return callback(true,null);
                }
                // Binance returns a big list of all pairs,
                // so we need to cache the entire list
                // and parse it into key/pair
                var obj_pairs = {}
                for (var pair of p_pairs) {
                    //console.log('symbol is', pair.symbol);
                    // Slice the array to prevent the original being modified
                    for (var supp_pair of BinanceAdapter.provides.slice()) {
                        var from = supp_pair[0];
                        var to = supp_pair[1];
                        // console.log(`[load_data] From: ${from} To: ${to}`)
                        if(from == 'usd') from = 'usdt';
                        if(to == 'usd') to = 'usdt';

                        // Glue something like ['btc','ltc'] into BTCLTC
                        var joinpair = [from,to].join('').toUpperCase();
                        //console.log('supported pair:', joinpair)
                        // if we use this symbol
                        // load it. if not we don't care
                        if (pair.symbol == joinpair) {
                            var obj_key = [from.toUpperCase(),to.toUpperCase()].join('_');
                            //console.log('pair was supported. saving to', obj_key);
                            obj_pairs[obj_key] = {'last': pair.lastPrice, 'avg': pair.weightedAvgPrice};
                            // console.log(obj_pairs);
                        }
                    }
                }
                // console.log('got binance data:', obj_pairs);
                cache.set('binance_data', obj_pairs, 600);
                return callback(false, obj_pairs);
            });
        } catch(e) {
            console.error(e);
        }
    },
    _get_pair: function(from,to,callback) {
        var p_cached_data = cache.get('binance_data');
        var pair = [from.toUpperCase(),to.toUpperCase()].join('_');
        if(!(pair in p_cached_data) || !('last' in p_cached_data[pair])) {
            console.error(`Pair ${pair} or last price not in ticker data (BINANCE)`);
            return callback(true,null)
        }
        return callback(false,p_cached_data[pair]['last']);
    }
}

module.exports = BinanceAdapter;
