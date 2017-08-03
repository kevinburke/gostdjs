"use strict";
// Package strings implements simple functions to manipulate UTF-8 encoded strings.

const unicode = require("../unicode/unicode.js");

// primeRK is the prime base used in Rabin-Karp algorithm.
const primeRK = 16777619;
const maxUint32 = Math.pow(2, 32) - 1;

var asciiSpace = new Array(256);
for (var i = 0; i < 256; i++) {
  var c = String.fromCharCode(i);
  if (c === '\t' || c === '\n' || c === '\v' || c === '\f' || c === '\r' || c === ' ') {
    asciiSpace[i] = 1;
  } else {
    asciiSpace[i] = 0;
  }
}

var isString = function(val) {
  return typeof val === "string" || val instanceof String;
};

var areStrings = function(args) {
  if (!Array.isArray(args)) {
    throw new Error("args should be an array, got " + JSON.stringify(args));
  }
  for (var i = 0; i < args.length; i++) {
    if (!isString(args[i])) {
      throw new Error("not a string: " + JSON.stringify(args[i]));
    }
  }
};

// hashStr returns the hash and the appropriate multiplicative
// factor for use in Rabin-Karp algorithm.
var hashStr = function(sep) {
  areStrings([sep])
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
};

var uint32sub = function(x, y) {
  if (x > y) {
    return x - y;
  }
  return (x - y) + (maxUint32 + 1)
};

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
    areStrings([a, b])
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
    areStrings([s, substr])
    return this.index(s, substr) >= 0;
  },

  // ContainsAny reports whether any Unicode code points in chars are within s.
  containsAny: function(s, chars) {
    areStrings([s, chars])
    return this.indexAny(s, chars) >= 0;
  },

  // Count counts the number of non-overlapping instances of substr in s. If
  // substr is an empty string, Count returns 1 + the number of Unicode code
  // points in s.
  count: function(s, substr) {
    areStrings([s, substr])
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

  // EqualFold reports whether s and t, interpreted as UTF-8 strings, are equal
  // under Unicode case-folding.
  equalFold: function(s, t) {
    areStrings([s, t]);
    s = s.normalize();
    t = t.normalize();
    var cmp = s.localeCompare(t, [], {sensitivity: "base"});
    return cmp === 0;
  },

  // Fields splits the string s around each instance of one or more consecutive
  // white space characters, as defined by unicode.IsSpace, returning an array
  // of substrings of s or an empty list if s contains only white space.
  fields: function(s) {
    areStrings([s]);
    var a = [];
    var i = 0;
    // Skip spaces in the front of the input.
    for (const c of s) {
      var r = c.codePointAt(0);
      if (!unicode.isSpace(r)) {
        break;
      }
      i += c.length;
    }
    if (i === s.length) {
      return []; // every char is white space
    }
    var fieldStart = i;
    while (i < s.length) {
      var c;
      for (const c1 of s.slice(i)) { // super hack
        c = c1;
        break;
      }
      var r = c.codePointAt(0);
      if (!unicode.isSpace(r)) {
        i += c.length;
        continue;
      }
      a.push(s.slice(fieldStart, i))
      i += c.length;

      // Skip spaces in between fields.
      while (i < s.length) {
        var c2;
        for (const c3 of s.slice(i)) { // super hack
          c2 = c3;
          break;
        }
        var r2 = c2.codePointAt(0);
        if (!unicode.isSpace(r2)) {
          break;
        }
        i += c2.length;
      }
      fieldStart = i;
    }
    if (fieldStart < s.length) { // Last field might end at EOF.
      a.push(s.slice(fieldStart));
    }
    return a;
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
