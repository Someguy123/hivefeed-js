
// Memory Cache
var cache_data = {}

var cache = {
    /**
     * cache.set
     * @param key - Cache key
     * @param value - Value to put into key
     * @param timeout - Expire time in seconds from now, i.e. 600 = 10 mins
     */
    set: function(key,value,timeout) {
        var cvalue = {value:value, expires: now()+parseInt(timeout)};
        cache_data[key] = cvalue;
    },
    /**
     * cache.get
     * @param key - Cache key
     * @returns Value of the key, or null if not found/expired
     */
    get: function(key) {
        if(!(key in cache_data)) {
            return null;
        }
        var data = cache_data[key];

        if(data['expires'] < now()) 
            return null;
        
        return data['value']; 
    },
    get_or_set: function(key,value,timeout,callback) {
        var data = cache.get(key);
        if(data === null) {
            // If the key isn't found/expired
            // Run the callback to get the data
            data = callback();
            cache.set(key,data,timeout);
        }
        return data;
    }
}

module.exports = cache;