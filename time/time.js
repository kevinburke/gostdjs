"use strict";

const bits = require("../internal/64bitints.js");
const Uint64 = bits.Uint64;
const Int64 = bits.Int64;

class Duration {
  constructor(u64) {
    this.d = Uint64.from(u64);
  };

  mul(u64) {
    return new Duration(this.d.mul(u64));
  };

}

class Time {
  constructor(wall, ext, loc) {
    // uint64
    if (typeof wall === 'undefined' || wall === null) {
      wall = Uint64.from(0);
    }
    this.wall = wall;
    // int64
    if (typeof ext === 'undefined' || ext === null) {
      ext = Int64.from(0);
    }
    this.ext = ext;

    // not specified yet by anything
    this.loc = loc;
  };

  // IsZero reports whether t represents the zero time instant,
  // January 1, year 1, 00:00:00 UTC.
  isZero() {
    return this.sec().eqn(0) && this.nsec().eqn(0);
  };

  // nsec returns the time's nanoseconds.
  nsec() {
    return this.wall.and(nsecMask);
  };

  // sec returns the time's seconds since Jan 1 year 1.
  sec() {
    if (this.wall.and(hasMonotonic).eqn(0) === false) {
      return wallToInternal.add((this.wall.shln(1).shr(nsecShift.addn(1))).toSigned());
    }
    return this.ext;
  };
};

const secondsPerMinute = Int64.from(60);
const secondsPerHour   = Int64.from(60 * 60);
const secondsPerDay    = Int64.from(24 * secondsPerHour);
const wallToInternal = Int64.from((1884*365 + Math.floor(1884/4) - Math.floor(1884/100) + Math.floor(1884/400)) * secondsPerDay);

const unixToInternal = Int64.from((1969*365 + Math.floor(1969/4) - Math.floor(1969/100) + Math.floor(1969/400)) * secondsPerDay);
const hasMonotonic = Uint64.from(1).shln(63);
const minWall = wallToInternal;
const nsecMask  = Uint64.from(1).shln(30).subn(1);
const nsecShift    = Uint64.from(30);

const Nanosecond = new Duration(1);
const sixty = new Duration(60);
const thousand = new Duration(1000);
const Microsecond = Nanosecond.mul(thousand);
const Millisecond = Microsecond.mul(thousand);
const Second = Millisecond.mul(thousand);
const Minute = Second.mul(sixty);
const Hour = Minute.mul(sixty);

var time = {
  Nanosecond: Nanosecond,
  Microsecond: Microsecond,
  Millisecond: Millisecond,
  Second: Second,
  Minute, Minute,
  Duration: Duration,
  Time: Time,

  now: function() {
    var nowms = Uint64.from(Date.now());
    var seconds = nowms.divn(1000);
    var nsec = nowms.modn(1000).muln(1000*1000);
    var hrtime = process.hrtime();
    var seconds = unixToInternal.sub(minWall).addn(hrtime[0]);
    var nsec = Uint64.from(hrtime[1]);
    if (seconds.toUnsigned().shrn(33).eqn(0) === false) {
      return new Time(nsec, seconds.add(minWall), null);
    }
    var hsec = Int64.from(hrtime[0]).muln(1000*1000*1000);
    var mono = Int64.from(hrtime[1]).add(hsec);
    return new Time(hasMonotonic.or(seconds.toUnsigned().shln(nsecShift)).or(nsec), mono, null);
  },

  // Sleep hits the callback when at least the elapsed amount of time has run.
  // Note that some versions of Node do not implement timers correctly, and the
  // event loop may skew the time taken to return a value.
  sleep: function(dur, cb) {
    if ((dur instanceof Duration) === false) {
      throw new Error("sleep: not passed a Duration (got " + JSON.stringify(dur) + ")");
    }
    if (typeof cb !== "function") {
      throw new Error("sleep: callback should be a function");
    }
    setTimeout(cb, dur.d*time.Millisecond);
  },
};

module.exports = time;
