// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
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
var time = {};

// fmtFrac formats the fraction of v/10**prec (e.g., ".12345") into the
// buf ending at w, omitting trailing zeros. it omits the decimal
// point too when the fraction is 0. It returns the index where the
// output bytes begin and the value v/10**prec.
var fmtFrac = function(buf, w, v, prec) {
  internal.isUint64(v);
  internal.isInteger(prec);
  // Omit trailing zeros up to and including decimal point.
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

// fmtInt formats v into buf starting at w and working toward the beginning.
// It returns the index where the output begins.
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

  // Returns true if num is less than the duration. Num should be an integer.
  ltn(num) {
    internal.isInteger(num);
    return this.d.ltn(num);
  }

  // Returns true if num is less than or equal to the duration. Num should be an
  // integer.
  lten(num) {
    internal.isInteger(num);
    return this.d.lten(num);
  }

  gtn(num) {
    internal.isInteger(num);
    return this.d.gtn(num);
  }

  // String returns a string representing the duration in the form "72h3m0.5s".
  // Leading zero units are omitted. As a special case, durations less than one
  // second format use a smaller unit (milli-, micro-, or nanoseconds) to ensure
  // that the leading digit is non-zero. The zero duration formats as 0s.
  toString() {
    // Largest time is 2540400h10m10.000000000s
    var buf = new bytes.Slice(32);
    var w = buf.length;

    var u = this.d.clone().toUnsigned();
    var neg = this.d.ltn(0);
    if (neg) {
      u = u.muln(-1);
    }

    if (u.lt(Second.d.toUnsigned())) {
      // Special case: if duration is smaller than a second,
      // use smaller units, like 1.2ms
      var prec = 0;
      w--;
      buf.set(w, ord('s'));
      w--;
      if (u.eqn(0)) {
        return "0s";
      }
      if (u.lt(Microsecond.d.toUnsigned())) {
        // print nanoseconds
        prec = 0;
        buf.set(w, ord('n'));
      } else if (u.lt(Millisecond.d.toUnsigned())) {
        // print microseconds
        prec = 3;
        // U+00B5 'µ' micro sign == 0xC2 0xB5
        w--; // Need room for two bytes.
        bytes.copy(buf, w, "µ");
      } else {
        // print milliseconds
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

      // u is now integer seconds
      w = fmtInt(buf, w, u.modn(60));
      u = u.divn(60);

      // u is now integer minutes
      if (u.gtn(0)) {
        w--;
        buf.set(w, ord('m'));
        w = fmtInt(buf, w, u.modn(60));
        u = u.divn(60);

        // u is now integer hours
        // Stop at hours because days can be different lengths.
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

  // Truncate returns the result of rounding d toward zero to a multiple of m.
  // If m <= 0, Truncate returns d unchanged.
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

// absDate is like date but operates on an absolute time. yday === day of year
// returns [year, Month, day, yday];
var absDate = function(abs, full) {
  internal.isBool(full);
  internal.isUint64(abs);
  var d = abs.div(constants.secondsPerDay.toUnsigned());

  // Account for 400 year cycles.
  var n = d.div(constants.daysPer400Years.toUnsigned());
  var y = n.muln(400);
  d = d.sub((constants.daysPer400Years.toUnsigned()).mul(n));

  // Cut off 100-year cycles.
  // The last cycle has one extra leap year, so on the last day
  // of that year, day / constants.daysPer100Years will be 4 instead of 3.
  // Cut it back down to 3 by subtracting n>>2.
  n = d.div(constants.daysPer100Years.toUnsigned());
  n = n.sub(n.shrn(2));
  y = y.add(n.muln(100));
  d = d.sub(constants.daysPer100Years.toUnsigned().mul(n));

  // Cut off 4-year cycles.
  // The last cycle has a missing leap year, which does not
  // affect the computation.
  n = d.div(constants.daysPer4Years.toUnsigned());
  y = y.add(n.muln(4));
  d = d.sub(constants.daysPer4Years.toUnsigned().mul(n));

  // Cut off years within a 4-year cycle.
  // The last year is a leap year, so on the last day of that year,
  // day / 365 will be 4 instead of 3. Cut it back down to 3
  // by subtracting n>>2.
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
    // Leap year
    if (day.gtn(31+29-1)) {
      // After leap day; pretend it wasn't there.
      day = day.subn(1);
    } else if (day.eqn(31+29-1)) {
      return [year, February, 29, yday.toNumber()];
    }
  }
  // Estimate month on assumption that every month has 31 days.
  // The estimate may be too low by at most one month, so adjust.
  var month = new Month(day.divn(31).toNumber());
  var end = daysBefore[month.month+1];
  var begin;
  if (day.gten(end)) {
    month.month++;
    begin = end;
  } else {
    begin = daysBefore[month.month];
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

// absClock is like clock but operates on an absolute time.
// returns a clockResult {hour, min, sec}, all integers.
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

// appendInt appends the decimal form of x to b and returns the result.
// If the decimal form (excluding sign) is shorter than width, the result is padded with leading 0's.
// Duplicates functionality in strconv, but avoids dependency.
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

  // Assemble decimal in reverse order.
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

  // Add 0-padding.
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

// used by isoWeek
const Mon = 0;
const Tue = 1;
const Wed = 2;
const Thu = 3;
const Fri = 4;
const Sat = 5;
const Sun = 6;

// Unix returns the local Time corresponding to the given Unix time,
// sec seconds and nsec nanoseconds since January 1, 1970 UTC.
// It is valid to pass nsec outside the range [0, 999999999].
// Not all sec values have a corresponding time value. One such
// value is 1<<63-1 (the largest int64 value).
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

var daysIn = function(m, year) {
  if (m.equal(time.February) && isLeap(year)) {
    return 29;
  }
  return daysBefore[m] - daysBefore[m-1];
};

time._daysIn = daysIn;
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
// Handy time stamps.
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

// leadingInt consumes the leading [0-9]* from s.
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
      // overflow
      throw errLeadingInt;
    }
    x = x.muln(10).addn(c.charCodeAt(0)).subn('0'.charCodeAt(0));
    if (x.ltn(0)) {
      // overflow
      throw errLeadingInt;
    }
  }
  return [x, s.slice(i)];
};

// parseGMT parses a GMT time zone. The input string is known to start "GMT".
// The function checks whether that is followed by a sign and a number in the
// range -14 through 12 excluding zero.
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
  // We need nanoseconds, which means scaling by the number
  // of missing digits in the format, maximum length 10. If it's
  // longer than 10, we won't scale.
  var scaleDigits = 10 - nbytes;
  for (var i = 0; i < scaleDigits; i++) {
    ns *= 10;
  }
  return [ns, ""];
};

// parseTimeZone parses a time zone string and returns its length. Time zones
// are human-generated and unpredictable. We can't do precise error checking.
// On the other hand, for a correct parse there must be a time zone at the
// beginning of the string, so it's almost always true that there's one
// there. We look at the beginning of the string for a run of upper-case letters.
// If there are more than 5, it's an error.
// If there are 4 or 5 and the last is a T, it's a time zone.
// If there are 3, it's a time zone.
// Otherwise, other than special cases, it's not a time zone.
// GMT is special because it can have an hour offset.
var parseTimeZone = function(value) {
  internal.isString(value);
  if (value.length < 3) {
    throw new Error("too short");
  }
  // Special case 1: ChST and MeST are the only zones with a lower-case letter.
  if (value.length >= 4 && (value.slice(0, 4) === "ChST" || value.slice(0, 4) === "MeST")) {
    return 4;
  }
  // Special case 2: GMT may have an hour offset; treat it specially.
  if (value.slice(0, 3) === "GMT") {
    return parseGMT(value);
  }
  // How many upper-case letters are there? Need at least three, at most five.
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
    // Must end in T, except one special case.
    if (value[3] === 'T' || value.slice(0, 4) === "WITA") {
      return 4;
    }
  } else if (nUpper === 3) {
    return 3;
  }
  throw new Error("not valid");
};

// ParseInLocation is like Parse but differs in two important ways.
// First, in the absence of time zone information, Parse interprets a time as UTC;
// ParseInLocation interprets the time as in the given location.
// Second, when given a zone offset or abbreviation, Parse tries to match it
// against the Local location; ParseInLocation uses the given location.
time.parseInLocation = function(layout, value, loc) {
  internal.areStrings([layout, value]);
  if ((loc instanceof location.Location) === false) {
    throw new Error("time: missing location in call to parseInLocation");
  }
  return _parse(layout, value, loc, loc);
}

// leadingFraction consumes the leading [0-9]* from s.
// It is used only for fractions, so does not return an error on overflow,
// it just stops accumulating precision.
//
// [int64, float64, string]
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
      // It's possible for overflow to give a positive number, so take care.
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

// ParseDuration parses a duration string.
// A duration string is a possibly signed sequence of
// decimal numbers, each with optional fraction and a unit suffix,
// such as "300ms", "-1.5h" or "2h45m".
// Valid time units are "ns", "us" (or "µs"), "ms", "s", "m", "h".
time.parseDuration = function(s) {
  internal.isString(s);
  // [-+]?([0-9]*(\.[0-9]*)?[a-z]+)+
  var orig = s;
  var d = internal.Int64.from(0);
  var neg = false;

  // Consume [-+]?
  if (s !== "") {
    var c = s[0];
    if (c === '-' || c === '+') {
      neg = c === '-';
      s = s.slice(1);
    }
  }
  // Special case: if all that is left is "0", this is zero.
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

    // The next character must be [0-9.]
    if ((s[0] === '.' || '0' <= s[0] && s[0] <= '9') === false) {
      throw new Error("time: invalid duration " + orig);
    }
    // Consume [0-9]*
    var pl = s.length;
    try {
      var results = leadingInt(s);
      var v = results[0], s = results[1];
    } catch (e) {
      throw new Error("time: invalid duration " + orig);
    }
    var pre = pl !== s.length; // whether we consumed anything before a period

    // Consume (\.[0-9]*)?
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
      // no digits (e.g. ".s" or "-.s")
      throw new Error("time: invalid duration " + orig);
    }

    // Consume unit.
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
      // overflow
      throw new Error("time: invalid duration " + orig);
    }
    v = v.mul(unit);
    if (f.gtn(0)) {
      // float64 is needed to be nanosecond accurate for fractions of hours.
      // v >= 0 && (f*unit/scale) <= 3.6e+12 (ns/h, h is the largest unit)
      v = v.add(internal.Int64.from(f.toDouble() * unit.toDouble() / scale));
      if (v.ltn(0)) {
        // overflow
        throw new Error("time: invalid duration " + orig);
      }
    }
    d = d.add(v);
    if (d.ltn(0)) {
      // overflow
      throw new Error("time: invalid duration " + orig);
    }
  }

  if (neg) {
    d = d.muln(-1);
  }
  return new time.Duration(d);
};

module.exports = time;
