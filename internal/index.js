// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
const bits = require("./64bitints.js");
const internal = require("./internal.js");
const types = require("./types.js");
const zip = require("./zip.js");

module.exports = {
  // Uint64 represents an unsigned 64 bit integer.
  Uint64: bits.Uint64,
  // Int64 represents a signed 64 bit integer.
  Int64: bits.Int64,

  ULONG_MIN: bits.ULONG_MIN,
  ULONG_MAX: bits.ULONG_MAX,

  LONG_MIN: bits.LONG_MIN,
  LONG_MAX: bits.LONG_MAX,

  DOUBLE_MIN: bits.DOUBLE_MIN,
  DOUBLE_MAX: bits.DOUBLE_MAX,

  UINT32_MIN: bits.UINT32_MIN,
  UINT32_MAX: bits.UINT32_MAX,

  INT32_MIN: bits.INT32_MIN,
  INT32_MAX: bits.INT32_MAX,

  UINT64_MIN: bits.UINT64_MIN,
  UINT64_MAX: bits.UINT64_MAX,

  INT64_MIN: bits.INT64_MIN,
  INT64_MAX: bits.INT64_MAX,

  // deflateFileSync returns a Buffer containing the contents of the file in
  // zipfile with the given name. If no such file exists an error is thrown.
  deflateFileSync: zip.deflateFileSync,

  // deflateFilesSync retuns a map[filename]Buffer of all of the zip files in
  // zipfile.
  deflateFilesSync: zip.deflateFilesSync,

  // areStrings([s1, s2]) throws an error if any of the arguments in the
  // provided array are not strings.
  areStrings: types.areStrings,

  // areBools([b1, b2]) throws an error if any of the arguments in the provided
  // array are not boolean true or false. No "truthy" values are allowed.
  areBools: types.areBools,

  // areIntegers([s1, s2]) throws an error if any of the arguments in the
  // provided array are not integers.
  areIntegers: types.areIntegers,

  // isArray(a) throws an error if the argument is not an array.
  isArray: types.isArray,

  // isBool(a) throws an error if the argument is not a boolean. "Truthy" values
  // like the string "true" are handled as errors.
  isBool: types.isBool,

  // isBuffer(buf) throws an error if Buffer.isBuffer(buf) returns false.
  isBuffer: types.isBuffer,

  // isInteger(a) throws an error if the argument is not an integer.
  isInteger: bits.isInteger,

  // isFunction(a) throws an error if the argument is not a function.
  isFunction: types.isFunction,

  // isInt64(i) throws an error if the argument is not an Int64 object.
  isInt64: types.isInt64,

  // isUint64(i) throws an error if the argument is not an Uint64 object.
  isUint64: types.isUint64,

  // isInRange(i, min, max) throws an error if the argument is not an integer in
  // the given range, or if min and max are not integers.
  isInRange: types.isInRange,

  // isString(val) throws an error if the argument is not a string.
  isString: types.isString,

  // throwSystem throws the provided exception if it's an error raised by
  // Javascript, e.g. a TypeError, otherwise it does nothing.
  throwSystem: internal.throwSystem,
};
