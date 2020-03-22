
var BaseAdapter = {
    /**
     * Human name for exchange / adapter
     */
    name: 'Base Adapter',
    /**
     * A short, simple, unique "code" for referring to this adapter/exchange.
     * No spaces / uppercase / special characters
     */
    code: 'baseadapter',

    /**
     * The 'provides' list should contain a list of pairs - written as 2-item lists.
     * These should be lowercase and entered in ``['from', 'to']`` format.
     */
    provides: [
        ['fake','btc'],
        ['unreal','eth'],
    ],
    /**
     * Returns ``true`` if the given ``from`` / ``to`` pair is found in ``provides``
     * This method is designed to be called by external methods / functions:
     *      
     *      prov = [['btc', 'ltc'], ['ltc', 'usd']]
     *      BaseAdapter.has_pair_ext('btc', 'ltc', prov)
     *      // true
     *      BaseAdapter.has_pair_ext('btc', 'usd', prov)
     *      // false
     * 
     * @param {string} from 
     * @param {string} to 
     * @param {Array<string>} provides 
     */
    has_pair_ext: function(from, to, provides) {
        from = from.toLowerCase(); to = to.toLowerCase();
        for (var p of provides) {
            if (p[0] == from && p[1] == to) return true;
        }
        return false;
    },

    has_pair: (from, to) => BaseAdapter.has_pair_ext(from, to, BaseAdapter.provides),
    
    /**
     * get_pair - Return the price for a given asset pair
     * In this method, your adapter should attempt to validate the given from/to pair,
     * then query the exchange for the price per coin.
     * 
     * Be warned! Some exchanges do not understand that there's a standard for from/to pairs,
     * for example 'BTC/USD' should be priced in "amount of USD per BTC", while 'USD/BTC' means
     * "amount of BTC per USD".
     * 
     * Many exchanges don't respect this standard, and may have either **all** pairs in the wrong
     * direction, or specific pairs such as USD pairs in the wrong direction.
     * 
     * This function should attempt to correct any pairs which don't follow the standard on the
     * exchange used.
     * 
     * Example (swap from/to for exchanges that have backwards pairs):
     * 
     *      var tmp = to; to = from; from = tmp;
     * 
     * @param {string} from 
     * @param {string} to 
     * @param {Function} callback
     */
    get_pair: function(from,to,callback) {
        if (!BaseAdapter.has_pair(from, to)) {
            return callback(`Pair ${from}/${to} is not supported by this adapter.`, null);
        }
        ticker_data = {
            result: { last: 0.00012321 }
        };

        return callback(false, ticker_data.result.Last);
    }
};

module.exports = BaseAdapter;
