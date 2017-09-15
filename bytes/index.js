// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
"use strict";

const internal = require('../internal/index.js');

var bytes = {};

class Slice {
  constructor(size) {
    if (typeof size === 'undefined') {
      size = 0;
    }
    internal.isInteger(size);
    this.a = new Array(size);
    this.a.fill(0);
    this.length = this.a.length;
  };

  /**
   * from (array of ints)
   */
  static from(arr) {
    internal.isArray(arr);
    var a = new Slice(arr.length);
    for (var i = 0; i < arr.length; i++) {
      var x = arr[i];
      internal.isInteger(x);
      if (x < 0) {
        throw new Error("val is too low: " + JSON.stringify(x));
      }
      if (x > 255) {
        throw new Error("val is too high: " + JSON.stringify(x));
      }
      a.set(i, x);
    }
    return a;
  }

  static fromString(s) {
    internal.isString(s);
    var buf = Buffer.from(s, 'utf8');
    var a = new Slice(buf.length);
    for (var i = 0; i < buf.length; i++) {
      a.set(i, buf[i]);
    }
    return a;
  };

  set(i, val) {
    internal.areIntegers([i, val]);
    internal.isInRange(val, 0, 255);
    if (i > this.a.length) {
      throw new RangeError("index too large: " + i);
    }
    if (i < 0) {
      throw new RangeError("negative index: " + i);
    }
    this.a[i] = val;
  };

  get(i) {
    internal.isInteger(i);
    if (i > this.a.length) {
      throw new RangeError("index too large: " + i);
    }
    if (i < 0) {
      throw new RangeError("negative index: " + i);
    }
    return this.a[i];
  }

  /**
   * append(Slice, string, [array of integers])
   */
  append(val) {
    if (val instanceof Slice) {
      this.a = this.a.concat(val.a);
      this.length = this.a.length;
      return this;
    }
    if (Array.isArray(val)) {
      for (var i = 0; i < val.length; i++) {
        var x = val[i];
        internal.isInteger(x);
        if (x < 0) {
          throw new Error("val is too low: " + JSON.stringify(x));
        }
        if (x > 255) {
          throw new Error("val is too high: " + JSON.stringify(x));
        }
      }
      this.a = this.a.concat(val);
      this.length = this.a.length;
      return this;
    }
    if (typeof val === 'string') {
      var a2 = Slice.fromString(val);
      this.a = this.a.concat(a2.a);
      this.length = this.a.length;
      return this;
    }
    throw new Error("unknown type: " + JSON.stringify(val));
  };

  toString() {
    var buf = new Buffer(this.a.length);
    for (var i = 0; i < this.a.length; i++) {
      buf[i] = this.a[i];
    }
    return buf.toString('utf8');
  }

  slice() {
    var sl = this.a.slice.apply(this.a, arguments);
    var s = new Slice(sl.length);
    s.a = sl;
    return s;
  }
};

bytes.Slice = Slice;

bytes.copy = function(buf, start, val) {
  if (!(buf instanceof Slice)) {
    throw new Error("copy: buf should be Slice instance"); // todo
  }
  if (typeof val === 'string') {
    var buf2 = Buffer.from(val, 'utf8');
    var i = start;
    for (; i < buf.length && (i - start) < buf2.length; i++) {
      buf.set(i, buf2[i-start]);
    }
    return i - start;
  }
  throw new Error("copy: unknown type: " + JSON.stringify(val));
};

module.exports = bytes;
