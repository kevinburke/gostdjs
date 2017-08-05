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
  areStrings([sep]);
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
};

var hashStrRev = function(sep) {
  areStrings([sep]);
  var hash = 0;
  for (var i = sep.length - 1; i >= 0; i--) {
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

var strings = {
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
    return strings.index(s, substr) >= 0;
  },

  // ContainsAny reports whether any Unicode code points in chars are within s.
  containsAny: function(s, chars) {
    areStrings([s, chars])
    return strings.indexAny(s, chars) >= 0;
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
      var i = strings.index(s, substr);
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

  // FieldsFunc splits the string s at each run of Unicode code points c
  // satisfying f(c) and returns an array of slices of s. If all code points
  // in s satisfy f(c) or the string is empty, an empty slice is returned.
  // FieldsFunc makes no guarantees about the order in which it calls f(c). If f
  // does not return consistent results for a given c, FieldsFunc may crash.
  //
  // f will be called with a uint32 and should always return a boolean.
  fieldsFunc: function(s, f) {
    areStrings([s]);
    if (typeof f !== 'function') {
      throw new Error("fieldsFunc must be passed a function")
    }
    // First count the fields.
    var n = 0;
    var inField = false;
    for (const c of s) {
      var wasInField = inField;
      var result = f(c.codePointAt(0));
      if (result !== true && result !== false) {
        throw new Error("fieldsFunc returned non-boolean value " + JSON.stringify(result));
      }
      inField = result === false;
      if (inField && !wasInField) {
        n++;
      }
    }
    // Now create them.
    var a = new Array(n);
    var na = 0;
    var fieldStart = -1; // Set to -1 when looking for start of field.
    var i = 0;
    for (const c of s) {
      var result = f(c.codePointAt(0));
      if (result !== true && result !== false) {
        throw new Error("fieldsFunc returned non-boolean value " + JSON.stringify(result));
      }
      if (result) {
        if (fieldStart >= 0) {
          a[na] = s.slice(fieldStart, i);
          na++;
          fieldStart = -1;
        }
      } else if (fieldStart === -1) {
        fieldStart = i;
      }
      i += c.length;
    }
    if (fieldStart >= 0) { // Last field might end at EOF.
      a[na] = s.slice(fieldStart);
    }
    return a;
  },

  // HasPrefix tests whether the string s begins with prefix.
  hasPrefix: function(s, prefix) {
    areStrings([s, prefix]);
    return s.length >= prefix.length && s.slice(0, prefix.length) === prefix;
  },

  // HasSuffix tests whether the string s ends with suffix.
  hasSuffix: function(s, suffix) {
    areStrings([s, suffix]);
    return s.length >= suffix.length && s.slice(s.length-suffix.length) === suffix;
  },

  // Index returns the index of the first instance of substr in s, or -1 if
  // substr is not present in s.
  index: function(s, substr) {
    areStrings([s, substr]);
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
    return -1;
  },

  // IndexAny returns the index of the first instance of any Unicode code point
  // from chars in s, or -1 if no Unicode code point from chars is present in s.
  indexAny: function(s, chars) {
    if (!isString(s)) {
      throw new Error("not a string: " + JSON.stringify(s));
    }
    if (!isString(chars)) {
      throw new Error("not a string: " + JSON.stringify(chars));
    }
    if (chars.length > 0) {
      var i = 0;
      for (const c of s) {
        for (const d of chars) {
          if (c === d) {
            return i;
          }
        }
        i += c.length;
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
    return strings.index(s, c);
  },

  // IndexFunc returns the index into s of the first Unicode
  // code point satisfying f(c), or -1 if none do.
  //
  // Note due to UTF-16 encoding of strings that this function will return
  // different results than the Go function.
  indexFunc: function(s, f) {
    return strings._indexFunc(s, f, true)
  },

  // indexFunc is the same as IndexFunc except that if
  // truth==false, the sense of the predicate function is
  // inverted.
  _indexFunc: function(s, f, truth) {
    areStrings([s]);
    if (typeof f !== 'function') {
      throw new Error("indexFunc must be passed a function")
    }
    if (truth !== true && truth !== false) {
      throw new Error("indexFunc must be passed a boolean")
    }
    var i = 0;
    for (const c of s) {
      var result = f(c.codePointAt(0));
      if (result !== true && result !== false) {
        throw new Error("indexFunc: result of f must be a boolean")
      }
      if (result === truth) {
        return i;
      }
      i += c.length;
    }
    return -1;
  },

  // IndexRune returns the index of the first instance of the Unicode code point
  // i, or -1 if rune is not present in s.
  //
  // i should be an integer.
  indexRune: function(s, i) {
    areStrings([s]);
    if (!Number.isInteger(i) || i < 0 || i > unicode.maxRune) {
      throw new Error("Invalid rune: " + JSON.stringify(i));
    }
    return strings.index(s, String.fromCharCode(i));
  },

  // Join concatenates the elements of a to create a single string. The
  // separator string sep is placed between elements in the resulting string.
  join: function(a, sep) {
    areStrings([sep]);
    if (Array.isArray(a) === false) {
      throw new Error("join: first argument should be an array, got: " + JSON.stringify(a));
    }
    if (a.length === 0) {
      return "";
    }
    areStrings(a);
    var b = a[0];
    for (var i = 1; i < a.length; i++) {
      b = b.concat(sep);
      b = b.concat(a[i]);
    }
    return b;
  },

  // LastIndex returns the index of the last instance of substr in s, or -1 if
  // substr is not present in s.
  lastIndex: function(s, substr) {
    areStrings([s, substr])
    if (substr.length === 0) {
      return s.length;
    }
    if (substr.length === s.length) {
      if (s === substr) {
        return 0;
      }
      return -1;
    }
    if (substr.length > s.length) {
      return -1;
    }
    var result = hashStrRev(substr);
    var hashss = result[0], pow = result[1];
    var last = s.length - substr.length
    var h = 0;
    for (var i = s.length - 1; i >= last; i--) {
      h = uint32mul(h, primeRK) + s[i].charCodeAt(0);
    }
    if (h === hashss && s.slice(last) === substr) {
      return last;
    }
    for (var i = last - 1; i >= 0; i--) {
      h = uint32mul(h, primeRK);
      h += s[i].charCodeAt(0);
      h = uint32sub(h, uint32mul(pow, s[i+substr.length].charCodeAt(0)));
      if (h === hashss && s.slice(i,i+substr.length) === substr) {
        return i;
      }
    }
    return -1;
  },

  // Repeat returns a new string consisting of count copies of the string s.
  //
  // It throws an error if count is negative or if the result of
  // (len(s) * count) overflows.
  repeat: function(s, count) {
    areStrings([s]);
    if (!Number.isInteger(count)) {
      throw new Error("strings: count not an integer: " + JSON.stringify(count));
    }
    if (count < 0) {
      throw new Error("strings: negative Repeat count")
    }

    // this throws RangeError
    return s.repeat(count);
  }
};

module.exports = strings;
