// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.

/// TODO: I'm not very happy that the entire contents of the source code must be
/// present in this one file, but I have not been able to find a satisfactory
/// solution that fits with the provided import rules.
///
/// I'm also not very happy about the comment replacer replacing in-function
/// comments, but the parser would have to get a lot more complicated to detect
/// comments-in-functions and the number of braces etc.
/// For the moment the hack is to use three slashes.
"use strict";
const bytes = require("../bytes/index.js");
const internal = require("../internal/index.js");

const constants = require("./constants.js");
const location = require("./location.js");

const Uint64 = internal.Uint64;
const Int64 = internal.Int64;

var ord = function(s) {
  internal.isString(s);
  return s.charCodeAt(0);
};

const zero = ord('0');
var a = ord('a');
var A = ord('A');
var z = ord('z');
var time = {};

/**
 * fmtFrac formats the fraction of v/10**prec (e.g., ".12345") into the
 * buf ending at w, omitting trailing zeros. it omits the decimal
 * point too when the fraction is 0. It returns the index where the
 * output bytes begin and the value v/10**prec.
 *
 * @private
 */
var fmtFrac = function(buf, w, v, prec) {
  internal.isUint64(v);
  internal.isInteger(prec);
  /// Omit trailing zeros up to and including decimal point.
  var print = false;
  for (var i = 0; i < prec; i++) {
    var digit = v.modn(10);
    print = print || (digit.eqn(0) === false);
    if (print) {
      w--;
      var d = ord(digit.toString());
      buf.set(w, d);
    }
    v = v.divn(10);
  }
  if (print) {
    w--;
    buf.set(w, ord('.'));
  }
  return [w, v];
};

/**
 * fmtInt formats v into buf starting at w and working toward the beginning.
 * It returns the index where the output begins.
 *
 * @private
 */
var fmtInt = function(buf, w, v) {
  internal.isUint64(v);
  if (v.eqn(0)) {
    w--;
    buf.set(w, zero);
  } else {
    while (v.gtn(0)) {
      w--;
      buf.set(w, ord(v.modn(10).toString()));
      v = v.divn(10);
    }
  }
  return w;
};

var formatNano = function(buf, nanosec, n, trim) {
  internal.isUint64(nanosec);
  internal.isInteger(n);
  internal.isBool(trim);
  var u = nanosec.clone();
  var buf2 = new bytes.Slice(9);
  for (var start = buf2.length; start > 0; ) {
    start--;
    buf2.set(start, u.modn(10).toNumber() + zero);
    u = u.divn(10);
  }

  if (n > 9) {
    n = 9;
  }
  if (trim) {
    while (n > 0 && buf2.get(n-1) === zero) {
      n--;
    }
    if (n === 0) {
      return buf;
    }
  }
  buf = buf.append([ord('.')]);
  return buf.append(buf2.slice(0, n));
};

var Nanosecond;
var sixty;
var thousand;
var Microsecond;
var Millisecond;
var Second;
var Minute;
var Hour;

/**
 * A Duration represents the elapsed time between two instants
 * as an int64 nanosecond count. The representation limits the
 * largest representable duration to approximately 290 years.
 *
 * @class
 * @example
 * var t0 = time.now();
 * expensiveCall();
 * var t1 = time.now();
 * console.log("The call took ", t1.sub(t0).toString(), "to run.");
 */
class Duration {
  constructor(u64) {
    this.d = Int64.from(u64);
  };

  mul(u64) {
    if (u64 instanceof Duration) {
      return new Duration(this.d.mul(u64.d));
    }
    return new Duration(this.d.mul(u64));
  };

  /**
   *
   */
  muln(num) {
    return new Duration(this.d.muln(num));
  };

  add(dur) {
    if (dur instanceof Duration) {
      return new Duration(this.d.add(dur.d));
    }
    return new Duration(this.d.add(dur));
  };

  sub(dur) {
    if (dur instanceof Duration) {
      return new Duration(this.d.sub(dur.d));
    }
    return new Duration(this.d.sub(dur));
  };

  mod(dur) {
    if (dur instanceof Duration) {
      return new Duration(this.d.mod(dur.d));
    }
    return new Duration(this.d.mod(dur));
  };

  /**
   * Returns true if num is less than the duration. Num should be an integer.
   */
  ltn(num) {
    internal.isInteger(num);
    return this.d.ltn(num);
  }

  /**
   * Returns true if num is less than or equal to the duration. Num should be an
   * integer.
   */
  lten(num) {
    internal.isInteger(num);
    return this.d.lten(num);
  }

  gtn(num) {
    internal.isInteger(num);
    return this.d.gtn(num);
  }

  /**
   * String returns a string representing the duration in the form "72h3m0.5s".
   * Leading zero units are omitted. As a special case, durations less than one
   * second format use a smaller unit (milli-, micro-, or nanoseconds) to ensure
   * that the leading digit is non-zero. The zero duration formats as 0s.
   */
  toString() {
    /// Largest time is 2540400h10m10.000000000s
    var buf = new bytes.Slice(32);
    var w = buf.length;

    var u = this.d.clone().toUnsigned();
    var neg = this.d.ltn(0);
    if (neg) {
      u = u.muln(-1);
    }

    if (u.lt(Second.d.toUnsigned())) {
      /// Special case: if duration is smaller than a second,
      /// use smaller units, like 1.2ms
      var prec = 0;
      w--;
      buf.set(w, ord('s'));
      w--;
      if (u.eqn(0)) {
        return "0s";
      }
      if (u.lt(Microsecond.d.toUnsigned())) {
        /// print nanoseconds
        prec = 0;
        buf.set(w, ord('n'));
      } else if (u.lt(Millisecond.d.toUnsigned())) {
        /// print microseconds
        prec = 3;
        /// U+00B5 'µ' micro sign == 0xC2 0xB5
        w--; // Need room for two bytes.
        bytes.copy(buf, w, "µ");
      } else {
        /// print milliseconds
        prec = 6;
        buf.set(w, ord('m'));
      }
      var fracResults = fmtFrac(buf, w, u, prec);
      w = fracResults[0], u = fracResults[1];
      w = fmtInt(buf, w, u);
    } else {
      w--;
      buf.set(w, ord('s'));

      var fracResults = fmtFrac(buf, w, u, 9);
      w = fracResults[0], u = fracResults[1];

      /// u is now integer seconds
      w = fmtInt(buf, w, u.modn(60));
      u = u.divn(60);

      /// u is now integer minutes
      if (u.gtn(0)) {
        w--;
        buf.set(w, ord('m'));
        w = fmtInt(buf, w, u.modn(60));
        u = u.divn(60);

        /// u is now integer hours
        /// Stop at hours because days can be different lengths.
        if (u.gtn(0)) {
          w--;
          buf.set(w, ord('h'));
          w = fmtInt(buf, w, u);
        }
      }
    }

    if (neg) {
      w--;
      buf.set(w, ord('-'));
    }

    return buf.slice(w).toString();
  };

  _clone() {
    return new Duration(this.d);
  };

  /**
   * Truncate returns the result of rounding d toward zero to a multiple of m.
   * If m <= 0, Truncate returns d unchanged.
   */
  truncate(m) {
    if ((m instanceof Duration) === false) {
      throw new Error("truncate should operate on a Duration");
    }
    var d = this._clone();
    if (m.lten(0)) {
      return d;
    }
    return d.sub(d.mod(m));
  };

  equal(d2) {
    if (d2 instanceof Duration) {
      return this.d.eq(d2.d);
    }
    throw new Error("cannot compare a Duration to a non-duration");
  };
};

Nanosecond = new Duration(1);
sixty = new Duration(60);
thousand = new Duration(1000);
Microsecond = Nanosecond.mul(thousand);
Millisecond = Microsecond.mul(thousand);
Second = Millisecond.mul(thousand);
Minute = Second.mul(sixty);
Hour = Minute.mul(sixty);

var minDuration = new Duration(internal.Int64.from(-1).shln(63));
var maxDuration = new Duration(internal.Int64.from(1).shln(63).subn(1));

/**
 * _daysBefore[m] counts the number of days in a non-leap year
 * before month m begins. There is an entry for m=12, counting
 * the number of days before January of next year (365).
 *
 * @private
 */
var _daysBefore = [
  0,
  31,
  31 + 28,
  31 + 28 + 31,
  31 + 28 + 31 + 30,
  31 + 28 + 31 + 30 + 31,
  31 + 28 + 31 + 30 + 31 + 30,
  31 + 28 + 31 + 30 + 31 + 30 + 31,
  31 + 28 + 31 + 30 + 31 + 30 + 31 + 31,
  31 + 28 + 31 + 30 + 31 + 30 + 31 + 31 + 30,
  31 + 28 + 31 + 30 + 31 + 30 + 31 + 31 + 30 + 31,
  31 + 28 + 31 + 30 + 31 + 30 + 31 + 31 + 30 + 31 + 30,
  31 + 28 + 31 + 30 + 31 + 30 + 31 + 31 + 30 + 31 + 30 + 31,
];

var months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

var January, December;

/**
 * A Month specifies a month of the year (January = 1, ...). Compare Month
 * objects using a.month === b.month or a.equal(b);
 *
 * @class
 * @param {integer} m Month (1-indexed month)
 */
class Month {
  constructor(i) {
    internal.isInteger(i);
    this.month = i;
  };

  /**
   * Equal returns true if the current month and b are equal.
   *
   * @param {integer} b Month Month object.
   */
  equal(b) {
    if (b instanceof Month === false) {
      throw new Error("not comparing to a month object: " + JSON.stringify(b));
    }
    return this.month === b.month;
  };

  /**
   * toString returns a string for the given Month ("February")
   */
  toString() {
    var m = this.month;
    if (January.month <= m && m <= December.month) {
      return months[m-1];
    }
    var buf = new bytes.Slice(20);
    var n = fmtInt(buf, buf.length, Uint64.from(m));
    return "%!Month(" + buf.slice(n) + ")";
  };
};

January = new Month(1);
const February = new Month(2);
const March = new Month(3);
const April = new Month(4);
const May = new Month(5);
const June = new Month(6);
const July = new Month(7);
const August = new Month(8);
const September = new Month(9);
const October = new Month(10);
const November = new Month(11);
December = new Month(12);


var isLeap = function(year) {
  internal.isInteger(year);
  return (year%4) === 0 && ((year%100) !== 0 || (year%400) === 0);
};

/**
 * absDate is like date but operates on an absolute time. yday === day of year
 * returns [year, Month, day, yday];
 *
 * @private
 */
var absDate = function(abs, full) {
  internal.isBool(full);
  internal.isUint64(abs);
  var d = abs.div(constants.secondsPerDay.toUnsigned());

  /// Account for 400 year cycles.
  var n = d.div(constants.daysPer400Years.toUnsigned());
  var y = n.muln(400);
  d = d.sub((constants.daysPer400Years.toUnsigned()).mul(n));

  /// Cut off 100-year cycles.
  /// The last cycle has one extra leap year, so on the last day
  /// of that year, day / constants.daysPer100Years will be 4 instead of 3.
  /// Cut it back down to 3 by subtracting n>>2.
  n = d.div(constants.daysPer100Years.toUnsigned());
  n = n.sub(n.shrn(2));
  y = y.add(n.muln(100));
  d = d.sub(constants.daysPer100Years.toUnsigned().mul(n));

  /// Cut off 4-year cycles.
  /// The last cycle has a missing leap year, which does not
  /// affect the computation.
  n = d.div(constants.daysPer4Years.toUnsigned());
  y = y.add(n.muln(4));
  d = d.sub(constants.daysPer4Years.toUnsigned().mul(n));

  /// Cut off years within a 4-year cycle.
  /// The last year is a leap year, so on the last day of that year,
  /// day / 365 will be 4 instead of 3. Cut it back down to 3
  /// by subtracting n>>2.
  n = d.divn(365);
  n = n.sub(n.shrn(2));
  y = y.add(n);
  d = d.sub(n.muln(365));

  var year = y.toSigned().add(constants.absoluteZeroYear);
  var yday = d.toSigned();
  if (full === false) {
    return [year, 0, 0, yday.toNumber()];
  }

  var day = yday.clone();
  if (isLeap(year.toNumber())) {
    /// Leap year
    if (day.gtn(31+29-1)) {
      /// After leap day; pretend it wasn't there.
      day = day.subn(1);
    } else if (day.eqn(31+29-1)) {
      return [year, February, 29, yday.toNumber()];
    }
  }
  /// Estimate month on assumption that every month has 31 days.
  /// The estimate may be too low by at most one month, so adjust.
  var month = new Month(day.divn(31).toNumber());
  var end = _daysBefore[month.month+1];
  var begin;
  if (day.gten(end)) {
    month.month++;
    begin = end;
  } else {
    begin = _daysBefore[month.month];
  }
  month.month++; // because January is 1
  day = day.subn(begin).addn(1);
  return [year, month, day.toNumber(), yday.toNumber()];
};

class clockResult {
  constructor(hour, min, sec) {
    internal.areIntegers([hour, min, sec]);
    this.hour = hour;
    this.min = min;
    this.sec = sec;
  };
};

/// absClock is like clock but operates on an absolute time.
/// returns a clockResult {hour, min, sec}, all integers.
var absClock = function(abs) {
  internal.isUint64(abs);
  var isec = abs.mod(constants.secondsPerDay.toUnsigned()).toSigned();
  var hour = isec.div(constants.secondsPerHour).toNumber();
  isec = isec.sub(constants.secondsPerHour.muln(hour));
  var min = isec.div(constants.secondsPerMinute).toNumber();
  isec = isec.sub(constants.secondsPerMinute.muln(min));
  return new clockResult(hour, min, isec.toNumber());
};

class dateResult {
  constructor(year, month, day) {
    internal.areIntegers([year, day]);
    if ((month instanceof Month) === false) {
      throw new Error("month not a Month object: " + JSON.stringify(month));
    }
    this.year = year;
    this.month = month;
    this.day = day;
  };
};

class zoneResult {
  constructor(name, offset) {
    internal.isString(name);
    internal.isInteger(offset);
    this.name = name;
    this.offset = offset;
  };
};

class weekResult {
  constructor(year, week) {
    internal.areIntegers([year, week]);
    this.year = year;
    this.week = week;
  };
};

/**
 * appendInt appends the decimal form of x to b and returns the result.
 * If the decimal form (excluding sign) is shorter than width, the result is padded with leading 0's.
 * Duplicates functionality in strconv, but avoids dependency.
 *
 * @private
 */
var appendInt = function(buf, x, width) {
  internal.areIntegers([x, width]);
  if ((buf instanceof bytes.Slice) === false) {
    throw new Error("buf not a bytes.Slice instance: " + JSON.stringify(buf));
  }
  var u = Uint64.from(x);
  if (x < 0) {
    buf = buf.append([ord('-')]);
    u = Uint64.from(-x);
  }

  /// Assemble decimal in reverse order.
  var buf2 = new bytes.Slice(20);
  var i = 20;
  while (u.gtn(10)) {
    i--;
    var q = u.divn(10);
    buf2.set(i, u.sub(q.muln(10)).toNumber() + zero);
    u = q;
  }
  i--;
  buf2.set(i, u.toNumber() + zero);

  /// Add 0-padding.
  var w = buf2.length - i;
  for (; w < width; w++) {
  }
  var buf3 = new bytes.Slice(w - (buf2.length - i));
  for (var j = 0; j < buf3.length; j++) {
    buf3.set(j, zero);
  }
  buf = buf.append(buf3);

  return buf.append(buf2.slice(i));
};

/// used by isoWeek
const Mon = 0;
const Tue = 1;
const Wed = 2;
const Thu = 3;
const Fri = 4;
const Sat = 5;
const Sun = 6;


var daysIn = function(m, year) {
  if (m.equal(February) && isLeap(year)) {
    return 29;
  }
  return _daysBefore[m] - _daysBefore[m-1];
};

time.Nanosecond = Nanosecond;
time.Microsecond = Microsecond;
time.Millisecond = Millisecond;
time.Second = Second;
time.Minute = Minute;
time.Hour = Hour;
time.Duration = Duration;

time.ANSIC = "Mon Jan _2 15:04:05 2006";
time.UnixDate = "Mon Jan _2 15:04:05 MST 2006";
time.RubyDate = "Mon Jan 02 15:04:05 -0700 2006";
time.RFC822 = "02 Jan 06 15:04 MST";
time.RFC822Z = "02 Jan 06 15:04 -0700"; // RFC822 with numeric zone
time.RFC850 = "Monday, 02-Jan-06 15:04:05 MST";
time.RFC1123 = "Mon, 02 Jan 2006 15:04:05 MST";
time.RFC1123Z = "Mon, 02 Jan 2006 15:04:05 -0700"; // RFC1123 with numeric zone
time.RFC3339 = "2006-01-02T15:04:05Z07:00";
time.RFC3339Nano = "2006-01-02T15:04:05.999999999Z07:00";
time.Kitchen = "3:04PM";
/**
 * Handy time stamps.
 */
time.Stamp = "Jan _2 15:04:05";
time.StampMilli = "Jan _2 15:04:05.000";
time.StampMicro = "Jan _2 15:04:05.000000";
time.StampNano = "Jan _2 15:04:05.000000000";

/**
 * sleep(dur time.Duration, cb function())
 *
 * Sleep calls cb after at least the duration d. A negative or zero duration
 * causes Sleep to return immediately.
 */
time.sleep = function(dur, cb) {
  if ((dur instanceof Duration) === false) {
    throw new Error("sleep: not passed a Duration (got " + JSON.stringify(dur) + ")");
  }
  if (typeof cb !== "function") {
    throw new Error("sleep: callback should be a function");
  }
  if (dur.d.lten(0)) {
    cb();
    return;
  }
  setTimeout(cb, dur.d*time.Millisecond);
};

var quote = function(s) {
  return JSON.stringify(s);
};

const errLeadingInt = new Error("time: bad [0-9]*"); // never printed
const atoiError = new Error("time: invalid number");
const errBad = new Error("bad value for field");

/// leadingInt consumes the leading [0-9]* from s.
var leadingInt = function(s) {
  internal.areStrings([s]);
  var i = 0;
  var x = Int64.from(0);
  for (; i < s.length; i++) {
    var c = s[i];
    if (c < '0' || c > '9') {
      break;
    }
    if (x.gt( (Int64.from(1).shln(63).subn(1)).divn(10) )) {
      /// overflow
      throw errLeadingInt;
    }
    x = x.muln(10).addn(c.charCodeAt(0)).subn('0'.charCodeAt(0));
    if (x.ltn(0)) {
      /// overflow
      throw errLeadingInt;
    }
  }
  return [x, s.slice(i)];
};

/**
 * parseGMT parses a GMT time zone. The input string is known to start "GMT".
 * The function checks whether that is followed by a sign and a number in the
 * range -14 through 12 excluding zero.
 *
 * @private
 */
var parseGMT = function(value) {
  internal.isString(value);
  value = value.slice(3);
  if (value.length === 0) {
    return 3;
  }
  var sign = value[0];
  if (sign !== '-' && sign !== '+') {
    return 3;
  }
  try {
    var results = leadingInt(value.slice(1));
  } catch (e) {
    internal.throwSystem(e);
    return 3;
  }
  var x = results[0], rem = results[1];
  if (sign === '-') {
    x = -x;
  }
  if (x === 0 || x < -14 || 12 < x) {
    return 3;
  }
  return 3 + value.length - rem.length;
};

class ParseError extends Error {
  constructor(layout, value, lelem, velem, msg) {
    internal.areStrings([layout, value, lelem, velem, msg]);
    super();
    this.layout = layout;
    this.value = value;
    this.layoutElem = lelem;
    this.valueElem = velem;
    if (msg === "") {
      this.message = "parsing time " +
        quote(this.value) + " as " +
        quote(this.layout) + ": cannot parse " +
        quote(this.valueElem) + " as " +
        quote(this.layoutElem);
    } else {
      this.message = msg;
    }
  }

  toString() {
    if (this.message === "") {
      return "parsing time " +
        quote(this.value) + " as " +
        quote(this.layout) + ": cannot parse " +
        quote(this.valueElem) + " as " +
        quote(this.LayoutElem);
    }
    return "parsing time " + quote(this.value) + this.message;
  }
}

var atoi = function(s) {
  internal.areStrings([s]);
  var neg = false;
  if (s !== "" && (s[0] === '-' || s[0] === '+')) {
    neg = s[0] === '-';
    s = s.slice(1);
  }
  try {
    var results = leadingInt(s);
  } catch (e) {
    internal.throwSystem(e);
    throw atoiError;
  }
  var q = results[0], rem = results[1];
  var x = q.toNumber();
  if (rem !== "") {
    throw atoiError;
  }
  if (neg) {
    x = -x;
  }
  return x;
};

var parseNanoseconds = function(value, nbytes) {
  internal.areStrings([value]);
  internal.isInteger(nbytes);
  if (value[0] !== '.') {
    throw errBad;
  }
  var ns = atoi(value.slice(1, nbytes));
  if (ns < 0 || 1e9 <= ns) {
    return [0, "fractional second"];
  }
  /// We need nanoseconds, which means scaling by the number
  /// of missing digits in the format, maximum length 10. If it's
  /// longer than 10, we won't scale.
  var scaleDigits = 10 - nbytes;
  for (var i = 0; i < scaleDigits; i++) {
    ns *= 10;
  }
  return [ns, ""];
};

/**
 * parseTimeZone parses a time zone string and returns its length. Time zones
 * are human-generated and unpredictable. We can't do precise error checking.
 * On the other hand, for a correct parse there must be a time zone at the
 * beginning of the string, so it's almost always true that there's one
 * there. We look at the beginning of the string for a run of upper-case letters.
 * If there are more than 5, it's an error.
 * If there are 4 or 5 and the last is a T, it's a time zone.
 * If there are 3, it's a time zone.
 * Otherwise, other than special cases, it's not a time zone.
 * GMT is special because it can have an hour offset.
 *
 * @private
 */
var parseTimeZone = function(value) {
  internal.isString(value);
  if (value.length < 3) {
    throw new Error("too short");
  }
  /// Special case 1: ChST and MeST are the only zones with a lower-case letter.
  if (value.length >= 4 && (value.slice(0, 4) === "ChST" || value.slice(0, 4) === "MeST")) {
    return 4;
  }
  /// Special case 2: GMT may have an hour offset; treat it specially.
  if (value.slice(0, 3) === "GMT") {
    return parseGMT(value);
  }
  /// How many upper-case letters are there? Need at least three, at most five.
  var nUpper = 0;
  for (nUpper = 0; nUpper < 6; nUpper++) {
    if (nUpper >= value.length) {
      break;
    }
    var c = value[nUpper];
    if (c < 'A' || 'Z' < c) {
      break;
    }
  }
  if (nUpper === 0 || nUpper === 1 || nUpper === 2 || nUpper === 6) {
    return 0;
  } else if (nUpper === 5) { // Must end in T to match.
    if (value[4] === 'T') {
      return 5;
    }
  } else if (nUpper === 4) {
    /// Must end in T, except one special case.
    if (value[3] === 'T' || value.slice(0, 4) === "WITA") {
      return 4;
    }
  } else if (nUpper === 3) {
    return 3;
  }
  throw new Error("not valid");
};

/**
 * leadingFraction consumes the leading [0-9]* from s.
 * It is used only for fractions, so does not return an error on overflow,
 * it just stops accumulating precision.
 *
 * [int64, float64, string]
 *
 * @private
 */
var leadingFraction = function(s) {
  internal.isString(s);
  var i = 0;
  var scale = 1;
  var overflow = false;
  var x = internal.Int64.from(0);
  for (; i < s.length; i++) {
    var c = s[i];
    if (c < '0' || c > '9') {
      break;
    }
    if (overflow) {
      continue;
    }
    if (x.gt(internal.Int64.from(1).shln(63).subn(1).divn(10))) {
      /// It's possible for overflow to give a positive number, so take care.
      overflow = true;
      continue;
    }
    var y = x.muln(10).addn(c.charCodeAt(0) - '0'.charCodeAt(0));
    if (y.ltn(0)) {
      overflow = true;
      continue;
    }
    x = y;
    scale *= 10;
  }
  return [x, scale, s.slice(i)];
};

var unitMap = {
  "ns": internal.Int64.from(time.Nanosecond.d),
  "us": internal.Int64.from(time.Microsecond.d),
  "µs": internal.Int64.from(time.Microsecond.d), // U+00B5 = micro symbol
  "μs": internal.Int64.from(time.Microsecond.d), // U+03BC = Greek letter mu
  "ms": internal.Int64.from(time.Millisecond.d),
  "s":  internal.Int64.from(time.Second.d),
  "m":  internal.Int64.from(time.Minute.d),
  "h":  internal.Int64.from(time.Hour.d),
};

/**
 * ParseDuration parses a duration string.
 * A duration string is a possibly signed sequence of
 * decimal numbers, each with optional fraction and a unit suffix,
 * such as "300ms", "-1.5h" or "2h45m".
 * Valid time units are "ns", "us" (or "µs"), "ms", "s", "m", "h".
 */
time.parseDuration = function(s) {
  internal.isString(s);
  /// [-+]?([0-9]*(\.[0-9]*)?[a-z]+)+
  var orig = s;
  var d = internal.Int64.from(0);
  var neg = false;

  /// Consume [-+]?
  if (s !== "") {
    var c = s[0];
    if (c === '-' || c === '+') {
      neg = c === '-';
      s = s.slice(1);
    }
  }
  /// Special case: if all that is left is "0", this is zero.
  if (s === "0") {
    return new time.Duration(0);
  }
  if (s === "") {
    throw new Error("time: invalid duration " + orig);
  }
  while (s !== "") {
    var v = internal.Int64.from(0);
    var f = internal.Int64.from(0);
    var scale = 1;

    /// The next character must be [0-9.]
    if ((s[0] === '.' || '0' <= s[0] && s[0] <= '9') === false) {
      throw new Error("time: invalid duration " + orig);
    }
    /// Consume [0-9]*
    var pl = s.length;
    try {
      var results = leadingInt(s);
      var v = results[0], s = results[1];
    } catch (e) {
      throw new Error("time: invalid duration " + orig);
    }
    var pre = pl !== s.length; // whether we consumed anything before a period

    /// Consume (\.[0-9]*)?
    var post = false;
    if (s !== "" && s[0] === '.') {
      s = s.slice(1);
      var pl = s.length;
      var results = leadingFraction(s);
      var f = results[0]; scale = results[1];
      s = results[2];
      post = pl !== s.length;
    }
    if (pre === false && post === false) {
      /// no digits (e.g. ".s" or "-.s")
      throw new Error("time: invalid duration " + orig);
    }

    /// Consume unit.
    var i = 0;
    for (; i < s.length; i++) {
      var c = s[i];
      if (c === '.' || '0' <= c && c <= '9') {
        break;
      }
    }
    if (i === 0) {
      throw new Error("time: missing unit in duration " + orig);
    }
    var u = s.slice(0, i);
    s = s.slice(i);
    var unit = unitMap[u];
    if (typeof unit === 'undefined') {
      throw new Error("time: unknown unit " + u + " in duration " + orig);
    }
    if (v.gt(internal.Int64.from(1).shln(63).subn(1).div(unit))) {
      /// overflow
      throw new Error("time: invalid duration " + orig);
    }
    v = v.mul(unit);
    if (f.gtn(0)) {
      /// float64 is needed to be nanosecond accurate for fractions of hours.
      /// v >= 0 && (f*unit/scale) <= 3.6e+12 (ns/h, h is the largest unit)
      v = v.add(internal.Int64.from(f.toDouble() * unit.toDouble() / scale));
      if (v.ltn(0)) {
        /// overflow
        throw new Error("time: invalid duration " + orig);
      }
    }
    d = d.add(v);
    if (d.ltn(0)) {
      /// overflow
      throw new Error("time: invalid duration " + orig);
    }
  }

  if (neg) {
    d = d.muln(-1);
  }
  return new time.Duration(d);
};

/**
 * match reports whether s1 and s2 match ignoring case.
 * It is assumed s1 and s2 are the same length.
 *
 * @private
 */
var match = function(s1, s2) {
  for (var i = 0; i < s1.length; i++) {
    var c1 = s1[i].charCodeAt(0);
    var c2 = s2[i].charCodeAt(0);
    if (c1 !== c2) {
      /// Switch to lower-case; 'a'-'A' is known to be a single bit.
      c1 |= a - A;
      c2 |= a - A;
      if (c1 !== c2 || c1 < a || c1 > z) {
        return false;
      }
    }
  }
  return true;
};

var longDayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

var shortDayNames = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

var shortMonthNames = [
  "---",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

var longMonthNames = [
  "---",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * norm returns nhi, nlo such that
 * hi * base + lo == nhi * base + nlo
 * 0 <= nlo < base
 *
 * @private
 */
var norm = function(hi, lo, base) {
  internal.areIntegers([hi, lo, base]);
  if (lo < 0) {
    var n = Math.floor((-lo-1)/base) + 1;
    hi -= n;
    lo += n * base;
  }
  if (lo >= base) {
    var n = Math.floor(lo / base);
    hi += n;
    lo -= n * base;
  }
  return [hi, lo];
};

var days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

class Weekday {
  constructor(day) {
    internal.isInRange(day, 0, 6);
    this.day = day;
  }

  equal(b) {
    if (b instanceof Weekday === false) {
      throw new Error("not comparing to a weekday object: " + JSON.stringify(b));
    }
    return this.day === b.day;
  };

  toString() {
    return days[this.day];
  }
};

const Sunday = new Weekday(0);
const Monday = new Weekday(1);
const Tuesday = new Weekday(2);
const Wednesday = new Weekday(3);
const Thursday = new Weekday(4);
const Friday = new Weekday(5);
const Saturday = new Weekday(6);

/**
 * absWeekday is like Weekday but operates on an absolute time.
 *
 * @private
 */
var absWeekday = function(abs) {
  internal.isUint64(abs);
  /// January 1 of the absolute year, like January 1 of 2001, was a Monday.
  var s1 = Uint64.from(Monday.day).mul(constants.secondsPerDay.toUnsigned());
  var s2 = s1.add(abs).mod(constants.secondsPerWeek.toUnsigned());
  var s3 = s2.toSigned().div(constants.secondsPerDay);
  return new Weekday(s3.toNumber());
};

/// tab []string, val string
var lookup = function(tab, val) {
  for (var i = 0; i < tab.length; i++) {
    var v = tab[i];
    if (val.length >= v.length && match(val.slice(0, v.length), v)) {
      return [i, val.slice(v.length)];
    }
  }
  throw errBad;
};

var cutspace = function(s) {
  internal.areStrings([s]);
  while (s.length > 0 && s[0] === ' ') {
    s = s.slice(1);
  }
  return s;
};

/**
 * isDigit reports whether s[i] is in range and is a decimal digit.
 *
 * @private
 */
var isDigit = function(s, i) {
  internal.isString(s);
  internal.isInteger(i);
  if (s.length <= i) {
    return false;
  }
  var c = s[i];
  return '0' <= c && c <= '9';
};

/**
 * getnum parses s[0:1] or s[0:2] (fixed forces the latter)
 * as a decimal integer and returns the integer and the
 * remainder of the string.
 *
 * @private
 */
var getnum = function(s, fixed) {
  internal.isString(s);
  internal.isBool(fixed);
  if (isDigit(s, 0) === false) {
    throw errBad;
  }
  if (isDigit(s, 1) === false) {
    if (fixed === true) {
      return 0, s, errBad;
    }
    return [s[0].charCodeAt(0) - '0'.charCodeAt(0), s.slice(1)];
  }
  var diff = s[0].charCodeAt(0) - '0'.charCodeAt(0);
  var diff1 = s[1].charCodeAt(0) - '0'.charCodeAt(0);
  return [diff*10 + diff1, s.slice(2)];
};

/**
 * skip removes the given prefix from value,
 * treating runs of space characters as equivalent.
 *
 * @private
 */
var skip = function(value, prefix) {
  internal.areStrings([value, prefix]);
  while (prefix.length > 0) {
    if (prefix[0] === ' ') {
      if (value.length > 0 && value[0] !== ' ') {
        throw errBad;
      }
      prefix = cutspace(prefix);
      value = cutspace(value);
      continue;
    }
    if (value.length === 0 || value[0] !== prefix[0]) {
      throw errBad;
    }
    prefix = prefix.slice(1);
    value = value.slice(1);
  }
  return value;
};

const stdNeedDate = 1 << 8;
const stdLongMonth = 1 + stdNeedDate;    // "January"
const stdMonth = 2 + stdNeedDate;        // "Jan"
const stdNumMonth = 3 + stdNeedDate;     // "1"
const stdZeroMonth = 4 + stdNeedDate;    // "01"
const stdLongWeekDay = 5 + stdNeedDate;  // "Monday"
const stdWeekDay = 6 + stdNeedDate;      // "Mon"
const stdDay = 7 + stdNeedDate;          // "2"
const stdUnderDay = 8 + stdNeedDate;     // "_2"
const stdZeroDay = 9 + stdNeedDate;      // "02"

const stdNeedClock = 2 << 8; // 512
const stdHour = 10 + stdNeedClock;                // 522; "15"
const stdHour12 = 11 + stdNeedClock;              // "3"
const stdZeroHour12 = 12 + stdNeedClock;          // "03"
const stdMinute = 13 + stdNeedClock;              // 525; "4"
const stdZeroMinute = 14 + stdNeedClock;          // "04"
const stdSecond = 15 + stdNeedClock;              // "5"
const stdZeroSecond = 16 + stdNeedClock;          // 528; "05"

const stdLongYear = 17 + stdNeedDate;    // "2006"
const stdYear = 18 + stdNeedDate;        // "06"

const stdPM = 19 + stdNeedClock;                  // "PM"
const stdpm = 20 + stdNeedClock;                  // "pm"

const stdTZ = 21;                                 // "MST"
const stdISO8601TZ = 22;                          // "Z0700"  // prints Z for UTC
const stdISO8601SecondsTZ = 23;                   // "Z070000"
const stdISO8601ShortTZ = 24;                     // "Z07"
const stdISO8601ColonTZ = 25;                     // "Z07:00" // prints Z for UTC
const stdISO8601ColonSecondsTZ = 26;              // "Z07:00:00"
const stdNumTZ = 27;                              // "-0700"  // always numeric
const stdNumSecondsTz = 28;                       // "-070000"
const stdNumShortTZ = 29;                         // "-07"    // always numeric
const stdNumColonTZ = 30;                         // "-07:00" // always numeric
const stdNumColonSecondsTZ = 31;                  // "-07:00:00"
const stdFracSecond0 = 32;                        // ".0", ".00", ... , trailing zeros included
const stdFracSecond9 = 33;                        // ".9", ".99", ..., trailing zeros omitted

const stdArgShift  = 16;                 // extra argument in high bits, above low stdArgShift
const stdMask      = (1<<stdArgShift) - 1; // mask out argument

/**
 * std0x records the std values for "01", "02", ..., "06".
 *
 * @private
 */
var std0x = [stdZeroMonth, stdZeroDay, stdZeroHour12, stdZeroMinute, stdZeroSecond, stdYear];

/**
 * startsWithLowerCase reports whether the string has a lower-case letter at the beginning.
 * Its purpose is to prevent matching strings like "Month" when looking for "Mon".
 *
 * @private
 */
var startsWithLowerCase = function(str) {
  internal.areStrings([str]);
  if (str.length === 0) {
    return false;
  }
  var c = str[0];
  return 'a' <= c && c <= 'z';
};

/**
 * nextStdChunk finds the first occurrence of a std string in
 * layout and returns the text before, the std string, and the text after.
 *
 * @private
 */
var nextStdChunk = function(layout) {
  internal.areStrings([layout]);
  for (var i = 0; i < layout.length; i++) {
    var c = layout[i];
    if (c === 'J') { // January, Jan
      if (layout.length >= i+3 && layout.slice(i, i+3) === "Jan") {
        if (layout.length >= i+7 && layout.slice(i, i+7) === "January") {
          return [layout.slice(0, i), stdLongMonth, layout.slice(i+7)];
        }
        if (!startsWithLowerCase(layout.slice(i+3))) {
          return [layout.slice(0, i), stdMonth, layout.slice(i+3)];
        }
      }
    } else if (c === 'M') { // Monday, Mon, MST
      if (layout.length >= i+3) {
        if (layout.slice(i, i+3) === "Mon") {
          if (layout.length >= i+6 && layout.slice(i, i+6) === "Monday") {
            return [layout.slice(0, i), stdLongWeekDay, layout.slice(i+6)];
          }
          if (startsWithLowerCase(layout.slice(i+3)) === false) {
            return [layout.slice(0, i), stdWeekDay, layout.slice(i+3)];
          }
        }
        if (layout.slice(i, i+3) === "MST") {
          return [layout.slice(0, i), stdTZ, layout.slice(i+3)];
        }
      }
    } else if (c === '0') { // 01, 02, 03, 04, 05, 06
      if (layout.length >= i+2 && '1' <= layout[i+1] && layout[i+1] <= '6') {
        return [layout.slice(0,i), std0x[layout[i+1]-'1'], layout.slice(i+2)];
      }
    } else if (c === '1') { // 15, 1
      if (layout.length >= i+2 && layout[i+1] === '5') {
        return [layout.slice(0, i), stdHour, layout.slice(i+2)];
      }
      return [layout.slice(0, i), stdNumMonth, layout.slice(i+1)];
    } else if (c === '2') { // 2006, 2
      if (layout.length >= i+4 && layout.slice(i, i+4) === "2006") {
        return [layout.slice(0, i), stdLongYear, layout.slice(i+4)];
      }
      return [layout.slice(0, i), stdDay, layout.slice(i+1)];
    } else if (c === '_') { // _2, _2006
      if (layout.length >= i+2 && layout[i+1] === '2') {
        /// 2006 is really a literal _, followed by stdLongYear
        if (layout.length >= i+5 && layout.slice(i+1, i+5) === "2006") {
          return [layout.slice(0, i+1), stdLongYear, layout.slice(i+5)];
        }
        return [layout.slice(0, i), stdUnderDay, layout.slice(i+2)];
      }
    } else if (c === '3') {
      return [layout.slice(0, i), stdHour12, layout.slice(i+1)];
    } else if (c === '4') {
      return [layout.slice(0, i), stdMinute, layout.slice(i+1)];
    } else if (c === '5') {
      return [layout.slice(0, i), stdSecond, layout.slice(i+1)];
    } else if (c === 'P') { // PM
      if (layout.length >= i+2 && layout[i+1] === 'M') {
        return [layout.slice(0, i), stdPM, layout.slice(i+2)];
      }
    } else if (c === 'p') { // pm
      if (layout.length >= i+2 && layout[i+1] === 'm') {
        return [layout.slice(0, i), stdpm, layout.slice(i+2)];
      }
    } else if (c === '-') { // -070000, -07:00:00, -0700, -07:00, -07
      if (layout.length >= i+7 && layout.slice(i, i+7) === "-070000") {
        return [layout.slice(0, i), stdNumSecondsTz, layout.slice(i+7)];
      }
      if (layout.length >= i+9 && layout.slice(i, i+9) === "-07:00:00") {
        return [layout.slice(0, i), stdNumColonSecondsTZ, layout.slice(i+9)];
      }
      if (layout.length >= i+5 && layout.slice(i, i+5) === "-0700") {
        return [layout.slice(0, i), stdNumTZ, layout.slice(i+5)];
      }
      if (layout.length >= i+6 && layout.slice(i, i+6) === "-07:00") {
        return [layout.slice(0, i), stdNumColonTZ, layout.slice(i+6)];
      }
      if (layout.length >= i+3 && layout.slice(i, i+3) === "-07") {
        return [layout.slice(0, i), stdNumShortTZ, layout.slice(i+3)];
      }
    } else if (c === 'Z') { // Z070000, Z07:00:00, Z0700, Z07:00,
      if (layout.length >= i+7 && layout.slice(i, i+7) === "Z070000") {
        return [layout.slice(0, i), stdISO8601SecondsTZ, layout.slice(i+7)];
      }
      if (layout.length >= i+9 && layout.slice(i, i+9) === "Z07:00:00") {
        return [layout.slice(0, i), stdISO8601ColonSecondsTZ, layout.slice(i+9)];
      }
      if (layout.length >= i+5 && layout.slice(i, i+5) === "Z0700") {
        return [layout.slice(0, i), stdISO8601TZ, layout.slice(i+5)];
      }
      if (layout.length >= i+6 && layout.slice(i, i+6) === "Z07:00") {
        return [layout.slice(0, i), stdISO8601ColonTZ, layout.slice(i+6)];
      }
      if (layout.length >= i+3 && layout.slice(i, i+3) === "Z07") {
        return [layout.slice(0, i), stdISO8601ShortTZ, layout.slice(i+3)];
      }
    } else if (c === '.') { // .000 or .999 - repeated digits for fractional seconds.
      if (i+1 < layout.length && (layout[i+1] === '0' || layout[i+1] === '9')) {
        var ch = layout[i+1];
        var j = i + 1;
        while (j < layout.length && layout[j] === ch) {
          j++;
        }
        /// String of digits must end here - only fractional second is all digits.
        if (!isDigit(layout, j)) {
          var std = stdFracSecond0;
          if (layout[i+1] === '9') {
            std = stdFracSecond9;
          }
          std = std | ((j - (i + 1)) << stdArgShift);
          return [layout.slice(0, i), std, layout.slice(j)];
        }
      }
    }
  }
  return [layout, 0, ""];
};

/// _date is used inside of the Time class, so define a stub and then redefine
/// it
var _date = function() {};

/**
 * A Time represents an instant in time with nanosecond precision.
 *
 * Time instants can be compared using the before, after, and equal methods. The
 * `sub` method subtracts two instants, producing a Duration. The `add` method adds a
 * Time and a Duration, producing a Time.
 *
 * The zero value of type Time is January 1, year 1, 00:00:00.000000000 UTC.
 * As this time is unlikely to come up in practice, the IsZero method gives a
 * simple way of detecting a time that has not been initialized explicitly.
 *
 * Each Time has associated with it a Location, consulted when computing the
 * presentation form of the time, such as in the Format, Hour, and Year methods.
 * The methods Local, UTC, and In return a Time with a specific location.
 * Changing the location in this way changes only the presentation; it does not
 * change the instant in time being denoted and therefore does not affect the
 * computations described in earlier paragraphs.
 *
 * Time values should not be used as map or database keys without first
 * guaranteeing that the identical Location has been set for all values,
 * which can be achieved through use of the UTC or Local method, and that the
 * monotonic clock reading has been stripped by setting `t = t.round(0)`.
 * Use t.equal(u) instead of `t == u`, since t.Equal uses the most accurate
 * comparison available and correctly handles the case when only one of its
 * arguments has a monotonic clock reading.

 * In addition to the required “wall clock” reading, a Time may contain an
 * optional reading of the current process's monotonic clock, to provide
 * additional precision for comparison or subtraction. See the “Monotonic Clocks”
 * section in the package documentation for details.
 *
 * @class
 */
class Time {
  /**
   * @private
   */
  constructor(wall, ext, loc) {
    /// uint64
    if (typeof wall === 'undefined' || wall === null) {
      wall = internal.Uint64.from(0);
    }
    internal.isUint64(wall);
    this.wall = wall;
    /// int64
    if (typeof ext === 'undefined' || ext === null) {
      ext = Int64.from(0);
    }
    internal.isInt64(ext);
    this.ext = ext;

    if (typeof loc === 'undefined') {
      throw new Error("must define loc or set it to null"); // TODO
    }
    /// not specified yet by anything
    this.loc = loc;
  };

  /**
   * clone returns a new Time object with all fields initialized.
   * @private
   */
  _clone() {
    return new Time(this.wall, this.ext, this.loc);
  }

  /**
   * Add returns the time t+d.
   */
  add(d) {
    var t = this._clone();
    if ((d instanceof Duration) === false) {
      throw new Error("time.Add: not a duration " + JSON.stringify(d));
    }
    var dsec = internal.Int64.from(d.d.divn(1e9));
    var nsec = t._nsec().add(d.d.modn(1e9));
    if (nsec.gten(1e9)) {
      dsec = dsec.addn(1);
      nsec = nsec.subn(1e9);
    } else if (nsec.ltn(0)) {
      dsec = dsec.subn(1);
      nsec = nsec.addn(1e9);
    }
    t.wall = t.wall.and(constants.nsecMask.not()).or(nsec); // update nsec
    t._addSec(dsec);
    if (t.wall.and(constants.hasMonotonic).eqn(0) === false) {
      var te = t.ext.add(d.d); // int64
      if (d.ltn(0) && te.gt(t.ext) || d.gtn(0) && te.lt(t.ext)) {
        /// Monotonic clock reading now out of range; degrade to wall-only.
        t._stripMono();
      } else {
        t.ext = te;
      }
    }
    return t;
  };

  /**
   * Sub returns the duration t-u. If the result exceeds the maximum (or
   * minimum) value that can be stored in a Duration, the maximum (or minimum)
   * duration will be returned.
   * To compute t-d for a duration d, use `t.add(-d)`.
   */
  sub(u) {
    var t = this._clone();
    if (t.wall.and(u.wall).and(constants.hasMonotonic).eqn(0) === false) {
      var te = t.ext.toSigned();
      var ue = u.ext.toSigned();
      var d = new Duration(te.sub(ue));
      if (d.d.ltn(0) && te.gt(ue)) {
        return maxDuration; // t - u is positive out of range
      }
      if (d.d.gtn(0) && te.lt(ue)) {
        return minDuration; // t - u is negative out of range
      }
      return d;
    }
    var d = new Duration(t._sec().sub(u._sec())).mul(Second).add(new Duration(t._nsec().sub(u._nsec())));
    /// Check for overflow or underflow.
    if (u.add(d).equal(t)) {
      return d;
    }
    if (t.before(u)) {
      return minDuration; // t - u is negative out of range
    }
    return maxDuration; // t - u is positive out of range
  }

  /**
   * AddDate returns the time corresponding to adding the
   * given number of years, months, and days to t.
   * For example, AddDate(-1, 2, 3) applied to January 1, 2011
   * returns March 4, 2010.
   *
   * AddDate normalizes its result in the same way that Date does,
   * so, for example, adding one month to October 31 yields
   * December 1, the normalized form for November 31.
   */
  addDate(years, months, days) {
    internal.areIntegers([years, months, days]);
    var dateResults = this.date();
    var clockResults = this.clock();
    return _date(years+dateResults.year,
      new Month(dateResults.month.month + months), dateResults.day+days,
      clockResults.hour, clockResults.min, clockResults.sec,
      this._nsec().toNumber(), this.location());
  };

  /**
   * After reports whether the time instant t is after u.
   */
  after(u) {
    if ((u instanceof Time) === false) {
      throw new Error("Must compare to another Time object");
    }
    if (this.wall.and(u.wall).and(constants.hasMonotonic).eqn(0) === false) {
      return this.ext.gt(u.ext);
    }
    var ts = this._sec();
    var us = u._sec();
    return ts.gt(us) || ts.eq(us) && t._nsec().gt(u.nsec());
  };

  /**
   * Before reports whether the time instant t is before u.
   */
  before(u) {
    if ((u instanceof Time) === false) {
      throw new Error("Must compare to another Time object");
    }
    if (this.wall.and(u.wall).and(constants.hasMonotonic).eqn(0) === false) {
      return this.ext.lt(u.ext);
    }
    var tsec = this._sec();
    var usec = u._sec();
    return tsec.lt(usec) || tsec.eq(usec) && t._nsec().lt(u._nsec());
  };

  /**
   * Equal reports whether t and u represent the same time instant.
   * Two times can be equal even if they are in different locations.
   * For example, 6:00 +0200 CEST and 4:00 UTC are Equal.
   * See the documentation on the Time type for the pitfalls of using == with
   * Time values; most code should use Equal instead.
   */
  equal(u) {
    if ((u instanceof Time) === false) {
      throw new Error("u not a Time instance");
    }
    if (this.wall.and(u.wall).and(constants.hasMonotonic).eqn(0) === false) {
      return this.ext.eq(u.ext);
    }
    return this._sec().eq(u._sec()) && this._nsec().eq(u._nsec());
  };

  /**
   * Format returns a textual representation of the time value formatted
   * according to layout, which defines the format by showing how the reference
   * time, defined to be
   *	Mon Jan 2 15:04:05 -0700 MST 2006
   * would be displayed if it were the value; it serves as an example of the
   * desired output. The same display rules will then be applied to the time
   * value.
   *
   * A fractional second is represented by adding a period and zeros
   * to the end of the seconds section of layout string, as in "15:04:05.000"
   * to format a time stamp with millisecond precision.
   *
   * Predefined layouts ANSIC, UnixDate, RFC3339 and others describe standard
   * and convenient representations of the reference time. For more information
   * about the formats and the definition of the reference time, see the
   * documentation for ANSIC and the other constants defined by this package.
   */
  format(layout) {
    internal.isString(layout);
    const bufSize = 64;
    var b = new bytes.Slice(0);
    b = this.appendFormat(b, layout);
    return b.toString();
  }

  /**
   * AppendFormat is like Format but appends the textual
   * representation to buf and returns the extended buffer.
   *
   * Returns a bytes.Slice instance.
   */
  appendFormat(buf, layout) {
    internal.isString(layout);
    if ((buf instanceof bytes.Slice) === false) {
      throw new Error("buf not a bytes.Slice instance: " + JSON.stringify(buf));
    }
    var results = this._locabs();
    var name = results[0], offset = results[1], abs = results[2];
    internal.isString(name);
    internal.isInteger(offset);
    internal.isUint64(abs);
    var year = -1;
    var month = new Month(0);
    var day = 0;
    var hour = -1;
    var min = 0;
    var sec = 0;

    var w = 0;
    while (layout !== "") {
      var results = nextStdChunk(layout);
      var prefix = results[0], std = results[1], suffix = results[2];
      if (prefix !== "") {
        buf = buf.append(prefix);
        w += prefix.length;
      }
      if (std === 0) {
        break;
      }
      layout = suffix;

      /// Compute year, month, day if needed.
      if (year < 0 && ((std & stdNeedDate) !== 0)) {
        var results = absDate(abs, true);
        year = results[0].toNumber(), month = results[1], day = results[2];
      }

      /// Compute hour, minute, second if needed.
      if (hour < 0 && ((std & stdNeedClock) !== 0)) {
        var results = absClock(abs);
        hour = results.hour, min = results.min, sec = results.sec;
      }

      var mask = std & stdMask;
      if (mask === stdYear) {
        var y = year;
        if (y < 0) {
          y = -y;
        }
        buf = appendInt(buf, y%100, 2);
      } else if (mask === stdLongYear) {
        buf = appendInt(buf, year, 4);
      } else if (mask === stdMonth) {
        buf = buf.append(month.toString().slice(0, 3));
      } else if (mask === stdLongMonth) {
        buf = buf.append(month.toString());
      } else if (mask === stdNumMonth) {
        buf = appendInt(buf, month.month, 0);
      } else if (mask === stdZeroMonth) {
        buf = appendInt(buf, month.month, 2);
      } else if (mask === stdWeekDay) {
        buf = buf.append(absWeekday(abs).toString().slice(0, 3));
      } else if (mask === stdLongWeekDay) {
        buf = buf.append(absWeekday(abs).toString());
      } else if (mask === stdDay) {
        buf = appendInt(buf, day, 0);
      } else if (mask === stdUnderDay) {
        if (day < 10) {
          buf = buf.append([' '.charCodeAt(0)]);
        }
        buf = appendInt(buf, day, 0);
      } else if (mask === stdZeroDay) {
        buf = appendInt(buf, day, 2);
      } else if (mask === stdHour) {
        buf = appendInt(buf, hour, 2);
      } else if (mask === stdHour12) {
        /// Noon is 12PM, midnight is 12AM.
        var hr = hour % 12;
        if (hr === 0) {
          hr = 12;
        }
        buf = appendInt(buf, hr, 0);
      } else if (mask === stdZeroHour12) {
        /// Noon is 12PM, midnight is 12AM.
        var hr = hour % 12;
        if (hr === 0) {
          hr = 12;
        }
        buf = appendInt(buf, hr, 2);
      } else if (mask === stdMinute) {
        buf = appendInt(buf, min, 0);
      } else if (mask === stdZeroMinute) {
        buf = appendInt(buf, min, 2);
      } else if (mask === stdSecond) {
        buf = appendInt(buf, sec, 0);
      } else if (mask === stdZeroSecond) {
        buf = appendInt(buf, sec, 2);
      } else if (mask === stdPM) {
        if (hour >= 12) {
          buf = buf.append("PM");
        } else {
          buf = buf.append("AM");
        }
      } else if (mask === stdpm) {
        if (hour >= 12) {
          buf = buf.append("pm");
        } else {
          buf = buf.append("am");
        }
      } else if (mask === stdISO8601TZ || mask === stdISO8601ColonTZ ||
        mask === stdISO8601SecondsTZ || mask === stdISO8601ShortTZ ||
        mask === stdISO8601ColonSecondsTZ || mask === stdNumTZ ||
        mask === stdNumColonTZ || mask === stdNumSecondsTz ||
        mask === stdNumShortTZ || mask === stdNumColonSecondsTZ) {
        /// Ugly special case. We cheat and take the "Z" variants
        /// to mean "the time zone as formatted for ISO 8601".
        if (offset === 0 && (std === stdISO8601TZ ||
          std === stdISO8601ColonTZ || std === stdISO8601SecondsTZ ||
          std === stdISO8601ShortTZ || std === stdISO8601ColonSecondsTZ)
        ) {
          buf = buf.append([ord('Z')]);
        } else { // original code had break here, we can't use that
          var zone = offset / 60; // convert to minutes
          var absoffset = offset;
          if (zone < 0) {
            buf = buf.append([ord('-')]);
            zone = -zone;
            absoffset = -absoffset;
          } else {
            buf = buf.append([ord('+')]);
          }
          buf = appendInt(buf, zone/60, 2);
          if (std === stdISO8601ColonTZ || std === stdNumColonTZ ||
            std === stdISO8601ColonSecondsTZ || std === stdNumColonSecondsTZ) {
            buf = buf.append([ord(':')]);
          }
          if (std !== stdNumShortTZ && std !== stdISO8601ShortTZ) {
            buf = appendInt(buf, zone%60, 2);
          }

          /// append seconds if appropriate
          if (std === stdISO8601SecondsTZ || std === stdNumSecondsTz || std === stdNumColonSecondsTZ || std === stdISO8601ColonSecondsTZ) {
            if (std === stdNumColonSecondsTZ || std === stdISO8601ColonSecondsTZ) {
              buf = buf.append([ord(':')]);
            }
            buf = appendInt(buf, absoffset%60, 2);
          }
        }
      } else if (mask === stdTZ) {
        if (name !== "") {
          buf = buf.append(name);
        } else { // original code had a break here, we can't use that.
          /// No time zone known for this time, but we must print one.
          /// Use the -0700 format.
          var zone = offset / 60; // convert to minutes
          if (zone < 0) {
            buf = buf.append([ord('-')]);
            zone = -zone;
          } else {
            buf = buf.append([ord('+')]);
          }
          buf = appendInt(buf, zone/60, 2);
          buf = appendInt(buf, zone%60, 2);
        }
      } else if (mask === stdFracSecond0 || mask === stdFracSecond9) {
        buf = formatNano(buf, Uint64.from(this.nanosecond()), std>>stdArgShift, (std&stdMask) === stdFracSecond9);
      }
    }
    return buf;
  };

  /**
   * Clock() {hour int, min int, sec int}
   *
   * Clock returns the {hour, min, and sec} within the day specified by t.
   */
  clock() {
    return absClock(this._abs());
  }

  /**
   * Date() {year int, month Month, day int}
   *
   * Date returns the {year, month, and day} in which t occurs, as integers.
   */
  date() {
    var results = this._date(true);
    return new dateResult(results[0].toNumber(), results[1], results[2]);
  };

  /**
   * Location returns the time zone information associated with t.
   */
  location() {
    var l = this.loc;
    if (l === null) {
      l = location.UTC;
    }
    return l;
  }

  /**
   * Nanosecond returns the nanosecond offset within the second specified by t,
   * in the range [0, 999999999].
   */
  nanosecond() {
    return this._nsec().toNumber();
  }

  /**
   * Second returns the second offset within the minute specified by t, in the range [0, 59].
   */
  second() {
    var abs = this._abs();
    return abs.mod(constants.secondsPerMinute.toUnsigned()).toNumber();
  };

  /**
   * Minute returns the minute offset within the hour specified by t, in the range [0, 59].
   */
  minute() {
    var abs = this._abs();
    var mod = abs.mod(constants.secondsPerHour.toUnsigned()).toSigned();
    return mod.div(constants.secondsPerMinute).toNumber();
  };

  /**
   * Hour returns the hour within the day specified by t, in the range [0, 23].
   */
  hour() {
    var abs = this._abs();
    return abs.mod(constants.secondsPerDay.toUnsigned()).div(constants.secondsPerHour.toUnsigned()).toNumber();
  };

  /**
   * Day returns the day of the month.
   */
  day() {
    var results = this._date(true);
    return results[2];
  };

  /**
   * Weekday returns the day of the week specified by t.
   */
  weekday() {
    return absWeekday(this._abs());
  };

  /**
   * ISOWeek returns the ISO 8601 year and week number in which t occurs.
   * Week ranges from 1 to 53. Jan 01 to Jan 03 of year n might belong to
   * week 52 or 53 of year n-1, and Dec 29 to Dec 31 might belong to week 1
   * of year n+1.
   */
  isoWeek() {
    var results = this._date(true);
    var year = results[0].toNumber(), month = results[1], day = results[2], yday = results[3];
    var wday = (this.weekday().day+6) % 7; // weekday but Monday = 0.

    /// Calculate week as number of Mondays in year up to
    /// and including today, plus 1 because the first week is week 0.
    /// Putting the + 1 inside the numerator as a + 7 keeps the
    /// numerator from being negative, which would cause it to
    /// round incorrectly.
    var week = Math.floor((yday - wday + 7) / 7);

    /// The week number is now correct under the assumption
    /// that the first Monday of the year is in week 1.
    /// If Jan 1 is a Tuesday, Wednesday, or Thursday, the first Monday
    /// is actually in week 2.
    var jan1wday = (wday - yday + 7*53) % 7;
    if (Tue <= jan1wday && jan1wday <= Thu) {
      week++;
    }

    /// If the week number is still 0, we're in early January but in
    /// the last week of last year.
    if (week === 0) {
      year--;
      week = 52;
      /// A year has 53 weeks when Jan 1 or Dec 31 is a Thursday,
      /// meaning Jan 1 of the next year is a Friday
      /// or it was a leap year and Jan 1 of the next year is a Saturday.
      if (jan1wday === Fri || (jan1wday === Sat && isLeap(year))) {
        week++;
      }
    }

    /// December 29 to 31 are in week 1 of next year if
    /// they are after the last Thursday of the year and
    /// December 31 is a Monday, Tuesday, or Wednesday.
    if (month.equal(December) && day >= 29 && wday < Thu) {
      var dec31wday = (wday + 31 - day) % 7;
      if (Mon <= dec31wday && dec31wday <= Wed) {
        year++;
        week = 1;
      }
    }
    return new weekResult(year, week);
  };

  month() {
    var results = this._date(true);
    return results[1];
  };

  /**
   * YearDay returns the day of the year specified by t, in the range [1,365]
   * for non-leap years, and [1,366] in leap years.
   */
  yearDay() {
    var results = this._date(false);
    return results[3] + 1;
  }

  year() {
    var results = this._date(false);
    return results[0].toNumber();
  };

  /**
   * IsZero reports whether t represents the zero time instant,
   * January 1, year 1, 00:00:00 UTC.
   */
  isZero() {
    return this._sec().eqn(0) && this._nsec().eqn(0);
  };

  utc() {
    this._setLoc(location.UTC);
    return this;
  };

  /**
   * Unix returns t as a Unix time, the number of seconds elapsed since January
   * 1, 1970 UTC.
   */
  unix() {
    return this._unixSec();
  };

  /**
   * MarshalJSON implements the json.Marshaler interface.
   * The time is a quoted string in RFC 3339 format, with sub-second precision added if present.
   */
  toJSON() {
    var y = this.year();
    if (y < 0 || y >= 10000) {
      /// RFC 3339 is clear that years are 4 digits exactly.
      /// See golang.org/issue/4556#c15 for more discussion.
      throw new Error("Time.MarshalJSON: year outside of range [0,9999]");
    }

    var b = new bytes.Slice(0);
    b = b.append([ord('"')]);
    b = this.appendFormat(b, time.RFC3339Nano);
    b = b.append([ord('"')]);
    return b;
  };

  /**
   * nsec returns the time's nanoseconds.
   * @private
   */
  _nsec() {
    return this.wall.and(constants.nsecMask);
  };

  /**
   * sec returns the time's seconds as a Uint64 since Jan 1 year 1.
   * @private
   */
  _sec() {
    if (this.wall.and(constants.hasMonotonic).eqn(0) === false) {
      return constants.wallToInternal.add((this.wall.shln(1).shr(constants.nsecShift.addn(1))).toSigned());
    }
    return this.ext;
  };

  /**
   * addSec adds d seconds to the time.
   * @private
   */
  _addSec(d) {
    internal.isInt64(d);
    if (this.wall.and(constants.hasMonotonic).eqn(0) === false) {
      var sec = (this.wall.shln(1).shr(constants.nsecShift.addn(1))).toSigned();
      internal.isInt64(sec);
      var dsec = sec.add(d); // uint64
      internal.isInt64(dsec);
      var lval = Int64.from(1).shln(33).subn(1);
      if (dsec.gten(0) && dsec.lte(lval)) {
        this.wall = this.wall.and(constants.nsecMask).or(dsec.toUnsigned().shl(constants.nsecShift)).or(constants.hasMonotonic);
        return;
      }
      /// Wall second now out of range for packed field.
      /// Move to ext.
      this._stripMono();
    }

    /// TODO: Check for overflow.
    this.ext = this.ext.add(d);
  };

  /**
   * date computes the year, day of year, and when full=true,
   * the month and day in which t occurs.
   * @private
   */
  _date(full) {
    internal.isBool(full);
    return absDate(this._abs(), full);
  }

  /**
   * setLoc sets the location associated with the time.
   * @private
   */
  _setLoc(loc) {
    if (loc === location.UTC) {
      loc = null;
    }
    this._stripMono();
    this.loc = loc;
  };

  /**
   * stripMono strips the monotonic clock reading in t.
   * @private
   */
  _stripMono() {
    if (this.wall.and(constants.hasMonotonic).eqn(0) === false) {
      this.ext = this._sec();
      this.wall = this.wall.and(constants.nsecMask);
    }
  };

  /**
   * abs returns the time t as an absolute time, adjusted by the zone offset.
   * It is called when computing a presentation property like Month or Hour.
   *
   * @private
   */
  _abs() {
    var l = this.loc;
    /// Avoid function calls when possible.
    if (l === null) {
      l = location.UTC;
    } else if (l === location.Local) {
      l._get();
    }
    var sec = this._unixSec();
    internal.isInt64(sec);
    if (l !== location.UTC) {
      if (l.cacheZone !== null && l.cacheStart.lte(sec) && sec.lt(l.cacheEnd)) {
        sec = sec.addn(l.cacheZone.offset);
      } else {
        var results = l._lookup(sec);
        sec = sec.addn(results.offset);
      }
    }
    return sec.add(constants.unixToInternal.add(constants.internalToAbsolute)).toUnsigned();
  };

  /**
   * locabs is a combination of the Zone and abs methods,
   * extracting both return values from a single zone lookup.
   * (name string, offset int, abs uint64)
   *
   * @private
   */
  _locabs() {
    var l = this.loc;
    if (l === location.Local) {
      l._get();
    } else if (l === null) {
      l = location.UTC;
    }
    var name = ""; // string
    var offset = 0;
    /// Avoid function call if we hit the local time cache.
    var sec = this._unixSec();
    if (l !== location.UTC) {
      if (l.cacheZone !== null && l.cacheStart.lte(sec) && sec.lte(l.cacheEnd)) {
        name = l.cacheZone.name;
        offset = l.cacheZone.offset;
      } else {
        var results = l._lookup(sec);
        name = results.name;
        offset = results.offset;
      }
      sec = sec.addn(offset);
    } else {
      name = "UTC";
      offset = 0;
    }
    var abs = sec.add(constants.unixToInternal.add(constants.internalToAbsolute));
    return [name, offset, abs.toUnsigned()];
  }

  /// returns a uint64
  _unixSec() {
    return this._sec().add(constants.internalToUnix);
  }

  /**
   * Zone() {name string, offset int}
   *
   * Zone computes the time zone in effect at time t, returning the abbreviated
   * name of the zone (such as "CET") and its offset in seconds east of UTC.
   */
  zone() {
    var loc = this.loc;
    if (loc === null) {
      loc = location.UTC;
    }
    var rv = loc._lookup(this._unixSec());
    return new zoneResult(rv.name, rv.offset);
  }
};

/**
 * TODO: nsec is supposed to be an int32.
 * @private
 */
var unixTime = function(sec, nsec) {
  internal.isInt64(sec);
  internal.isInt64(nsec);
  return new Time(nsec.toUnsigned(), sec.add(constants.unixToInternal), location.Local);
};

var _now = function() {
  var nowms = Uint64.from(Date.now());
  var seconds = nowms.divn(1000);
  var nsec = nowms.modn(1000).muln(1000*1000);
  var hrtime = process.hrtime();
  var seconds = constants.unixToInternal.sub(constants.minWall).addn(hrtime[0]);
  var nsec = Uint64.from(hrtime[1]);
  if (seconds.toUnsigned().shrn(33).eqn(0) === false) {
    return new Time(nsec, seconds.add(constants.minWall), null);
  }
  var hsec = Int64.from(hrtime[0]).muln(1000*1000*1000);
  var mono = Int64.from(hrtime[1]).add(hsec);
  return new Time(constants.hasMonotonic.or(seconds.toUnsigned().shln(constants.nsecShift)).or(nsec), mono, location.Local);
};

/**
 * Unix returns the local Time corresponding to the given Unix time,
 * sec seconds and nsec nanoseconds since January 1, 1970 UTC.
 * It is valid to pass nsec outside the range [0, 999999999].
 * Not all sec values have a corresponding time value. One such
 * value is 1<<63-1 (the largest int64 value).
 *
 * @param {Int64} sec Integer number of seconds
 * @param {Int64} nsec Integer number of nanoseconds.
 */
time.unix = function(sec, nsec) {
  internal.isInt64(sec);
  internal.isInt64(nsec);
  if (nsec.ltn(0) || nsec.gten(1e9)) {
    var n = nsec.divn(1e9);
    sec = sec.add(n);
    nsec = nsec.sub(n.muln(1e9));
    if (nsec.ltn(0)) {
      nsec = nsec.addn(1e9);
      sec = sec.subn(1);
    }
  }
  return unixTime(sec, nsec);
};

/**
 * Date returns the Time corresponding to
 *	yyyy-mm-dd hh:mm:ss + nsec nanoseconds
 * in the appropriate zone for that time in the given location.
 *
 * The month, day, hour, min, sec, and nsec values may be outside
 * their usual ranges and will be normalized during the conversion.
 * For example, October 32 converts to November 1.
 *
 * A daylight savings time transition skips or repeats times.
 * For example, in the United States, March 13, 2011 2:15am never occurred,
 * while November 6, 2011 1:15am occurred twice. In such cases, the
 * choice of time zone, and therefore the time, is not well-defined.
 * Date returns a time that is correct in one of the two zones involved
 * in the transition, but it does not guarantee which.
 *
 * Date throws an error if loc is nil.
 * year int, month Month, day, hour, min, sec, nsec int, loc *Location
 *
 * @private
 */
_date = function(year, month, day, hour, min, sec, nsec, loc) {
  internal.areIntegers([year, day, hour, min, sec, nsec]);
  if ((loc instanceof location.Location) === false) {
    throw new Error("time: missing location in call to Date");
  }
  if ((month instanceof Month) === false) {
    throw new Error("time: not a month");
  }
  /// Normalize month, overflowing into year.
  var m = month.month - 1;
  var results = norm(year, m, 12);
  year = results[0], m = results[1];
  month = new Month(m+1);

  /// Normalize nsec, sec, min, hour, overflowing into day.
  var results = norm(sec, nsec, 1e9);
  sec = results[0], nsec = results[1];

  var results = norm(min, sec, 60);
  min = results[0], sec = results[1];

  var results = norm(hour, min, 60);
  hour = results[0], min = results[1];

  var results = norm(day, hour, 24);
  day = results[0], hour = results[1];

  var y = Int64.from(year).sub(constants.absoluteZeroYear).toUnsigned();
  /// Compute days since the absolute epoch.

  /// Add in days from 400-year cycles.
  var n = y.divn(400);
  y = y.sub(n.muln(400));
  var d = n.mul(constants.daysPer400Years);

  /// Add in 100-year cycles.
  n = y.divn(100);
  y = y.sub(n.muln(100));
  d = d.add(n.mul(constants.daysPer100Years));

  /// Add in 4-year cycles.
  n = y.divn(4);
  y = y.sub(n.muln(4));
  d = d.add(n.mul(constants.daysPer4Years));

  /// Add in non-leap years.
  n = y.clone();
  d = d.add(n.muln(365));

  /// Add in days before this month.
  d = d.add(Uint64.from(_daysBefore[month.month-1]));
  if (isLeap(year) && month.month >= March.month) {
    d = d.addn(1); // February 29
  }

  /// Add in days before today.
  d = d.addn(day - 1);

  /// Add in time elapsed today.
  var abs = d.mul(constants.secondsPerDay);
  abs = abs.add(constants.secondsPerHour.muln(hour).add(constants.secondsPerMinute.muln(min)).addn(sec));

  var unix = abs.toSigned().add(constants.absoluteToInternal.add(constants.internalToUnix));
  /// Look for zone offset for t, so we can adjust to UTC.
  /// The lookup function expects UTC, so we pass t in the
  /// hope that it will not be too close to a zone transition,
  /// and then adjust if it is.
  var results = loc._lookup(unix);
  var offset = results.offset, start = results.start, end = results.end;
  if (offset !== 0) {
    var utc = unix.subn(offset);
    if (utc.lt(start)) {
      offset = loc._lookup(start.subn(1)).offset;
    } else if (utc.gte(end)) {
      offset = loc._lookup(end).offset;
    }
    unix = unix.subn(offset);
  }
  var t = unixTime(unix, Int64.from(nsec));
  t._setLoc(loc);
  return t;
};

var _parse = function(layout, value, defaultLocation, local) {
  internal.areStrings([layout, value]);
  var alayout = layout;
  var avalue = value;
  var rangeErrString = ""; // set if a value is out of range
  var amSet = false;       // do we need to subtract 12 from the hour for midnight?
  var pmSet = false;       // do we need to add 12 to the hour?

  var year     = 0,
    month      = 1, // January
    day        = 1,
    hour       = 0,
    min        = 0,
    sec        = 0,
    nsec       = 0,
    z          = null, // Location
    zoneOffset = -1,
    zoneName   = "";

  while (true) {
    var err = null;
    var results = nextStdChunk(layout);
    internal.isArray(results);
    var prefix = results[0], std = results[1], suffix = results[2];
    var stdstr = layout.slice(prefix.length, layout.length-suffix.length);
    try {
      value = skip(value, prefix);
    } catch (e) {
      internal.throwSystem(e);
      throw new ParseError(alayout, avalue, prefix, value, "");
    }
    if (std === 0) {
      if (value.length !== 0) {
        throw new ParseError(alayout, avalue, "", value, ": extra text: " + value);
      }
      break;
    }
    layout = suffix;
    var p = "";
    var mask = std & stdMask;
    if (mask === stdYear) {
      if (value.length < 2) {
        throw errBad;
      }
      var p = value.slice(0, 2);
      value = value.slice(2);
      year = atoi(p);
      if (year > 69) { // Unix time starts Dec 31 1969 in some time zones
        year = year + 1900;
      } else {
        year = year + 2000;
      }
    } else if (mask === stdLongYear) {
      if (value.length < 4 || !isDigit(value, 0)) {
        throw errBad;
      }
      p = value.slice(0, 4);
      value = value.slice(4);
      year = atoi(p);
    } else if (mask === stdMonth) {
      var results = lookup(shortMonthNames, value);
      month = results[0], value = results[1];
    } else if (mask === stdLongMonth) {
      var results = lookup(longMonthNames, value);
      month = results[0], value = results[1];
    } else if (mask === stdNumMonth || mask === stdZeroMonth) {
      var results = getnum(value, std === stdZeroMonth);
      month = results[0], value = results[1];
      if (month <= 0 || 12 < month) {
        rangeErrString = "month"; // TODO try/catch and rethrow with this val
      }
    } else if (mask === stdWeekDay) {
      /// Ignore weekday except for error checking.
      var results = lookup(shortDayNames, value);
      value = results[1];
    } else if (mask === stdLongWeekDay) {
      var results = lookup(longDayNames, value);
      value = results[1];
    } else if (mask === stdDay || mask === stdUnderDay || mask === stdZeroDay) {
      if (std === stdUnderDay && value.length > 0 && value[0] === ' ') {
        value = value.slice(1);
      }
      var results = getnum(value, std === stdZeroDay);
      day = results[0], value = results[1];
      if (day < 0) {
        /// Note that we allow any one- or two-digit day here.
        rangeErrString = "day"; // TODO
      }
    } else if (mask === stdHour) {
      var results = getnum(value, false);
      hour = results[0], value = results[1];
      if (hour < 0 || 24 <= hour) {
        rangeErrString = "hour"; // TODO
      }
    } else if (mask === stdHour12 || mask === stdZeroHour12) {
      var results = getnum(value, std === stdZeroHour12);
      hour = results[0], value = results[1];
      if (hour < 0 || 12 < hour) {
        rangeErrString = "hour";
      }
    } else if (mask === stdMinute || mask === stdZeroMinute) {
      var results = getnum(value, std === stdZeroMinute);
      min = results[0], value = results[1];
      if (min < 0 || 60 < min) {
        rangeErrString = "minute";
      }
    } else if (mask === stdSecond || mask === stdZeroSecond) {
      var results = getnum(value, std === stdZeroSecond);
      sec = results[0], value = results[1];
      if (sec < 0 || 60 < sec) {
        rangeErrString = "second";
      }
      /// Special case: do we have a fractional second but no
      /// fractional second in the format?
      if (value.length >= 2 && value[0] === '.' && isDigit(value, 1)) {
        var results = nextStdChunk(layout);
        std = results[1];
        std = std & stdMask;
        if (std === stdFracSecond0 || std === stdFracSecond9) {
          /// Fractional second in the layout; proceed normally
          /// this is a break out of the switch stmt; can't do that so use else.
        } else {
          /// No fractional second in the layout but we have one in the input.
          var n = 2;
          for (; n < value.length && isDigit(value, n); n++) {
          }
          var results = parseNanoseconds(value, n);
          nsec = results[0], rangeErrString = results[1];
          value = value.slice(n);
        }
      }
    } else if (mask === stdPM) {
      if (value.length < 2) {
        throw errBad;
      }
      p = value.slice(0, 2), value = value.slice(2);
      if (p === "PM") {
        pmSet = true;
      } else if (p === "AM") {
        amSet = true;
      } else {
        throw errBad;
      }
    } else if (mask === stdpm) {
      if (value.length < 2) {
        throw errBad;
      }
      p = value.slice(0, 2), value = value.slice(2);
      if (p === "pm") {
        pmSet = true;
      } else if (p === "pm") {
        amSet = true;
      } else {
        throw errBad;
      }
    } else if (mask === stdISO8601TZ || mask === stdISO8601ColonTZ ||
      mask === stdISO8601SecondsTZ || mask === stdISO8601ShortTZ ||
      mask === stdISO8601ColonSecondsTZ || mask === stdNumTZ ||
      mask === stdNumShortTZ || mask === stdNumColonTZ ||
      mask === stdNumSecondsTz || mask === stdNumColonSecondsTZ
    ) {
      if ((std === stdISO8601TZ || std === stdISO8601ShortTZ || std === stdISO8601ColonTZ) && value.length >= 1 && value[0] === 'Z') {
        value = value.slice(1);
        z = location.UTC;
        /// This is a break stmt in the original source but we can't break
      } else {
        var sign, hours, mins, seconds;
        if (std === stdISO8601ColonTZ || std === stdNumColonTZ) {
          if (value.length < 6) {
            throw errBad;
          }
          if (value[3] !== ':') {
            throw errBad;
          }
          sign = value.slice(0, 1);
          hours = value.slice(1, 3);
          mins = value.slice(4, 6);
          seconds = "00";
          value = value.slice(6);
        } else if (std === stdNumShortTZ || std === stdISO8601ShortTZ) {
          if (value.length < 3) {
            throw errBad;
          }
          sign = value.slice(0, 1);
          hours = value.slice(1, 3);
          mins = "00";
          seconds = "00";
          value = value.slice(3);
        } else if (std === stdISO8601ColonSecondsTZ || std === stdNumColonSecondsTZ) {
          if (value.length < 9) {
            throw errBad;
          }
          if (value[3] !== ':' || value[6] !== ':') {
            throw errBad;
          }
          sign = value.slice(0, 1);
          hours = value.slice(1, 3);
          mins = value.slice(4, 6);
          seconds = value.slice(7, 9);
          value = value.slice(9);
        } else if (std === stdISO8601SecondsTZ || std === stdNumSecondsTz) {
          if (value.length < 7) {
            throw errBad;
          }
          sign = value.slice(0, 1);
          hours = value.slice(1, 3);
          mins = value.slice(3, 5);
          seconds = value.slice(5, 7);
          value = value.slice(7);
        } else {
          if (value.length < 5) {
            throw errBad;
          }
          sign = value.slice(0, 1);
          hours = value.slice(1, 3);
          mins = value.slice(3, 5);
          seconds = "00";
          value = value.slice(5);
        }
        var hr = atoi(hours);
        var mm = atoi(mins);
        var ss = atoi(seconds);
        var zoneOffset = (hr*60+mm)*60 + ss; // offset is in seconds
        if (sign[0] === '-') {
          zoneOffset = -zoneOffset;
        } else if (sign[0] === '+') {
          /// ok
        } else {
          throw errBad;
        }
      }
    } else if (mask === stdTZ) {
      /// Does it look like a time zone?
      if (value.length >= 3 && value.slice(0, 3) === "UTC") {
        z = location.UTC;
        value = value.slice(3);
        break;
      }
      var n = parseTimeZone(value);
      zoneName = value.slice(0, n), value = value.slice(n);
    } else if (mask === stdFracSecond0) {
      /// stdFracSecond0 requires the exact number of digits as specified in
      /// the layout.
      var ndigit = 1 + (std >> stdArgShift);
      if (value.length < ndigit) {
        throw errBad;
      }
      var results = parseNanoseconds(value, ndigit);
      nsec = results[0], rangeErrString = results[1];
      value = value.slice(ndigit);
    } else if (mask === stdFracSecond9) {
      if (value.length < 2 || value[0] !== '.' || value[1] < '0' || '9' < value[1]) {
        /// Fractional second omitted. Original Go code has a break, we can't do
        /// that.
      } else {
        /// Take any number of digits, even more than asked for,
        /// because it is what the stdSecond case would do.
        var i = 0;
        while (i < 9 && i+1 < value.length && '0' <= value[i+1] && value[i+1] <= '9') {
          i++;
        }
        var results = parseNanoseconds(value, 1+i);
        nsec = results[0], rangeErrString = results[1];
        value = value.slice(1+i);
      }
    }
    if (rangeErrString !== "") {
      throw new ParseError(alayout, avalue, stdstr, value, ": " + rangeErrString + " out of range");
    }
  }
  if (pmSet && hour < 12) {
    hour += 12;
  } else if (amSet && hour === 12) {
    hour = 0;
  }

  /// Validate the day of the month.
  if (day < 1 || day > daysIn((new Month(month)), year)) {
    throw new ParseError(alayout, avalue, "", value, ": day out of range");
  }

  if (z !== null) {
    return _date(year, Month(month), day, hour, min, sec, nsec, z); // TODO
  }

  if (zoneOffset !== -1) {
    var t = _date(year, new Month(month), day, hour, min, sec, nsec, location.UTC);
    var o = Int64.from(zoneOffset);
    t._addSec(o.muln(-1));

    /// Look for local zone with the given offset.
    /// If that zone was in effect at the given time, use it.
    var results = local._lookup(t._unixSec());
    var name = results[0], offset = results[1];
    if (offset === zoneOffset && (zoneName === "" || name === zoneName)) {
      t._setLoc(local);
      return t;
    }

    /// Otherwise create fake zone to record offset.
    t._setLoc(location.fixedZone(zoneName, zoneOffset));
    return t;
  }

  if (zoneName !== "") {
    var t = _date(year, new Month(month), day, hour, min, sec, nsec, location.UTC);
    /// Look for local zone with the given offset.
    /// If that zone was in effect at the given time, use it.
    var offset = 0;
    try {
      offset = local._lookupName(zoneName, t._unixSec());
      internal.isInteger(offset);
      t._addSec(Int64.from(offset).muln(-1));
      t._setLoc(local);
      return t;
    } catch (e) { internal.throwSystem(e); /* otherwise fall through to below */ }

    /// Otherwise, create fake zone with unknown offset.
    if (zoneName.length > 3 && zoneName.slice(0, 3) === "GMT") {
      offset = atoi(zoneName.slice(3)); // Guaranteed OK by parseGMT.
      internal.isInteger(offset);
      offset = offset * 3600;
    }
    t._setLoc(location.fixedZone(zoneName, offset));
    return t;
  }
  return _date(year, new Month(month), day, hour, min, sec, nsec, defaultLocation);
};

/**
 * ParseInLocation is like Parse but differs in two important ways.
 * First, in the absence of time zone information, Parse interprets a time as UTC;
 * ParseInLocation interprets the time as in the given location.
 * Second, when given a zone offset or abbreviation, Parse tries to match it
 * against the Local location; ParseInLocation uses the given location.
 */
time.parseInLocation = function(layout, value, loc) {
  internal.areStrings([layout, value]);
  if ((loc instanceof location.Location) === false) {
    throw new Error("time: missing location in call to parseInLocation");
  }
  return _parse(layout, value, loc, loc);
};

var index = {
  Nanosecond: time.Nanosecond,
  Microsecond: time.Microsecond,
  Millisecond: time.Millisecond,
  Second: time.Second,
  Minute: time.Minute,
  Hour: time.Hour,

  Duration: Duration,

  Time: Time,

  Month: Month,

  /**
   * A Location maps time instants to the zone in use at that time. Typically,
   * the Location represents the collection of time offsets in use in a
   * geographical area, such as CEST and CET for central Europe.
   */
  Location: location.Location,

  /**
   * UTC represents Universal Coordinated Time (UTC).
   */
  UTC: location.UTC,

  /**
   * Local represents the system's local time zone.
   */
  Local: location.Local,

  January: January,
  February: February,
  March: March,
  April: April,
  May: May,
  June: June,
  July: July,
  August: August,
  September: September,
  October: October,
  November: November,
  December: December,

  Sunday: Sunday,
  Monday: Monday,
  Tuesday: Tuesday,
  Wednesday: Wednesday,
  Thursday: Thursday,
  Friday: Friday,
  Saturday: Saturday,

  ANSIC: "Mon Jan _2 15:04:05 2006",
  UnixDate: "Mon Jan _2 15:04:05 MST 2006",
  RubyDate: "Mon Jan 02 15:04:05 -0700 2006",
  RFC822: "02 Jan 06 15:04 MST",
  RFC822Z: "02 Jan 06 15:04 -0700", // RFC822 with numeric zone
  RFC850: "Monday, 02-Jan-06 15:04:05 MST",
  RFC1123: "Mon, 02 Jan 2006 15:04:05 MST",
  RFC1123Z: "Mon, 02 Jan 2006 15:04:05 -0700", // RFC1123 with numeric zone
  RFC3339: "2006-01-02T15:04:05Z07:00",
  RFC3339Nano: "2006-01-02T15:04:05.999999999Z07:00",
  Kitchen: "3:04PM",
  /**
   * Handy time stamps.
   */
  Stamp: "Jan _2 15:04:05",
  StampMilli: "Jan _2 15:04:05.000",
  StampMicro: "Jan _2 15:04:05.000000",
  StampNano: "Jan _2 15:04:05.000000000",

  /**
   * date(year int, month Month, day, hour, min, sec, nsec int, loc Location) Time
   *
   * Date returns the Time corresponding to
   *	yyyy-mm-dd hh:mm:ss + nsec nanoseconds
   * in the appropriate zone for that time in the given location.
   *
   * The month, day, hour, min, sec, and nsec values may be outside
   * their usual ranges and will be normalized during the conversion.
   * For example, October 32 converts to November 1.
   *
   * A daylight savings time transition skips or repeats times.
   * For example, in the United States, March 13, 2011 2:15am never occurred,
   * while November 6, 2011 1:15am occurred twice. In such cases, the
   * choice of time zone, and therefore the time, is not well-defined.
   * Date returns a time that is correct in one of the two zones involved
   * in the transition, but it does not guarantee which.
   *
   * Date throws an error if loc is nil.
   *
   * @param {integer} year
   * @param {Month} month
   * @param {integer} day
   * @param {integer} hour
   * @param {integer} min
   * @param {integer} sec
   * @param {integer} nsec
   * @param {Location} loc
   * @returns {Time}
   *
   * @example
   * var t := time.date(2009, time.November, 10, 23, 0, 0, 0, time.UTC)
   * console.log("Go launched at", t.local())
   */
  date: _date,

  /**
   * fixedZone(name string, offset int)
   *
   * FixedZone returns a Location that always uses the given zone name and
   * offset (seconds east of UTC).
   *
   * @param {string} name The name of the time zone.
   * @param {integer} offset The offset in seconds east of UTC.
   * @returns {Location}
   */
  fixedZone: location.fixedZone,

  /**
   * loadLocation(name string)
   *
   * LoadLocation synchronously returns the Location with the given name.
   *
   * If the name is "" or "UTC", LoadLocation returns UTC.
   * If the name is "Local", LoadLocation returns Local.
   *
   * Otherwise, the name is taken to be a location name corresponding to a file
   * in the IANA Time Zone database, such as "America/New_York".
   *
   * The time zone database needed by LoadLocation may not be
   * present on all systems, especially non-Unix systems.
   * LoadLocation looks in the directory or uncompressed zip file
   * named by the ZONEINFO environment variable, if any, then looks in
   * known installation locations on Unix systems,
   * and finally looks in internal/time/zoneinfo.zip.
   *
   * loadLocation throws an error if the location could not be found.
   *
   * @param {string} name The name of the location to load.
   * @returns {Location}
   */
  loadLocation: location.loadLocation,

  /**
   * Now returns the current local time.
   * @returns {Time}
   */
  now: _now,

  /**
   * Parse parses a formatted string and returns the time value it represents.
   * The layout defines the format by showing how the reference time,
   * defined to be
   *
   *      Mon Jan 2 15:04:05 -0700 MST 2006
   *
   * would be interpreted if it were the value; it serves as an example of
   * the input format. The same interpretation will then be made to the
   * input string.
   *
   * Predefined layouts ANSIC, UnixDate, RFC3339 and others describe standard
   * and convenient representations of the reference time. For more information
   * about the formats and the definition of the reference time, see the
   * documentation for ANSIC and the other constants defined by this package.
   * Also, the executable example for time.Format demonstrates the working
   * of the layout string in detail and is a good reference.
   *
   * Elements omitted from the value are assumed to be zero or, when
   * zero is impossible, one, so parsing "3:04pm" returns the time
   * corresponding to Jan 1, year 0, 15:04:00 UTC (note that because the year is
   * 0, this time is before the zero Time).
   * Years must be in the range 0000..9999. The day of the week is checked
   * for syntax but it is otherwise ignored.
   *
   * In the absence of a time zone indicator, Parse returns a time in UTC.
   *
   * When parsing a time with a zone offset like -0700, if the offset corresponds
   * to a time zone used by the current location (Local), then Parse uses that
   * location and zone in the returned time. Otherwise it records the time as
   * being in a fabricated location with time fixed at the given zone offset.
   *
   * When parsing a time with a zone abbreviation like MST, if the zone abbreviation
   * has a defined offset in the current location, then that offset is used.
   * The zone abbreviation "UTC" is recognized as UTC regardless of location.
   * If the zone abbreviation is unknown, Parse records the time as being
   * in a fabricated location with the given zone abbreviation and a zero offset.
   * This choice means that such a time can be parsed and reformatted with the
   * same layout losslessly, but the exact instant used in the representation will
   * differ by the actual zone offset. To avoid such problems, prefer time layouts
   * that use a numeric zone offset, or use ParseInLocation.
   *
   * parse throws an error if the input could not be parsed as a time.
   *
   * @param {string} layout The layout
   * @param {string} value Value to parse using the layout
   * @param {Location} loc Location to parse the value in.
   * @returns {Time}
   * @example
   * // See the example for time.Format for a thorough description of how
   * // to define the layout string to parse a time.Time value; Parse and
   * // Format use the same model to describe their input and output.

   * // longForm shows by example how the reference time would be represented in
   * // the desired layout.
   * const longForm = "Jan 2, 2006 at 3:04pm (MST)";
   * var t = time.parse(longForm, "Feb 3, 2013 at 7:54pm (PST)");
   * console.log(t);

   * // shortForm is another way the reference time would be represented
   * // in the desired layout; it has no time zone present.
   * // Note: without explicit zone, returns time in UTC.
   * const shortForm = "2006-Jan-02";
   * t = time.parse(shortForm, "2013-Feb-03");
   * console.log(t.toString());
   */
  parse: function(layout, value) {
    internal.areStrings([layout, value]);
    return _parse(layout, value, location.UTC, location.Local);
  },

  /**
   * parseInLocation is like parse but differs in two important ways.
   * First, in the absence of time zone information, Parse interprets a time as UTC;
   * ParseInLocation interprets the time as in the given location.
   * Second, when given a zone offset or abbreviation, Parse tries to match it
   * against the Local location; ParseInLocation uses the given location.
   * @param {string} layout The layout
   * @param {string} value Value to parse using the layout
   * @param {Location} loc Location to parse the value in.
   * @returns {Time}
   *
   * @example
   * var loc = time.loadLocation("Europe/Berlin")
   *
   * const longForm = "Jan 2, 2006 at 3:04pm (MST)"
   * var t = time.parseInLocation(longForm, "Jul 9, 2012 at 5:02am (CEST)", loc)
   * console.log(t)
   *
   * // Note: without explicit zone, returns time in given location.
   * const shortForm = "2006-Jan-02"
   * t, _ = time.parseInLocation(shortForm, "2012-Jul-09", loc)
   * console.log(t)
   */
  parseInLocation: time.parseInLocation,

  /**
   * parseDuration(string) time.Duration
   *
   * ParseDuration parses a duration string.
   * A duration string is a possibly signed sequence of
   * decimal numbers, each with optional fraction and a unit suffix,
   * such as "300ms", "-1.5h" or "2h45m".
   * Valid time units are "ns", "us" (or "µs"), "ms", "s", "m", "h".
   *
   * parseDuration throws an error if the input could not be parsed as
   * a duration.
   *
   * @param {string} s Duration to parse
   * @returns {Duration}
   */
  parseDuration: time.parseDuration,

  /**
   * sleep(dur time.Duration, cb function())
   *
   * Sleep calls cb after at least the duration d. A negative or zero duration
   * causes Sleep to return immediately.
   *
   * @param {Duration} dur Amount of time to sleep for
   * @param {function} Callback to hit after we have slept for that time
   */
  sleep: time.sleep,

  /**
   * Unix returns the local Time corresponding to the given Unix time,
   * sec seconds and nsec nanoseconds since January 1, 1970 UTC.
   * It is valid to pass nsec outside the range [0, 999999999].
   * Not all sec values have a corresponding time value. One such
   * value is 1<<63-1 (the largest int64 value).
   *
   * @param {internal.Int64} sec Seconds since the epoch
   * @param {internal.Int64} nsec Nanoseconds since the epoch
   * @returns {time.Time}
   */
  unix: time.unix,
};

module.exports = index;
