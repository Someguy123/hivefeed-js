/**
 * Graphene struct packer module, written by Someguy123.
 * 
 * Part of github.com/someguy123/steemfeed-js
 * License: GPL v3
 * 
 * `pack_graphene_amount_int` was based on the original struct byte packing code written for the
 * Beem python library by Holger80.
 * 
 * Original python code:
 * 
 *     https://github.com/holgern/beem/commit/6cc303d1b0fdfb096da78d3ff331aaa79a18ad8f#diff-354e396763615f9c086b00d212557e72L76
 * 
 */
var struct = require('@aksel/structjs');

function hex_to_uintarray(hex, bytes=null) {
    if (bytes !== undefined && bytes !== null) {
        hex = hex.substr(0, 2 * parseInt(bytes));
    }
    let hexamt = Buffer.from(hex, 'hex');
    return new Uint8Array(hexamt).buffer;
}

// packs an unsigned integer into a 4 byte Buffer
function pack_int(obj) {
    let sc = struct("<I");
    return Buffer.from(sc.pack(obj));
}

function pack_int_hex(obj) { return pack_int(obj).toString('hex'); }

function unpack_int_hex(hex) {
    // let hexamt = Buffer.from(hex.substr(0, 8), 'hex');
    // let hexarray = new Uint8Array(hexamt).buffer;
    let [unpacked] = struct("<I").unpack(hex_to_uintarray(hex, 4));
    return unpacked;
}

// packs 'obj' like an integer, then just pads it with 4 extra null bytes on the end, making
// it seem like a standard 'long long'
// Close enough to python '<q' used by beem
function pack_long(obj) {
    let int_buf = pack_int(obj);
    let long_hex = pad_null_right(int_buf.toString('hex'), 4);
    return Buffer.from(long_hex, 'hex');
}

function pack_long_hex(obj) { return pack_long(obj).toString('hex'); }
const unpack_long_hex = unpack_int_hex;

function pack_char(obj) {
    let sc = struct("<b");
    return Buffer.from(sc.pack(obj));
}

function pack_char_hex(obj) { return pack_char(obj).toString('hex'); }

function unpack_char_hex(hex, bytes=null) {
    let [unpacked] = struct("<b").unpack(hex_to_uintarray(hex, bytes));
    return unpacked;
}

function pack_string(obj, len=null) {
    if (len === null) { len = obj.length; }
    let sc = struct(`<${len.toString()}s`);
    return Buffer.from(sc.pack(obj));
}

function pack_string_hex(obj, len=null) { return pack_string(obj, len).toString('hex'); }

function unpack_string_hex(hex, bytes=null) {
    if (bytes === null) { bytes = parseInt(hex.length / 2); }
    let [unpacked] = struct(`<${bytes.toString()}s`).unpack(hex_to_uintarray(hex, bytes));
    return unpacked;
}

function pad_null_left(obj, zeroes) {
    obj = obj.toString();
    for(let i = 0; i<zeroes; i++) {
        obj = '00' + obj;
    }
    return obj;
}

function pad_null_right(obj, zeroes) {
    obj = obj.toString();
    for(let i = 0; i<zeroes; i++) {
        obj += '00';
    }
    return obj;
}

// Trim the characters '00' from the end (right) of a string
function unpad_hex_right(obj) {
    obj = obj.toString();
    while(obj.substr(obj.length - 2, 2) === '00') { obj = obj.substr(0, obj.length - 2); }
    return obj;
}

// Trim the characters '00' from the start (left) of a string
function unpad_hex_left(obj) {
    obj = obj.toString();
    while(obj.substr(0, 2) === '00') { obj = obj.substr(2, obj.length); }
    return obj;
}

// Trim the characters '00' from both the start (left) and end (right) of a string
function unpad_hex(obj) { 
    return unpad_hex_left(unpad_hex_right(obj)); 
}

// ruct.pack_graphene_amount_float('0.251', 'SBD');
// fb000000000000000353424400000000
// > ruct.pack_graphene_amount_float('1.00', 'STEEM');
// e80300000000000003535445454d0000
// combined:
// fb000000000000000353424400000000e80300000000000003535445454d0000
// original holger80 property: ( from TX: https://hiveblocks.com/tx/4c5614abb11cec073251e546378e2a546fddc864 )
// fb000000000000000353424400000000e80300000000000003535445454d0000
/**
 * Packs a Graphene amount into a byte struct, returned as a hexadecimal string.
 * 
 * Intended for low level interactions with the Hive/Steem blockchains, and broadcast methods that require amounts
 * to be in byte format, such as witness_set_properties.
 * 
 * @example <caption>Pack the amount `1.234 HIVE` with the default precision of 3 into a hex byte string</caption>
 * pack_graphene_amount_int(1234, 'HIVE')
 * // 'd2040000000000000348495645000000'
 * @param {number} amount The amount of tokens as a precision-exponent integer (decimal_amount x 10^precision)
 * @param {string} symbol The token symbol for this amount
 * @param {number} precision The precision (decimal places) of this token
 * @see pack_graphene_amount_float
 */
function pack_graphene_amount_int(amount, symbol, precision=3) {
    /**
     * Pack a Graphene "Amount" object into a hex encoded struct used by the network, e.g. for witness_set_properties
     * 
     * The parameter `amount` should be the amount of tokens as an integer - precision exponented.
     * 
     * For example, the value `1.23` with precision 3 should be specified as `1230` (1.23 * 10^3)
     * 
     * Packs as follows:
     *     AMOUNT (integer)      - packed as a 4-byte integer due to JS limitations, then padded right up to 8-bytes
     *     PRECISION (character) - packed as a 1-byte "signed character"
     *     SYMBOL (string)       - packed as a 7-byte right padded string
     * 
     *     bytes 1 to 8    (8 bytes)  - AMOUNT
     *     byte  9         (1 byte)   - PRECISION
     *     bytes 10 to 16  (7 bytes)  - SYMBOL
     * 
     */
    let bytes_amount = pack_long_hex(amount),
        bytes_precision = pack_char_hex(precision),
        bytes_symbol = pack_string_hex(symbol, 7);
    
    return bytes_amount + bytes_precision + bytes_symbol;
}

/**
 * Works the same as `pack_graphene_amount_int`, except {@link amount} is expected to be a normal decimal float number
 * or a numeric string, instead of an integer amount tied to the precision.
 * 
 * @example <caption>Pack the amount `1.234 HIVE` with the default precision of 3 into a hex byte string</caption>
 * pack_graphene_amount_float(1.234, 'HIVE')
 * // 'd2040000000000000348495645000000'
 * pack_graphene_amount_float('1.234', 'HIVE')
 * // 'd2040000000000000348495645000000'
 * @param {number|string} amount The amount of tokens as a normal decimal float or string
 * @param {string} symbol The token symbol for this amount
 * @param {number} precision The precision (decimal places) of this token
 * @see pack_graphene_amount_int
 */
function pack_graphene_amount_float(amount, symbol, precision=3) {
    precision = parseInt(precision);
    amount = parseInt((parseFloat(amount) * Math.pow(10, precision)).toFixed(precision));
    return pack_graphene_amount_int(amount, symbol, precision);
}

/**
 * Unpacks a packed Graphene amount from a hex-encoded string, into a dictionary/mapping with
 * the raw integer amount, symbol, precision, along with the human float + fixed string amount
 * determined using the unpacked precision.
 * 
 * @example <caption>Unpacking a hex-encoded packed Graphene amount</caption>
 * unpack_graphene_amount_hex('fb000000000000000353424400000000')
 * // {
 * //  amount: 251,
 * //  precision: 3,
 * //  symbol: 'SBD',
 * //  amount_float: 0.251,
 * //  amount_fixed: '0.251'
 * // }
 * @param {string} hex The packed Graphene amount struct as a hex-encoded bytes string
 * @param {number} bytes (usually no need to change) Trim `hex` down to this many bytes (2 hex chars per byte)
 * @see pack_graphene_amount_float
 * @see pack_graphene_amount_int
 */
function unpack_graphene_amount_hex(hex, bytes=16) {
    hex = hex.substr(0, 2 * parseInt(bytes));
    let res = {
        // The first 8 bytes (16 hex chars) are the amount - as a "long long" 8-byte int
        amount: unpack_long_hex(hex.substr(0, 16)),
        // The byte after 16 (17th + 18th char, but index 16+17 due to zero-indexing) is the precision - a single character.
        precision: parseInt(unpack_char_hex(hex.substr(16, 2))),
        // The final 14 bytes (index 18-31 / char 19-32) is the symbol for the amount, as a 7-byte string.
        // To avoid the null bytes being added to the result, we trim them from both sides with unpad_hex before unpacking.
        symbol: unpack_string_hex(unpad_hex(hex.substr(18, 14))),
    };
    res.amount_float = res.amount / Math.pow(10, res.precision);
    res.amount_fixed = res.amount_float.toFixed(res.precision);
    return res;
}

module.exports = {
    hex_to_uintarray,
    pack_int, pack_int_hex, unpack_int_hex,
    pack_long, pack_long_hex, unpack_long_hex,
    pack_char, pack_char_hex, unpack_char_hex,
    pack_string, pack_string_hex, unpack_string_hex,
    pad_null_left, pad_null_right, unpad_hex_left, unpad_hex_right, unpad_hex,
    pack_graphene_amount_int, pack_graphene_amount_float, unpack_graphene_amount_hex
};


