"use strict";

const tables = require('./tables.js');

const tabNum = '\t'.charCodeAt(0);
const spaceNum = ' '.charCodeAt(0);
const vNum = '\v'.charCodeAt(0);
const feedNum = '\f'.charCodeAt(0);
const returnNum = '\r'.charCodeAt(0);
const newlineNum = '\n'.charCodeAt(0);

const a = 'a'.codePointAt(0);
const z = 'z'.codePointAt(0);
const A = 'A'.codePointAt(0);
const Z = 'Z'.codePointAt(0);

var is16 = function(ranges, r) {
  for (var i = 0; i < ranges.length; i++) {
    var range_ = ranges[i];
    var lo = range_[0];
    var hi = range_[1];
    var stride = range_[2];
    if (r < lo) {
      return false;
    }
    if (r <= hi) {
      return ((r-lo)%stride) === 0;
    }
  }
  return false;
};

var is32 = function(ranges, r) {
  for (var i = 0; i < ranges.length; i++) {
    var range_ = ranges[i];
    var lo = range_[0];
    var hi = range_[1];
    var stride = range_[2];
    if (r < lo) {
      return false;
    }
    if (r <= hi) {
      return ((r-lo)%stride) === 0;
    }
  }
  return false;
};

var isExcludingLatin = function(rangeTab, r) {
  var r16 = rangeTab.R16;
  var off = rangeTab.latinOffset;
  if (Array.isArray(r16) && r16.length > off && r <= r16[r16.length-1][1]) {
    return is16(r16.slice(off), r);
  }
  var r32 = rangeTab.R32;
  if (Array.isArray(r32) && r32.length > 0 && r >= r32[0][0]) {
    return is32(r32, r);
  }
  return false;
};

var zero = '0'.codePointAt(0);
var nine = '9'.codePointAt(0);

var unicode = {
  maxLatin1: "\u00ff".codePointAt(0),
  maxAscii: "\u007f".codePointAt(0),
  maxRune: "\udbff\udfff".codePointAt(0),
  replacementChar: "\ufffd".codePointAt(0),
  upperCase: 0,
  lowerCase: 1,
  titleCase: 2,
  maxCase: 3,

  // IsDigit reports whether the rune is a decimal digit.
  isDigit: function(i) {
    if (!Number.isInteger(i) || i < 0 || i > unicode.maxRune) {
      throw new Error("Invalid rune: " + JSON.stringify(i));
    }
    if (i <= unicode.maxLatin1) {
      return zero <= i && i <= nine;
    }
    return isExcludingLatin(tables.Digit, i);
  },

  // IsLetter reports whether the rune is a letter (category L).
  isLetter: function(i) {
    if (!Number.isInteger(i) || i < 0 || i > unicode.maxRune) {
      throw new Error("Invalid rune: " + JSON.stringify(i));
    }
    if (i <= unicode.maxLatin1) {
      return (tables.properties[i]&tables.pLmask) !== 0;
    }
    return isExcludingLatin(tables.Letter, i);
  },

  // IsSpace reports whether the rune is a space character as defined by
  // Unicode's White Space property; in the Latin-1 space this is
  //
  // i should be an integer between 0 and 2^32.
  isSpace: function(i) {
    if (!Number.isInteger(i) || i < 0 || i > unicode.maxRune) {
      throw new Error("Invalid rune: " + JSON.stringify(i));
    }
    if (i <= unicode.maxLatin1) {
      return (i === tabNum || i === spaceNum || i === vNum || i === feedNum ||
        i === returnNum || i === newlineNum || i === 0x85 || i === 0xA0);
    }
    return isExcludingLatin(tables.WhiteSpace, i);
  },

  // IsUpper reports whether the rune is an upper case letter. i should be an
  // integer between 0 and 2^32.
  isUpper: function(i) {
    if (!Number.isInteger(i) || i < 0 || i > unicode.maxRune) {
      throw new Error("Invalid rune: " + JSON.stringify(i));
    }
    if (i <= unicode.maxLatin1) {
      return (tables.properties[i]&tables.pLmask) === tables.pLu;
    }
    return isExcludingLatin(tables.Upper, i);
  },

  // ToLower maps the rune to lower case.
  toLower: function(i) {
    if (!Number.isInteger(i) || i < 0 || i > unicode.maxRune) {
      throw new Error("Invalid rune: " + JSON.stringify(i));
    }
    if (i <= unicode.maxAscii) {
      if (A <= i && i <= Z) { // title case is upper case for ASCII
        i += a - A;
      }
      return i;
    }
    return unicode.to(unicode.lowerCase, i);
  },

  // ToTitle maps the rune to title case.
  toTitle: function(i) {
    if (!Number.isInteger(i) || i < 0 || i > unicode.maxRune) {
      throw new Error("Invalid rune: " + JSON.stringify(i));
    }
    if (i <= unicode.maxAscii) {
      if (a <= i && i <= z) { // title case is upper case for ASCII
        i -= a - A;
      }
      return i;
    }
    return unicode.to(unicode.titleCase, i);
  },

  // ToUpper maps the rune to upper case.
  toUpper: function(i) {
    if (!Number.isInteger(i) || i < 0 || i > unicode.maxRune) {
      throw new Error("Invalid rune: " + JSON.stringify(i));
    }
    if (i <= unicode.maxAscii) {
      if (a <= i && i <= z) { // title case is upper case for ASCII
        i -= a - A;
      }
      return i;
    }
    return unicode.to(unicode.upperCase, i);
  },

  // To maps the rune to the specified case: UpperCase, LowerCase, or TitleCase.
  to: function(_case, i) {
    if (!Number.isInteger(i) || i < 0 || i > unicode.maxRune) {
      throw new Error("Invalid rune: " + JSON.stringify(i));
    }
    if (_case < 0 || unicode.maxCase <= _case) {
      return unicode.replacementChar; // as reasonable an error as any
    }
    // binary search over ranges
    var lo = 0;
    var hi = tables.CaseRanges.length;
    while (lo < hi) {
      var m = lo + Math.floor((hi-lo)/2);
      var cr = tables.CaseRanges[m];
      if (cr[0] <= i && i <= cr[1]) {
        var delta = cr[2][_case];
        if (delta > unicode.maxRune) {
          // In an Upper-Lower sequence, which always starts with
          // an UpperCase letter, the real deltas always look like:
          //	{0, 1, 0}    UpperCase (Lower is next)
          //	{-1, 0, -1}  LowerCase (Upper, Title are previous)
          // The characters at even offsets from the beginning of the
          // sequence are upper case; the ones at odd offsets are lower.
          // The correct mapping can be done by clearing or setting the low
          // bit in the sequence offset.
          // The constants UpperCase and TitleCase are even while LowerCase
          // is odd so we take the low bit from _case.
          // 4294967294 is ^uint32(1), since JS doesn't have &^.
          return cr[0] + ((i-cr[0])& 4294967294 | _case&1);
        }
        return i + delta;
      }
      if (i < cr[0]) {
        hi = m;
      } else {
        lo = m + 1;
      }
    }
    return i;
  },
};

module.exports = unicode;
