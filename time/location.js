"use strict";

const fs = require("fs");
const zlib = require("zlib");

const sync = require("../sync/index.js");
const internal = require("../internal/index.js");

const alpha = internal.INT64_MIN;
const omega = internal.INT64_MAX;

var location = {};

var localOnce = new sync.Once();

class lookupResult {
  constructor(name, offset, isDST, start, end) {
    internal.areStrings([name]);
    internal.isInteger(offset);
    internal.isBool(isDST);
    internal.isInt64(start);
    internal.isInt64(end);
    this.name = name;
    this.offset = offset;
    this.isDST = isDST;
    this.start = start;
    this.end = end;
  };
};

// Redefined below.
var utcLoc;

var initLocal;

// A Location maps time instants to the zone in use at that time. Typically, the
// Location represents the collection of time offsets in use in a geographical
// area, such as CEST and CET for central Europe.
class Location {
  constructor(name, zone, tx) {
    internal.isString(name);
    internal.isArray(zone);
    internal.isArray(tx);
    this.name = name;
    this.zone = zone;
    for (var i = 0; i < this.zone.length; i++) {
      var zone = this.zone[i];
      if (typeof zone === 'undefined') {
        throw new Error("invalid zone", zone);
      }
    }
    this.tx = tx;

    this.cacheStart = internal.Int64.from(0);
    this.cacheEnd = internal.Int64.from(0);
    this.cacheZone = null;
  };

  _get() {
    if (this === null) {
      return utcLoc;
    }
    if (this === location.Local) {
      localOnce.do(function() {
        Object.assign(location.Local, initLocal());
      });
    }
    return;
  };

  // lookup returns information about the time zone in use at an
  // instant in time expressed as seconds since January 1, 1970 00:00:00 UTC.
  //
  // The returned information gives the name of the zone (such as "CET"),
  // the start and end times bracketing sec when that zone is in effect,
  // the offset in seconds east of UTC (such as -5*60*60), and whether
  // the daylight savings is being observed at that time.
  _lookup(sec) {
    internal.isArray(this.zone);
    internal.isInt64(sec);
    if (this.zone.length === 0) {
      return new lookupResult("UTC", 0, false, alpha, omega);
    }
    if (this.cacheZone !== null && this.cacheStart.lte(sec) && sec.lt(this.cacheEnd)) {
      return new lookupResult(this.cacheZone.name, this.cacheZone.offset,
        this.cacheZone.isDST, this.cacheStart, this.cacheEnd);
    }

    if (this.tx.length === 0 || sec.lt(this.tx[0].when)) {
      var zone = this.zone[this._lookupFirstZone()];
      var end;
      if (this.tx.length > 0) {
        end = this.tx[0].when;
      } else {
        end = omega;
      }
      return new lookupResult(zone.name, zone.offset, zone.isDST, alpha, end);
    }

    // Binary search for entry with largest time <= sec.
    // Not using sort.Search to avoid dependencies.
    var tx = this.tx;
    var end = omega;
    var lo = 0;
    var hi = tx.length;
    while (hi-lo > 1) {
      var m = lo + Math.floor((hi-lo)/2);
      var lim = tx[m].when;
      if (sec.lt(lim)) {
        end = lim;
        hi = m;
      } else {
        lo = m;
      }
    }
    var zone = this.zone[tx[lo].index];
    return new lookupResult(zone.name, zone.offset, zone.isDST, tx[lo].when, end);
  };

  // lookupName returns information about the time zone with
  // the given name (such as "EST") at the given pseudo-Unix time
  // (what the given time of day would be in UTC).
  //
  // Returns an int64
  _lookupName(name, unix) {
    internal.isString(name);
    internal.isInt64(unix);

    this._get();
    // First try for a zone with the right name that was actually
    // in effect at the given time. (In Sydney, Australia, both standard
    // and daylight-savings time are abbreviated "EST". Using the
    // offset helps us pick the right one for the given time.
    // It's not perfect: during the backward transition we might pick
    // either one.)
    for (var i = 0; i < this.zone.length; i++) {
      var zone = this.zone[i];
      if (typeof zone === 'undefined') {
        throw new Error("invalid zone", zone);
      }
      if (zone.name === name) {
        var results = this._lookup(unix.subn(zone.offset));
        if (results.name === zone.name) {
          return results.offset;
        }
      }
    }

    // Otherwise fall back to an ordinary name match.
    for (var i = 0; i < this.zone.length; i++) {
      var zone = this.zone[i];
      if (zone.name === name) {
        return zone.offset;
      }
    }

    throw new Error("no zone with that name found");
  };

  // lookupFirstZone returns the index of the time zone to use for times
  // before the first transition time, or when there are no transition
  // times.
  //
  // The reference implementation in localtime.c from
  // http://www.iana.org/time-zones/repository/releases/tzcode2013g.tar.gz
  // implements the following algorithm for these cases:
  // 1) If the first zone is unused by the transitions, use it.
  // 2) Otherwise, if there are transition times, and the first
  //    transition is to a zone in daylight time, find the first
  //    non-daylight-time zone before and closest to the first transition
  //    zone.
  // 3) Otherwise, use the first zone that is not daylight time, if
  //    there is one.
  // 4) Otherwise, use the first zone.
  _lookupFirstZone() {
    // Case 1.
    if (this._firstZoneUsed() === false) {
      return 0;
    }

    // Case 2.
    if (this.tx.length > 0 && this.zone[this.tx[0].index].isDST === true) {
      for (var zi = l.tx[0].index - 1; zi >= 0; zi--) {
        if (this.zone[zi].isDST === false) {
          return zi;
        }
      }
    }

    // Case 3.
    for (var zi = 0; zi < this.zone.length; zi++) {
      if (this.zone[zi].isDST === false) {
        return zi;
      }
    }

    // Case 4.
    return 0;
  };

  // firstZoneUsed returns whether the first zone is used by some
  // transition.
  _firstZoneUsed() {
    for (var i = 0; i < this.tx.length; i++) {
      var tx = this.tx[i];
      if (tx.index === 0) {
        return true;
      }
    }
    return false;
  };

  toString() {
    return this.name;
  };
};

utcLoc = new Location("UTC", [], []);

const two = '2'.charCodeAt(0);
const three = '3'.charCodeAt(0);

var byteString = function(buf) {
  for (var i = 0; i < buf.length; i++) {
    if (buf[i] === 0) {
      return buf.slice(0, i).toString();
    }
  }
  return buf.toString();
};

// A zone represents a single time zone such as CEST or CET.
//
// offset: seconds east of UTC.
class zone {
  constructor(name, offset, isDST) {
    internal.areStrings([name]);
    internal.isInRange(offset, -86400, 86400);
    internal.isBool(isDST);
    this.name = name;
    this.offset = offset;
    this.isDST = isDST;
  };
};

// A zoneTrans represents a single time zone transition.
class zoneTrans {
  constructor(when, index, isstd, isutc) {
    internal.isInt64(when);
    internal.isInteger(index);
    this.when = when;
    this.index = index; // uint8
    if (typeof isstd === 'undefined' || (isstd !== true && isstd !== false)) {
      this.isstd = false;
    } else {
      this.isstd = isstd;
    }
    if (typeof isutc === 'undefined' || (isutc !== true && isutc !== false)) {
      this.isutc = false;
    } else {
      this.isutc = isutc;
    }
    internal.areBools([isstd, isutc]);
  };
};

class data {
  constructor(buf) {
    this.buf = buf;
    this.error = false;
  };

  read(i) {
    internal.isInteger(i);
    if (this.buf.length < i) {
      this.error = true;
      return null;
    }
    var val = this.buf.slice(0, i);
    this.buf = this.buf.slice(i);
    return val;
  };

  byte() {
    var p = this.read(1);
    if (p === null) {
      return null;
    }
    return p[0];
  };

  // big4 returns a uint64 (pretending to be a uint32)
  big4() {
    var p = this.read(4);
    if (p === null || p.length < 4) {
      throw new Error("buf: short read");
    }
    var i0 = internal.Uint64.from(p[0]);
    var i1 = internal.Uint64.from(p[1]);
    var i2 = internal.Uint64.from(p[2]);
    var i3 = internal.Uint64.from(p[3]);
    var val = i0.shln(24).or(i1.shln(16)).or(i2.shln(8)).or(i3);
    return val;
  };
};

// six big-endian 32-bit integers:
//	number of UTC/local indicators
//	number of standard/wall indicators
//	number of leap seconds
//	number of transition times
//	number of local time zones
//	number of characters of time zone abbrev strings
const NUTCLocal = 0;
const NStdWall = 1;
const NLeap = 2;
const NTime = 3;
const NZone = 4;
const NChar = 5;

// loadZoneData returns a Location from the buf.
var loadZoneData = function(buf) {
  var d = new data(buf);
  var magic = d.read(4).toString();
  // 4-byte magic "TZif"
  if (magic !== "TZif") {
    throw new Error("malformed time zone information");
  }

  // 1-byte version, then 15 bytes of padding
  var p = d.read(16);
  if (p.length !== 16 || p[0] !== 0 && p[0] !== two && p[0] !== three) {
    throw new Error("malformed time zone information");
  }

  var n = new Array(6);
  for (var i = 0; i < 6; i++) {
    try {
      var nn = d.big4();
    } catch (e) {
      internal.throwSystem(e);
      throw new Error("malformed time zone information");
    }
    n[i] = nn;
  }
  var l = n[NTime].muln(4).toNumber();
  var txtimes = new data(d.read(l));
  l = n[NTime].toNumber();
  var txzones = d.read(l);

  l = n[NZone].muln(6).toNumber();
  var zonedata = new data(d.read(l));

  l = n[NChar].toNumber();
  var abbrev = d.read(l);

  l = n[NLeap].muln(8).toNumber();
  buf = buf.slice(l);

  l = n[NStdWall].toNumber();
  var isstd = d.read(l);

  l = n[NUTCLocal].toNumber();
  var isutc = d.read(l);

  if (d.error === true) {
    throw new Error("malformed time zone information");
  }

  var numZones = n[NZone].toNumber();
  var zones = new Array(numZones);
  for (var i = 0; i < numZones; i++) {
    zones[i] = new zone("", 0, false);
    var num = zonedata.big4(); // this may throw
    if (num.gt(internal.INT32_MAX.toUnsigned())) {
      // manual uint32 => int32 cast. there is probably a safer way to do this.
      num = num.toSigned().sub(internal.UINT32_MAX).subn(1);
    } else {
      num = num.toSigned();
    }
    internal.isInRange(num.toNumber(), -86400, 86400);
    internal.isInt64(num);
    zones[i].offset = num.toNumber();
    var b = zonedata.byte();
    if (b === null || zonedata.error === true) { throw new Error("malformed time zone information"); }
    zones[i].isDST = b !== 0;
    var b = zonedata.byte();
    if (b === null || zonedata.error === true) { throw new Error("malformed time zone information"); }
    if (b > abbrev.length) {
      throw new Error("malformed time zone information");
    }
    zones[i].name = byteString(abbrev.slice(b));
  }
  var tx = new Array(n[NTime].toNumber());
  for (var i = 0; i < tx.length; i++) {
    tx[i] = new zoneTrans(internal.Int64.from(0), 0, false, false);
    var n = txtimes.big4();
    if (n.gt(internal.INT32_MAX.toUnsigned())) {
      // manual uint32 => int32 cast. there is probably a safer way to do this.
      n = n.toSigned().sub(internal.UINT32_MAX).subn(1);
    } else {
      n = n.toSigned();
    }
    tx[i].when = n;
    if (txzones[i] >= zones.length) {
      throw new Error("txzones longer than zones.length");
    }
    tx[i].index = txzones[i];
    if (i < isstd.length) {
      tx[i].isstd = isstd[i] !== 0;
    }
    if (i < isutc.length) {
      tx[i].isutc = isutc[i] !== 0;
    }
  }
  if (tx.length === 0) {
    // Build fake transition to cover all time.
    // This happens in fixed locations like "Etc/GMT0".
    tx = [new zoneTrans(alpha, 0)];
  }
  var l = new Location("", zones, tx);
  var nowms = internal.Int64.from(Date.now());
  var sec = nowms.divn(1000);
  for (var i = 0; i < tx.length; i++) {
    if (tx[i].when.lte(sec) && (i+1 === tx.length || sec.lt(tx[i+1].when))) {
      l.cacheStart = tx[i].when;
      l.cacheEnd = omega;
      if (i+1 < tx.length) {
        l.cacheEnd = tx[i+1].when;
      }
      l.cacheZone = l.zone[tx[i].index];
    }
  }
  return l;
};

var loadZoneZip = function(zipfile, name) {
  var buf = internal.deflateFileSync(zipfile, name);
  return loadZoneData(buf);
};

var zoneInfoOnce = new sync.Once();
var zoneinfo;
var zoneInfoOnceDo = function() {
  zoneinfo = process.env.ZONEINFO;
};

var loadZoneFile = function(dir, name) {
  if (dir.length > 4 && dir.slice(dir.length-4) === ".zip") {
    return loadZoneZip(dir, name);
  }
  if (dir !== "") {
    name = dir + "/" + name;
  }
  // this may throw
  var buf = fs.readFileSync(name);
  return loadZoneData(buf);
};

// Many systems use /usr/share/zoneinfo, Solaris 2 has
// /usr/share/lib/zoneinfo, IRIX 6 has /usr/lib/locale/TZ.
var zoneDirs = [
  "/usr/share/zoneinfo",
  "/usr/share/lib/zoneinfo",
  "/usr/lib/locale/TZ",
];

var isNotExist = function(e) {
  if (e === null || typeof e === 'undefined') {
    return false;
  }
  return e.code === 'ENOENT'; // may be a better way to do this, eh.
};

// matches loadLocation in zoneinfo_unix.go
var _loadLocation = function(tzname) {
  var firstErr = null;
  for (var i = 0; i < zoneDirs.length; i++) {
    var zoneDir = zoneDirs[i];
    try {
      var z = loadZoneFile(zoneDir, tzname);
      z.name = tzname;
      return z;
    } catch (e) {
      internal.throwSystem(e);
      if (isNotExist(e) === false && firstErr === null) {
        firstErr = e;
      }
    }
  }
  if (firstErr !== null) {
    throw firstErr;
  }
  throw new Error("unknown time zone " + tzname);
};

// containsDotDot reports whether s contains "..".
var containsDotDot = function(s) {
  internal.areStrings([s]);
  if (s.length < 2) {
    return false;
  }
  for (var i = 0; i < s.length-1; i++) {
    if (s[i] === '.' && s[i+1] === '.') {
      return true;
    }
  }
  return false;
};

var loadLocation = function(name) {
  internal.isString(name);
  if (name === "" || name === "UTC") {
    return time.UTC;
  }
  if (name === "Local") {
    return location.Local;
  }
  if (containsDotDot(name) || name[0] === '/' || name[0] === '\\') {
    // No valid IANA Time Zone name contains a single dot,
    // much less dot dot. Likewise, none begin with a slash.
    throw new Error("time: invalid location name " + name);
  }
  zoneInfoOnce.do(zoneInfoOnceDo);
  if (typeof zoneinfo !== 'undefined' && zoneinfo !== "") {
    try {
      var z = loadZoneFile(zoneinfo, name);
      z.name = name;
      return z;
    } catch (e) { internal.throwSystem(e); }
  }
  return _loadLocation(name);
};

initLocal = function() {
  if (typeof process.env.TZ === 'undefined') {
    try {
      var z = loadZoneFile("", "/etc/localtime");
      z.name = "Local";
      return z;
    } catch (e) { internal.throwSystem(e); }
  }
  var tz = process.env.TZ;
  if (tz !== "" && tz !== "UTC") {
    try {
      var z1 = loadLocation(tz);
      return z1;
    } catch (e) { internal.throwSystem(e); }
  }
  return utcLoc;
};

var fixedZone = function(name, offset) {
  internal.isString(name);
  internal.isInteger(offset);
  var z = new zone(name, offset, false);
  var tx = new zoneTrans(alpha, 0, false, false);
  var l = new Location(name, [z], [tx]);
  l.cacheStart = alpha;
  l.cacheEnd = omega;
  l.cacheZone = z;
  return l;
};

var resetLocalOnce = function() {
  localOnce = new sync.Once();
  Object.assign(location.Local, {
    name: "Local",
    zone: [],
    tx: [],
    cacheStart: internal.Int64.from(0),
    cacheEnd: internal.Int64.from(0),
    cacheZone: null,
  });
};

var initTestingZone = function() {
  var z = loadZoneFile(__dirname + "/../internal/time/zoneinfo.zip", "America/Los_Angeles");
  z.name = "Local";
  return z;
};

var setToPacific = function() {
  resetLocalOnce();
  localOnce.do(function() {
    Object.assign(location.Local, initTestingZone());
  });
};

location = {
  fixedZone: fixedZone,
  initLocal: initLocal,
  loadLocation: loadLocation,
  // NB: you must ALWAYS override this using Object.assign, otherwise other
  // imports will refer to a stale object.
  Local: new Location("Local", [], []),
  Location: Location,
  UTC: utcLoc,
  _setToPacific: setToPacific,
};

module.exports = location;
