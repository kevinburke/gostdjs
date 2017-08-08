"use strict";

const bits = require('./64bitints.js');

var isString = function(val) {
  return typeof val === "string" || val instanceof String;
};

var types = {
  areStrings: function(args) {
    if (!Array.isArray(args)) {
      throw new Error("args should be an array, got " + JSON.stringify(args));
    }
    for (var i = 0; i < args.length; i++) {
      if (!isString(args[i])) {
        throw new Error("not a string: " + JSON.stringify(args[i]));
      }
    }
  },
  areBools: function(args) {
    if (!Array.isArray(args)) {
      throw new Error("args should be an array, got " + JSON.stringify(args));
    }
    for (var i = 0; i < args.length; i++) {
      types.isBool(args[i]);
    }
  },
  areIntegers: function(args) {
    if (!Array.isArray(args)) {
      throw new Error("args should be an array, got " + JSON.stringify(args));
    }
    for (var i = 0; i < args.length; i++) {
      bits.isInteger(args[i]);
    }
  },

  isArray: function(a) {
    if (!Array.isArray(a)) {
      throw new Error("arg should be an array, got " + JSON.stringify(a));
    }
  },

  isBool: function(t) {
    if (t !== false && t !== true) {
      throw new TypeError("not true or false: " + JSON.stringify(t));
    }
  },

  isBuffer: function(buf) {
    if (Buffer.isBuffer(buf) === false) {
      throw new TypeError("not a Buffer: " + JSON.stringify(buf));
    }
  },

  isFunction: function(f) {
    if (typeof f !== 'function') {
      throw new TypeError("f argument must be a function");
    }
  },

  isInt64: function(i) {
    if (bits.Int64.isInt64(i) === false) {
      throw new TypeError("not an int64: " + JSON.stringify(i));
    }
  },

  isUint64: function(i) {
    if (bits.Uint64.isUint64(i) === false) {
      throw new TypeError("not a uint64: " + JSON.stringify(i));
    }
  },

  isInRange: function(i, min, max) {
    bits.isInteger(i);
    bits.isInteger(min);
    bits.isInteger(max);
    if (i < min) {
      throw new Error("val is too low: " + JSON.stringify(i));
    }
    if (i > max) {
      throw new Error("val is too high: " + JSON.stringify(i));
    }
  },

  isString: function(val) {
    if (typeof val !== "string" && ((val instanceof String) === false)) {
      throw new Error("not a string: " + JSON.stringify(val));
    }
  },
};

module.exports = types;
