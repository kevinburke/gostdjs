"use strict";

const tables = require('./tables.js');

const tabNum = '\t'.charCodeAt(0);
const spaceNum = ' '.charCodeAt(0);
const vNum = '\v'.charCodeAt(0);
const feedNum = '\f'.charCodeAt(0);
const returnNum = '\r'.charCodeAt(0);
const newlineNum = '\n'.charCodeAt(0);

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
};

module.exports = unicode;
