// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
"use strict";
/**
 * Package strings implements simple functions to manipulate UTF-8 encoded strings.
 */

const internal = require("../internal/index.js");
const unicode = require("../unicode/index.js");

var strings;

/**
 * primeRK is the prime base used in Rabin-Karp algorithm.
 */
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

var toUint32 = function(x) {
  /**
   * the shift operator forces js to perform the internal ToUint32 (see ecmascript spec 9.6)
   */
  return x >>> 0;
};

var uint32mul = function(x, y) {
  var high16 =  ((x & 0xffff0000) >>> 0) * y;
  var low16 = (x & 0x0000ffff) * y;
  /**
   * the addition is dangerous, because the result will be rounded, so the result depends on the lowest bits, which will be cut away!
   */
  var carry = (toUint32(high16) + toUint32(low16)) > maxUint32;
  if (carry === true) {
    return ((high16 >>> 0) + (low16 >>> 0)) >>> 0;
  } else {
    return (high16 >>> 0) + (low16 >>> 0);
  }
};

var isString = function(val) {
  return typeof val === "string" || val instanceof String;
};

const zero = '0'.codePointAt(0);
const nine = '9'.codePointAt(0);
const a = 'a'.codePointAt(0);
const z = 'z'.codePointAt(0);
const A = 'A'.codePointAt(0);
const Z = 'Z'.codePointAt(0);

var isSeparator = function(i) {
  /**
   * ASCII alphanumerics and underscore are not separators
   */
  if (i <= 0x7F) {
    if (zero <= i && i <= nine) {
      return false;
    }
    if (a <= i && i <= z) {
      return false;
    }
    if (A <= i && i <= Z) {
      return false;
    }
    if (i === '_'.codePointAt(0)) {
      return false;
    }
    return true;
  }
  /**
   * Letters and digits are not separators
   */
  if (unicode.isLetter(i) || unicode.isDigit(i)) {
    return false;
  }
  /**
   * Otherwise, all we can do for now is treat spaces as separators.
   */
  return unicode.isSpace(i);
};

/**
 * hashStr returns the hash and the appropriate multiplicative
 * factor for use in Rabin-Karp algorithm.
 */
var hashStr = function(sep) {
  internal.areStrings([sep]);
  var hash = 0;
  for (var i = 0; i < sep.length; i++) {
    hash = uint32mul(hash, primeRK) + sep[i].charCodeAt(0);
  }
  var pow = 1;
  var sq = primeRK;
  for (var i = sep.length; i > 0; i >>= 1) {
    if (i&1 !== 0) {
      pow = uint32mul(pow, sq);
    }
    sq = uint32mul(sq, sq);
  }
  return [hash, pow];
};

var hashStrRev = function(sep) {
  internal.areStrings([sep]);
  var hash = 0;
  for (var i = sep.length - 1; i >= 0; i--) {
    hash = uint32mul(hash, primeRK) + sep[i].charCodeAt(0);
  }
  var pow = 1;
  var sq = primeRK;
  for (var i = sep.length; i > 0; i >>= 1) {
    if (i&1 !== 0) {
      pow = uint32mul(pow, sq);
    }
    sq = uint32mul(sq, sq);
  }
  return [hash, pow];
};

var uint32sub = function(x, y) {
  if (x > y) {
    return x - y;
  }
  return (x - y) + (maxUint32 + 1);
};

var makeCutsetFunc = function(cutset) {
  internal.areStrings([cutset]);
  if (cutset.length === 1 && cutset.codePointAt(0) < 0x80) {
    var cp = cutset.codePointAt(0);
    return function(i) { return i === cp; };
  }
  return function(i) {
    var idx = strings.indexRune(cutset, i);
    return idx >= 0;
  };
};

strings = {
  _uint32mul: uint32mul,

  /**
   * Compare returns an integer comparing two strings lexicographically. The
   * result will be 0 if a==b, -1 if a < b, and +1 if a > b. Compare is included
   * only for symmetry with package bytes. It is usually clearer and always
   * faster to use the built-in string comparison operators ==, <, >, and so on.
   *
   * Note compare uses the Javascript notions of string equality, not the Go
   * notions.
   */
  compare: function(a, b) {
    internal.areStrings([a, b]);
    if (a === b) {
      return 0;
    }
    if (a < b) {
      return -1;
    }
    return 1;
  },

  /**
   * Contains reports whether substr is within s.
   */
  contains: function(s, substr) {
    internal.areStrings([s, substr]);
    return strings.index(s, substr) >= 0;
  },

  /**
   * ContainsAny reports whether any Unicode code points in chars are within s.
   */
  containsAny: function(s, chars) {
    internal.areStrings([s, chars]);
    return strings.indexAny(s, chars) >= 0;
  },

  /**
   * Count counts the number of non-overlapping instances of substr in s. If
   * substr is an empty string, Count returns 1 + the number of Unicode code
   * points in s.
   */
  count: function(s, substr) {
    internal.areStrings([s, substr]);
    if (substr === "") {
      return s.length + 1;
    }
    var n = 0;
    while (true) {
      var i = strings.index(s, substr);
      if (i === -1) {
        return n;
      }
      n++;
      s = s.slice(i+substr.length);
    }
  },

  /**
   * EqualFold reports whether s and t, interpreted as UTF-8 strings, are equal
   * under Unicode case-folding.
   */
  equalFold: function(s, t) {
    internal.areStrings([s, t]);
    s = s.normalize();
    t = t.normalize();
    var cmp = s.localeCompare(t, [], {sensitivity: "base"});
    return cmp === 0;
  },

  /**
   * Fields splits the string s around each instance of one or more consecutive
   * white space characters, as defined by unicode.IsSpace, returning an array
   * of substrings of s or an empty list if s contains only white space.
   */
  fields: function(s) {
    internal.areStrings([s]);
    var a = [];
    var i = 0;
    /**
     * Skip spaces in the front of the input.
     */
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
      a.push(s.slice(fieldStart, i));
      i += c.length;

      /**
       * Skip spaces in between fields.
       */
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

  /**
   * FieldsFunc splits the string s at each run of Unicode code points c
   * satisfying f(c) and returns an array of slices of s. If all code points
   * in s satisfy f(c) or the string is empty, an empty slice is returned.
   * FieldsFunc makes no guarantees about the order in which it calls f(c). If f
   * does not return consistent results for a given c, FieldsFunc may crash.
   *
   * f will be called with a uint32 and should always return a boolean.
   */
  fieldsFunc: function(s, f) {
    internal.areStrings([s]);
    internal.isFunction(f);
    /**
     * First count the fields.
     */
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
    /**
     * Now create them.
     */
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

  /**
   * HasPrefix tests whether the string s begins with prefix.
   */
  hasPrefix: function(s, prefix) {
    internal.areStrings([s, prefix]);
    return s.length >= prefix.length && s.slice(0, prefix.length) === prefix;
  },

  /**
   * HasSuffix tests whether the string s ends with suffix.
   */
  hasSuffix: function(s, suffix) {
    internal.areStrings([s, suffix]);
    return s.length >= suffix.length && s.slice(s.length-suffix.length) === suffix;
  },

  /**
   * Index returns the index of the first instance of substr in s, or -1 if
   * substr is not present in s.
   */
  index: function(s, substr) {
    internal.areStrings([s, substr]);
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
    /**
     * Rabin-Karp search
     */
    var result = hashStr(substr);
    var hashss = result[0], pow = result[1];
    var h = 0;
    for (var i = 0; i < n; i++) {
      h = uint32mul(h, primeRK) + s[i].codePointAt(0);
    }
    if (h === hashss && s.slice(0, n) === substr) {
      return 0;
    }
    for (var i = n; i < s.length;) {
      h = uint32mul(h, primeRK);
      h += s[i].codePointAt(0);
      h = uint32sub(h, uint32mul(pow, (s[i-n]).codePointAt(0)));
      i++;
      if (h === hashss && s.slice(i-n, i) === substr) {
        return i - n;
      }
    }
    return -1;
  },

  /**
   * IndexAny returns the index of the first instance of any Unicode code point
   * from chars in s, or -1 if no Unicode code point from chars is present in s.
   */
  indexAny: function(s, chars) {
    internal.areStrings([s, chars]);
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

  /**
   * IndexByte returns the index of the first instance of c in s, or -1 if c is
   * not present in s.
   */
  indexByte: function(s, i) {
    internal.areStrings([s]);
    if (!Number.isInteger(i) || i < 0 || i > 256) {
      throw new Error("Invalid byte: " + JSON.stringify(i));
    }
    return strings.index(s, String.fromCodePoint(i));
  },

  /**
   * IndexFunc returns the index into s of the first Unicode
   * code point satisfying f(c), or -1 if none do.
   *
   * f will be called with an integer value. f must return a boolean value or
   * indexFunc's behavior is undefined.
   *
   * Note due to UTF-16 encoding of strings that this function will return
   * different results than the Go function.
   */
  indexFunc: function(s, f) {
    return strings._indexFunc(s, f, true);
  },

  /**
   * LastIndexFunc returns the index into s of the last
   * Unicode code point satisfying f(c), or -1 if none do.
   *
   * f will be called with an integer value. f must return a boolean value or
   * lastIndexFunc's behavior is undefined.
   *
   * Note due to UTF-16 encoding of strings that this function will return
   * different results than the Go function.
   */
  lastIndexFunc: function(s, f) {
    return strings._lastIndexFunc(s, f, true);
  },


  /**
   * indexFunc is the same as IndexFunc except that if
   * truth==false, the sense of the predicate function is
   * inverted.
   */
  _indexFunc: function(s, f, truth) {
    internal.areStrings([s]);
    internal.isFunction(f);
    internal.isBool(truth);
    var i = 0;
    for (const c of s) {
      var result = f(c.codePointAt(0));
      if (result !== true && result !== false) {
        throw new Error("indexFunc: result of f must be a boolean");
      }
      if (result === truth) {
        return i;
      }
      i += c.length;
    }
    return -1;
  },

  /**
   * lastIndexFunc is the same as LastIndexFunc except that if
   * truth==false, the sense of the predicate function is
   * inverted.
   */
  _lastIndexFunc: function(s, f, truth) {
    internal.areStrings([s]);
    internal.isFunction(f);
    internal.isBool(truth);
    /**
     * once through using the iterator, to get all of the code points.
     */
    var s1 = [];
    for (const c of s) {
      s1.push(c);
    }
    var i = s.length;
    for (var j = s1.length -1; j >= 0; j--) {
      i -= s1[j].length;
      var result = f(s1[j].codePointAt(0));
      if (result !== true && result !== false) {
        throw new Error("lastIndexFunc did not return true or false");
      }
      if (result === truth) {
        return i;
      }
    }
    return -1;
  },

  /**
   * IndexRune returns the index of the first instance of the Unicode code point
   * i, or -1 if rune is not present in s.
   *
   * i should be an integer.
   */
  indexRune: function(s, i) {
    internal.areStrings([s]);
    if (!Number.isInteger(i) || i < 0 || i > unicode.maxRune) {
      throw new Error("Invalid rune: " + JSON.stringify(i));
    }
    return strings.index(s, String.fromCodePoint(i));
  },

  /**
   * Join concatenates the elements of a to create a single string. The
   * separator string sep is placed between elements in the resulting string.
   */
  join: function(a, sep) {
    internal.areStrings([sep]);
    if (Array.isArray(a) === false) {
      throw new Error("join: first argument should be an array, got: " + JSON.stringify(a));
    }
    if (a.length === 0) {
      return "";
    }
    internal.areStrings(a);
    var b = a[0];
    for (var i = 1; i < a.length; i++) {
      b = b.concat(sep);
      b = b.concat(a[i]);
    }
    return b;
  },

  /**
   * LastIndex returns the index of the last instance of substr in s, or -1 if
   * substr is not present in s.
   */
  lastIndex: function(s, substr) {
    internal.areStrings([s, substr]);
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
    var last = s.length - substr.length;
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

  /**
   * LastIndexAny returns the index of the last instance of any Unicode code
   * point from chars in s, or -1 if no Unicode code point from chars is present
   * in s.
   */
  lastIndexAny: function(s, chars) {
    internal.areStrings([s, chars]);
    if (chars.length === 0) {
      return -1;
    }
    /**
     * once through using the iterator, to get all of the code points.
     */
    var s1 = [];
    for (const c of s) {
      s1.push(c);
    }
    var i = s.length;
    for (var j = s1.length-1; j >= 0; j--) {
      i -= s1[j].length;
      for (const c2 of chars) {
        if (s1[j] === c2) {
          return i;
        }
      }
    }
    return -1;
  },

  /**
   * LastIndexByte returns the index of the last instance of c in s, or -1 if c
   * is not present in s.
   *
   * i should be an integer between 0 and 256.
   */
  lastIndexByte: function(s, i) {
    internal.areStrings([s]);
    if (!Number.isInteger(i) || i < 0 || i > 256) {
      throw new Error("Invalid byte: " + JSON.stringify(i));
    }
    return strings.lastIndex(s, String.fromCodePoint(i));
  },

  /**
   * Map returns a copy of the string s with all its characters modified
   * according to the mapping function. If mapping returns a negative value, the
   * character is dropped from the string with no replacement.
   *
   * mapping should take an integer between 0 and unicode.maxRune and return an
   * integer, otherwise the behavior of map is not defined.
   */
  map: function(mapping, s) {
    internal.areStrings([s]);
    internal.isFunction(mapping);
    var s2 = "";
    for (const c of s) {
      var result = mapping(c.codePointAt(0));
      if (!Number.isInteger(result) || result < 0 || result > unicode.maxRune) {
        throw new Error("Invalid rune: " + JSON.stringify(result));
      }
      s2 += String.fromCodePoint(result);
    }
    return s2;
  },

  /**
   * Repeat returns a new string consisting of count copies of the string s.
   *
   * It throws an error if count is negative or if the result of
   * (len(s) * count) overflows.
   */
  repeat: function(s, count) {
    internal.areStrings([s]);
    if (!Number.isInteger(count)) {
      throw new Error("strings: count not an integer: " + JSON.stringify(count));
    }
    if (count < 0) {
      throw new Error("strings: negative Repeat count");
    }

    /**
     * this throws RangeError
     */
    return s.repeat(count);
  },

  /**
   * Replace returns a copy of the string s with the first n
   * non-overlapping instances of old replaced by new.
   * If old is empty, it matches at the beginning of the string
   * and after each UTF-8 sequence, yielding up to k+1 replacements
   * for a k-rune string.
   * If n < 0, there is no limit on the number of replacements.
   */
  replace: function(s, old, new_, n) {
    internal.areStrings([s, old, new_]);
    if (!Number.isInteger(n)) {
      throw new Error("strings: n not an integer: " + JSON.stringify(n));
    }
    if (old === new_ || n === 0) {
      return s; // avoid allocation
    }

    /**
     * Compute number of replacements.
     */
    var m = strings.count(s, old);
    if (m === 0) {
      return s; // avoid allocation
    } else if (n < 0 || m < n) {
      n = m;
    }

    /**
     * Apply replacements to buffer.
     */
    var t = "";
    var w = 0;
    var start = 0;
    for (var i = 0; i < n; i++) {
      var j = start;
      if (old.length === 0) {
        if (i > 0) {
          for (const c in s.slice(start)) {
            j += c.length;
            break;
          }
        }
      } else {
        j += strings.index(s.slice(start), old);
      }
      /**
       * Strings are immutable.
       */
      var slice = s.slice(start, j);
      w += slice.length + new_.length;
      t += slice;
      t += new_;
      start = j + old.length;
    }
    t += s.slice(start);
    return t;
  },

  /**
   * Generic split: splits after each instance of sep,
   * including sepSave bytes of sep in the subarrays.
   */
  _genSplit: function(s, sep, sepSave, n) {
    internal.areStrings([s, sep]);
    if (!Number.isInteger(n)) {
      throw new Error("strings: n not an integer: " + JSON.stringify(n));
    }
    if (!Number.isInteger(sepSave)) {
      throw new Error("strings: n not an integer: " + JSON.stringify(sepSave));
    }
    if (n === 0) {
      return null;
    }
    if (sep === "") {
      return strings._explode(s, n);
    }
    if (n < 0) {
      n = strings.count(s, sep) + 1;
    }

    var a = new Array(n);
    n--;
    var i = 0;
    for (; i < n; ) {
      var m = strings.index(s, sep);
      if (m < 0) {
        break;
      }
      a[i] = s.slice(0, m+sepSave);
      s = s.slice(m+sep.length);
      i++;
    }
    a[i] = s;
    return a.slice(0, i+1);
  },

  _explode: function(s, n) {
    var l = 0;
    for (const c of s) {
      l++;
    }
    if (n < 0 || n > l) {
      n = l;
    }
    var a = new Array(n);
    var i = 0;
    for (const c of s) {
      a[i] = c;
      s = s.slice(c.length);
      i += c.length;
      if (i >= (n -1)) {
        break;
      }
    }
    if (n > 0) {
      a[n-1] = s;
    }
    return a;
  },

  /**
   * Split slices s into all substrings separated by sep and returns a slice of
   * the substrings between those separators.
   *
   * If s does not contain sep and sep is not empty, Split returns a
   * slice of length 1 whose only element is s.
   *
   * If sep is empty, Split splits after each UTF-8 sequence. If both s
   * and sep are empty, Split returns an empty slice.
   *
   * It is equivalent to SplitN with a count of -1.
   */
  split: function(s, sep) {
    internal.areStrings([s, sep]);
    return strings._genSplit(s, sep, 0, -1);
  },


  /**
   * SplitAfter slices s into all substrings after each instance of sep and
   * returns a slice of those substrings.
   *
   * If s does not contain sep and sep is not empty, SplitAfter returns
   * a slice of length 1 whose only element is s.
   *
   * If sep is empty, SplitAfter splits after each UTF-8 sequence. If
   * both s and sep are empty, SplitAfter returns an empty slice.
   *
   * It is equivalent to SplitAfterN with a count of -1.
   */
  splitAfter: function(s, sep) {
    internal.areStrings([s, sep]);
    return strings._genSplit(s, sep, sep.length, -1);
  },

  /**
   * SplitAfterN slices s into substrings after each instance of sep and
   * returns a slice of those substrings.
   *
   * The count determines the number of substrings to return:
   *   n > 0: at most n substrings; the last substring will be the unsplit remainder.
   *   n == 0: the result is nil (zero substrings)
   *   n < 0: all substrings
   *
   * Edge cases for s and sep (for example, empty strings) are handled
   * as described in the documentation for SplitAfter.
   */
  splitAfterN: function(s, sep, n) {
    internal.areStrings([s, sep]);
    return strings._genSplit(s, sep, sep.length, n);
  },

  /**
   * SplitN slices s into substrings separated by sep and returns a slice of
   * the substrings between those separators.
   *
   * The count determines the number of substrings to return:
   *   n > 0: at most n substrings; the last substring will be the unsplit remainder.
   *   n == 0: the result is nil (zero substrings)
   *   n < 0: all substrings
   *
   * Edge cases for s and sep (for example, empty strings) are handled
   * as described in the documentation for Split.
   */
  splitN: function(s, sep, n) {
    internal.areStrings([s, sep]);
    return strings._genSplit(s, sep, 0, n);
  },

  /**
   * Title returns a copy of the string s with all Unicode letters that begin words
   * mapped to their title case.
   */
  title: function(s) {
    internal.areStrings([s]);
    /**
     * Use a closure here to remember state.
     * Hackish but effective. Depends on Map scanning in order and calling
     * the closure once per rune.
     */
    var prev = ' '.codePointAt(0);
    var f = function(r) {
      if (isSeparator(prev)) {
        prev = r;
        return unicode.toTitle(r);
      }
      prev = r;
      return r;
    };
    return strings.map(f, s);
  },

  /**
   * ToLower returns a copy of the string s with all Unicode letters mapped to
   * their lower case.
   */
  toLower: function(s) {
    internal.areStrings([s]);
    return strings.map(unicode.toLower, s);
  },

  /**
   * ToUpper returns a copy of the string s with all Unicode letters mapped to
   * their lower case.
   */
  toUpper: function(s) {
    internal.areStrings([s]);
    return strings.map(unicode.toUpper, s);
  },

  /**
   * ToLowerSpecial returns a copy of the string s with all Unicode letters
   * mapped to their lower case, giving priority to the special casing rules.
   */
  toLowerSpecial: function() {
    throw new Error("unimplemented");
  },

  /**
   * ToUpper returns a copy of the string s with all Unicode letters mapped to
   * their upper case.
   */
  toUpperSpecial: function() {
    throw new Error("unimplemented");
  },

  /**
   * ToTitleSpecial returns a copy of the string s with all Unicode letters
   * mapped to their title case, giving priority to the special casing rules.
   */
  toTitleSpecial: function() {
    throw new Error("unimplemented");
  },

  /**
   * ToTitle returns a copy of the string s with all Unicode letters mapped to
   * their title case.
   */
  toTitle: function(s) {
    internal.areStrings([s]);
    return strings.map(unicode.toTitle, s);
  },

  /**
   * Trim returns a slice of the string s with all leading and trailing Unicode
   * code points contained in cutset removed.
   */
  trim: function(s, cutset) {
    internal.areStrings([s, cutset]);
    if (s === "" || cutset === "") {
      return s;
    }
    return strings.trimFunc(s, makeCutsetFunc(cutset));
  },

  /**
   * TrimLeft returns a slice of the string s with all leading Unicode code
   * points contained in cutset removed.
   */
  trimLeft: function(s, cutset) {
    internal.areStrings([s, cutset]);
    if (s === "" || cutset === "") {
      return s;
    }
    return strings.trimLeftFunc(s, makeCutsetFunc(cutset));
  },

  /**
   * TrimRight returns a slice of the string s, with all trailing
   * Unicode code points contained in cutset removed.
   */
  trimRight: function(s, cutset) {
    internal.areStrings([s, cutset]);
    if (s === "" || cutset === "") {
      return s;
    }
    return strings.trimRightFunc(s, makeCutsetFunc(cutset));
  },

  /**
   * TrimFunc returns a slice of the string s with all leading
   * and trailing Unicode code points c satisfying f(c) removed. f must take an
   * integer argument and return a boolean, otherwise the behavior of this
   * function is not defined.
   */
  trimFunc: function(s, f) {
    internal.areStrings([s]);
    internal.isFunction(f);
    return strings.trimRightFunc(strings.trimLeftFunc(s, f), f);
  },

  /**
   * TrimLeftFunc returns a slice of the string s with all leading
   * Unicode code points c satisfying f(c) removed.
   */
  trimLeftFunc: function(s, f) {
    internal.areStrings([s]);
    internal.isFunction(f);
    var i = strings._indexFunc(s, f, false);
    if (i === -1) {
      return "";
    }
    return s.slice(i);
  },

  /**
   * TrimRightFunc returns a slice of the string s with all trailing
   * Unicode code points c satisfying f(c) removed.
   */
  trimRightFunc: function(s, f) {
    internal.areStrings([s]);
    internal.isFunction(f);
    var i = strings._lastIndexFunc(s, f, false);
    if (i === -1) {
      return "";
    }
    i += s[i].length;
    return s.slice(0, i);
  },

  /**
   * TrimPrefix returns s without the provided leading prefix string.
   * If s doesn't start with prefix, s is returned unchanged.
   */
  trimPrefix: function(s, prefix) {
    internal.areStrings([s, prefix]);
    if (strings.hasPrefix(s, prefix)) {
      return s.slice(prefix.length);
    }
    return s;
  },

  /**
   * TrimSuffix returns s without the provided trailing suffix string.
   * If s doesn't end with suffix, s is returned unchanged.
   */
  trimSuffix: function(s, suffix) {
    internal.areStrings([s, suffix]);
    if (strings.hasSuffix(s, suffix)) {
      return s.slice(0, s.length-suffix.length);
    }
    return s;
  },
};

module.exports = strings;
