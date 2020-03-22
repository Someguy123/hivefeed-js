var request = require('request'),
    BaseAdapter = require('./base');

var PoloniexAdapter = {
    name: 'Poloniex',
    code: 'poloniex',
    provides: [
        ['btc','usdt'],
        ['steem', 'btc'],
        ['btc','ltc']
    ],

    has_pair: (from, to) => BaseAdapter.has_pair_ext(from, to, PoloniexAdapter.provides),

    get_pair: function(from, to, callback) {
        if (!PoloniexAdapter.has_pair(from, to)) {
            return callback(`Pair ${from}/${to} is not supported by this adapter.`, null);
        }
        // poloniex is backwards, so flip the pair!
        var tmp = to; to = from; from = tmp;

        var p_cached_data = cache.get('poloniex_data');
        if(p_cached_data === null) return PoloniexAdapter.load_data(function(err) {
            if(err) return callback(true,null)
            return PoloniexAdapter._get_pair(from,to,callback);
        });
        return PoloniexAdapter._get_pair(from,to,callback);
    },
    load_data: function(callback) {
        try {
        request('https://poloniex.com/public?command=returnTicker', function(error,response,body) {
            if(error || response.statusCode != 200) {
                return callback(true,null);
            }
            try {
                var p_pairs = JSON.parse(body);
            } catch(e) {
                console.error('Error parsing polo data', e);
                return callback(true,null);
            }
            // Polo returns a big list of all pairs,
            // so we need to cache the entire list
            cache.set('poloniex_data', p_pairs, 600);
            return callback(false, p_pairs);
        });
        } catch(e) {
            console.error(e);
        }
    },
    _get_pair: function(from,to,callback) {
        var p_cached_data = cache.get('poloniex_data');
        var pair = [from.toUpperCase(),to.toUpperCase()].join('_');
        if(!(pair in p_cached_data) || !('last' in p_cached_data[pair])) {
            dbg_log(`Pair ${pair} or last not in ticker data (POLO)`);
            return callback(true,null)
        }
        return callback(false,p_cached_data[pair]['last']);
    }
}

module.exports = PoloniexAdapter;
