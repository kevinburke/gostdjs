"use strict";
// Package strings implements simple functions to manipulate UTF-8 encoded strings.

// primeRK is the prime base used in Rabin-Karp algorithm.
const primeRK = 16777619;
const maxUint32 = Math.pow(2, 32) - 1;

var isString = function(val) {
  return typeof val === "string" || val instanceof String;
}

// hashStr returns the hash and the appropriate multiplicative
// factor for use in Rabin-Karp algorithm.
var hashStr = function(sep) {
  if (!isString(sep)) {
    throw new Error("not a string: " + JSON.stringify(sep));
  }
  var hash = 0;
  for (var i = 0; i < sep.length; i++) {
    hash = uint32mul(hash, primeRK) + sep[i].charCodeAt(0);
  }
  var pow = 1;
  var sq = primeRK;
  for (var i = sep.length; i > 0; i >>= 1) {
    if (i&1 != 0) {
      pow = uint32mul(pow, sq);
    }
    sq = uint32mul(sq, sq);
  }
  return [hash, pow];
}

var highPart = function(x) {
  return toUint32(x / 0x0100000000);
}

var toUint32 = function(x) {
  // the shift operator forces js to perform the internal ToUint32 (see ecmascript spec 9.6)
  return x >>> 0;
}

var uint32mul = function(x, y) {
  var high16 =  ((x & 0xffff0000) >>> 0) * y;
  var low16 = (x & 0x0000ffff) * y;
  // the addition is dangerous, because the result will be rounded, so the result depends on the lowest bits, which will be cut away!
  var carry = (toUint32(high16) + toUint32(low16)) > maxUint32;
  if (carry === true) {
    return ((high16 >>> 0) + (low16 >>> 0)) >>> 0;
  } else {
    return (high16 >>> 0) + (low16 >>> 0);
  }
}

var uint32sub = function(x, y) {
  if (x > y) {
    return x - y;
  }
  return (x - y) + (maxUint32 + 1)
}

module.exports = {
  _uint32mul: uint32mul,

  // Compare returns an integer comparing two strings lexicographically. The
  // result will be 0 if a==b, -1 if a < b, and +1 if a > b. Compare is included
  // only for symmetry with package bytes. It is usually clearer and always
  // faster to use the built-in string comparison operators ==, <, >, and so on.
  //
  // Note compare uses the Javascript notions of string equality, not the Go
  // notions.
  compare: function(a, b) {
    if (!isString(a)) {
      throw new Error("not a string: " + JSON.stringify(a));
    }
    if (!isString(b)) {
      throw new Error("not a string: " + JSON.stringify(b));
    }
    if (a === b) {
      return 0;
    }
    if (a < b) {
      return -1;
    }
    return 1;
  },

  // Contains reports whether substr is within s.
  contains: function(s, substr) {
    if (!isString(s)) {
      throw new Error("not a string: " + JSON.stringify(s));
    }
    if (!isString(substr)) {
      throw new Error("not a string: " + JSON.stringify(substr));
    }
    return this.index(s, substr) >= 0;
  },

  // ContainsAny reports whether any Unicode code points in chars are within s.
  containsAny: function(s, chars) {
    if (!isString(s)) {
      throw new Error("not a string: " + JSON.stringify(s));
    }
    if (!isString(chars)) {
      throw new Error("not a string: " + JSON.stringify(chars));
    }
    return this.indexAny(s, chars) >= 0;
  },

  // Count counts the number of non-overlapping instances of substr in s. If
  // substr is an empty string, Count returns 1 + the number of Unicode code
  // points in s.
  count: function(s, substr) {
    if (!isString(s)) {
      throw new Error("not a string: " + JSON.stringify(s));
    }
    if (!isString(substr)) {
      throw new Error("not a string: " + JSON.stringify(substr));
    }
    if (substr === "") {
      return s.length + 1;
    }
    var n = 0
    while (true) {
      var i = this.index(s, substr);
      if (i === -1) {
        return n;
      }
      n++;
      s = s.slice(i+substr.length);
    }
  },

  // Index returns the index of the first instance of substr in s, or -1 if
  // substr is not present in s.
  index: function(s, substr) {
    if (!isString(s)) {
      throw new Error("not a string: " + JSON.stringify(s));
    }
    if (!isString(substr)) {
      throw new Error("not a string: " + JSON.stringify(substr));
    }
    var n = substr.length;
    if (n === 0) {
      return 0;
    }
    if (n === s.length) {
        if (substr === s) {
          return 0;
        }
        return -1;
    }
    if (n > s.length) {
        return -1;
    }
    // Rabin-Karp search
    var result = hashStr(substr);
    var hashss = result[0], pow = result[1];
    var h = 0;
    for (var i = 0; i < n; i++) {
      h = uint32mul(h, primeRK) + s[i].charCodeAt(0);
    }
    if (h === hashss && s.slice(0, n) === substr) {
      return 0;
    }
    for (var i = n; i < s.length;) {
      h = uint32mul(h, primeRK);
      h += s[i].charCodeAt(0);
      h = uint32sub(h, uint32mul(pow, (s[i-n]).charCodeAt(0)))
      i++;
      if (h === hashss && s.slice(i-n, i) === substr) {
        return i - n;
      }
    }
    return -1
  },

  indexAny: function(s, chars) {
    if (!isString(s)) {
      throw new Error("not a string: " + JSON.stringify(s));
    }
    if (!isString(chars)) {
      throw new Error("not a string: " + JSON.stringify(chars));
    }
    if (chars.length > 0) {
      for (var i = 0; i < s.length; i++) {
        for (var j = 0; j < chars.length; j++) {
          if (s[i] == chars[j]) {
            return i;
          }
        }
      }
    }
    return -1;
  },

  // IndexByte returns the index of the first instance of c in s, or -1 if c is
  // not present in s.
  indexByte: function(s, c) {
    if (!isString(s)) {
      throw new Error("not a string: " + JSON.stringify(s));
    }
    if (!isString(c)) {
      throw new Error("not a string: " + JSON.stringify(c));
    }
    if (c.length !== 1) {
      throw new Error("c has wrong length: " + c.length);
    }
    return this.index(s, c);
  }
};
