const util = require('util');

const mocha = require("mocha");
const should = require("should");

const internal = require("../internal/index.js");

const time = require("./index.js");
const location = require("./location.js"); // avoid using this import

describe("time", function() {
  before(function() {
    location._setToPacific();
  });

  it("Duration", function() {
    time.Second.d.gtn(0).should.equal(true, "time.Second.d should be greater than 0");
  });

  it("Month", function() {
    var m = new time.Month(2);
    m.equal(time.February).should.equal(true);
    m.equal(time.March).should.equal(false);
  });

  it("isZero", function() {
    var t = time.now();
    t.isZero().should.equal(false);
    t = new time.Time(internal.Uint64.from(0), internal.Int64.from(0), null);
    t.isZero().should.equal(true);

    if (typeof time.Time.isZero === "function") {
      throw new Error("time.Time.isZero statically should not be a function");
    }
  });

  it("sleep", function(done) {
    var start = Date.now();
    var d = time.Microsecond.mul(new time.Duration(5));
    var start = time.now();
    time.sleep(d, function() {
      done();
    });
  });

  it("loadLocation", function() {
    var loc = time.loadLocation("Asia/Jerusalem");
    should(loc.tx.length > 0).equal(true);
    should(loc.zone.length > 0).equal(true);
    loc.name.should.equal("Asia/Jerusalem");
  });

  it("loadLocation validates names", function() {
    currentZ = process.env.ZONEINFO;
    try {
      process.env.ZONEINFO = "";

      var bad = [
        "/usr/foo/Foo",
        "\\UNC\foo",
        "..",
        "a..",
      ];
      for (var i = 0; i < bad.length; i++) {
        should.throws(function() {
          time.loadLocation(bad[i]);
        }, "invalid location");
      }
    } finally {
      process.env.ZONEINFO = currentZ;
    }
  });

  it("loadLocation names", function() {
    time.UTC.toString().should.equal("UTC");
  });

  var parseTests = [
    ["ANSIC", time.ANSIC, "Thu Feb  4 21:00:57 2010", false, true, 1, 0],
    ["UnixDate", time.UnixDate, "Thu Feb  4 21:00:57 PST 2010", true, true, 1, 0],
    ["RubyDate", time.RubyDate, "Thu Feb 04 21:00:57 -0800 2010", true, true, 1, 0],
    ["RFC850", time.RFC850, "Thursday, 04-Feb-10 21:00:57 PST", true, true, 1, 0],
    ["RFC1123", time.RFC1123, "Thu, 04 Feb 2010 21:00:57 PST", true, true, 1, 0],
    ["RFC1123", time.RFC1123, "Thu, 04 Feb 2010 22:00:57 PDT", true, true, 1, 0],
    ["RFC1123Z", time.RFC1123Z, "Thu, 04 Feb 2010 21:00:57 -0800", true, true, 1, 0],
    ["RFC3339", time.RFC3339, "2010-02-04T21:00:57-08:00", true, false, 1, 0],
    ["custom: \"2006-01-02 15:04:05-07\"", "2006-01-02 15:04:05-07", "2010-02-04 21:00:57-08", true, false, 1, 0],
    // Optional fractional seconds.
    ["ANSIC", time.ANSIC, "Thu Feb  4 21:00:57.0 2010", false, true, 1, 1],
    ["UnixDate", time.UnixDate, "Thu Feb  4 21:00:57.01 PST 2010", true, true, 1, 2],
    ["RubyDate", time.RubyDate, "Thu Feb 04 21:00:57.012 -0800 2010", true, true, 1, 3],
    ["RFC850", time.RFC850, "Thursday, 04-Feb-10 21:00:57.0123 PST", true, true, 1, 4],
    ["RFC1123", time.RFC1123, "Thu, 04 Feb 2010 21:00:57.01234 PST", true, true, 1, 5],
    ["RFC1123Z", time.RFC1123Z, "Thu, 04 Feb 2010 21:00:57.01234 -0800", true, true, 1, 5],
    ["RFC3339", time.RFC3339, "2010-02-04T21:00:57.012345678-08:00", true, false, 1, 9],
    ["custom: \"2006-01-02 15:04:05\"", "2006-01-02 15:04:05", "2010-02-04 21:00:57.0", false, false, 1, 0],
    // Amount of white space should not matter.
    ["ANSIC", time.ANSIC, "Thu Feb 4 21:00:57 2010", false, true, 1, 0],
    ["ANSIC", time.ANSIC, "Thu      Feb     4     21:00:57     2010", false, true, 1, 0],
    // Case should not matter
    ["ANSIC", time.ANSIC, "THU FEB 4 21:00:57 2010", false, true, 1, 0],
    ["ANSIC", time.ANSIC, "thu feb 4 21:00:57 2010", false, true, 1, 0],
    // Fractional seconds.
    ["millisecond", "Mon Jan _2 15:04:05.000 2006", "Thu Feb  4 21:00:57.012 2010", false, true, 1, 3],
    ["microsecond", "Mon Jan _2 15:04:05.000000 2006", "Thu Feb  4 21:00:57.012345 2010", false, true, 1, 6],
    ["nanosecond", "Mon Jan _2 15:04:05.000000000 2006", "Thu Feb  4 21:00:57.012345678 2010", false, true, 1, 9],
    // Leading zeros in other places should not be taken as fractional seconds.
    ["zero1", "2006.01.02.15.04.05.0", "2010.02.04.21.00.57.0", false, false, 1, 1],
    ["zero2", "2006.01.02.15.04.05.00", "2010.02.04.21.00.57.01", false, false, 1, 2],
    // Month and day names only match when not followed by a lower-case letter.
    ["Janet", "Hi Janet, the Month is January: Jan _2 15:04:05 2006", "Hi Janet, the Month is February: Feb  4 21:00:57 2010", false, true, 1, 0],

    // GMT with offset.
    ["GMT-8", time.UnixDate, "Fri Feb  5 05:00:57 GMT-8 2010", true, true, 1, 0],

    // Accept any number of fractional second digits (including none) for .999...
    // In Go 1, .999... was completely ignored in the format, meaning the first two
    // cases would succeed, but the next four would not. Go 1.1 accepts all six.
    ["", "2006-01-02 15:04:05.9999 -0700 MST", "2010-02-04 21:00:57 -0800 PST", true, false, 1, 0],
    ["", "2006-01-02 15:04:05.999999999 -0700 MST", "2010-02-04 21:00:57 -0800 PST", true, false, 1, 0],
    ["", "2006-01-02 15:04:05.9999 -0700 MST", "2010-02-04 21:00:57.0123 -0800 PST", true, false, 1, 4],
    ["", "2006-01-02 15:04:05.999999999 -0700 MST", "2010-02-04 21:00:57.0123 -0800 PST", true, false, 1, 4],
    ["", "2006-01-02 15:04:05.9999 -0700 MST", "2010-02-04 21:00:57.012345678 -0800 PST", true, false, 1, 9],
    ["", "2006-01-02 15:04:05.999999999 -0700 MST", "2010-02-04 21:00:57.012345678 -0800 PST", true, false, 1, 9],

    // issue 4502.
    ["", time.StampNano, "Feb  4 21:00:57.012345678", false, false, -1, 9],
    ["", "Jan _2 15:04:05.999", "Feb  4 21:00:57.012300000", false, false, -1, 4],
    ["", "Jan _2 15:04:05.999", "Feb  4 21:00:57.012345678", false, false, -1, 9],
    ["", "Jan _2 15:04:05.999999999", "Feb  4 21:00:57.0123", false, false, -1, 4],
  ];

  var checkTime = function(t, test) {
    // The time should be Thu Feb  4 21:00:57 PST 2010
    if (test[5] >= 0 && test[5]*t.year() !== 2010) {
      throw new Error(util.format("%s: bad year: %d not %d", test[0], t.year(), 2010));
    }
    t.month().equal(time.February).should.equal(true, util.format("%s: bad month: %s not %s", test[0], t.month(), time.February));
    t.day().should.equal(4, util.format("%s: bad day: %d not %d", test[0], t.day(), 4));
    t.hour().should.equal(21, util.format("%s: bad hour: %d not %d", test[0], t.hour(), 21));
    t.minute().should.equal(0, util.format("%s: bad minute: %d not %d", test[0], t.minute(), 0));
    t.second().should.equal(57, util.format("%s: bad second: %d not %d", test[0], t.second(), 57));
    // Nanoseconds must be checked against the precision of the input.
    var nanosec = internal.Uint64.from("012345678".slice(0, test[6])+"000000000".slice(0, 9-test[6]));
    t.nanosecond().toString().should.equal(nanosec.toString(), util.format("%s: bad nanosecond: %d not %d", test[0], t.nanosecond(), nanosec));

    var result = t.zone();
    var name = result.name, offset = result.offset;
    if (test[3] === true) {
      offset.should.equal(-28800, util.format("%s: layout '%s', value '%s': bad tz offset: %s %d not %d", test[0], test[1], test[2], name, offset, -28800));
    }
    if (test[4] === true) {
      t.weekday().equal(time.Thursday).should.equal(true, util.format("%s: bad weekday: %s not %s", test[0], t.weekday(), time.Thursday));
    }
  };

  it("parse", function() {
    for (var i = 0; i < parseTests.length; i++) {
      var test = parseTests[i];
      var t = time.parse(test[1], test[2]);
      (typeof t !== 'undefined' && t !== null).should.equal(true, "parse: null result " + JSON.stringify(t));
      checkTime(t, test);
    }
  });

  // array values:
  // type parsedTime struct {
  //Year                 int
  //Month                Month
  //Day                  int
  //Hour, Minute, Second int // 15:04:05 is 15, 4, 5.
  //Nanosecond           int // Fractional second.
  //Weekday              Weekday
  //ZoneOffset           int    // seconds east of UTC, e.g. -7*60*60 for -0700
  //Zone                 string // e.g., "MST"
  //}

  var utctests = [
    [0, [1970, time.January, 1, 0, 0, 0, 0, time.Thursday, 0, "UTC"]],
    [1221681866, [2008, time.September, 17, 20, 4, 26, 0, time.Wednesday, 0, "UTC"]],
    [-1221681866, [1931, time.April, 16, 3, 55, 34, 0, time.Thursday, 0, "UTC"]],
    [-11644473600, [1601, time.January, 1, 0, 0, 0, 0, time.Monday, 0, "UTC"]],
    [599529660, [1988, time.December, 31, 0, 1, 0, 0, time.Saturday, 0, "UTC"]],
    [978220860, [2000, time.December, 31, 0, 1, 0, 0, time.Sunday, 0, "UTC"]],
  ];

  var same = function(t1, t2) {
    // Check aggregates.
    var dateResult = t1.date();
    var year = dateResult.year, month = dateResult.month, day = dateResult.day;
    var clockResult = t1.clock();
    var hour = clockResult.hour, min = clockResult.min, sec = clockResult.sec;
    var zoneResult = t1.zone();
    var name = zoneResult.name, offset = zoneResult.offset;
    year.should.equal(t2[0]);
    month.equal(t2[1]).should.equal(true, "months differ: " + month + t2[1]);
    day.should.equal(t2[2]);
    hour.should.equal(t2[3]);
    min.should.equal(t2[4]);
    sec.should.equal(t2[5]);
    offset.should.equal(t2[8]);
    name.should.equal(t2[9]);

    // Check individual entries.
    t1.year().should.equal(t2[0]);
    t1.month().equal(t2[1]).should.equal(true);
    t1.day().should.equal(t2[2]);
    t1.hour().should.equal(t2[3]);
    t1.minute().should.equal(t2[4]);
    t1.second().should.equal(t2[5]);
    t1.nanosecond().should.equal(t2[6]);
    t1.weekday().equal(t2[7]).should.equal(true);
  };

  it("seconds to utc", function() {
    for (var i = 0; i < utctests.length; i++) {
      var test = utctests[i];
      var sec = internal.Int64.from(test[0]);
      var golden = test[1];
      var tm = time.unix(sec, internal.Int64.from(0)).utc();
      var newsec = tm.unix();
      newsec.toString().should.equal(sec.toString(), util.format("SecondsToUTC(%d).Seconds() = %d", sec, newsec));
      same(tm, golden);
    }
  });

  var nanoutctests = [
    [0, [1970, time.January, 1, 0, 0, 0, 1e8, time.Thursday, 0, "UTC"]],
    [1221681866, [2008, time.September, 17, 20, 4, 26, 2e8, time.Wednesday, 0, "UTC"]],
  ];

  it("nanoseconds to utc", function() {
    for (var i = 0; i < nanoutctests.length; i++) {
      var test = nanoutctests[i];
      var nsec = internal.Int64.from(test[0]).muln(1e9).addn(test[1][6]);
      var tm = time.unix(internal.Int64.from(0), nsec).utc();
      var ux = tm.unix();
      var newnsec = tm.unix().muln(1e9).addn(tm.nanosecond());
      newnsec.toString().should.equal(nsec.toString(), util.format("NanosecondsToUTC(%d).Nanoseconds() = %d", nsec, newnsec));
      same(tm, test[1]);
    }
  });

  var localtests = [
    [0, [1969, time.December, 31, 16, 0, 0, 0, time.Wednesday, -8 * 60 * 60, "PST"]],
    [1221681866, [2008, time.September, 17, 13, 4, 26, 0, time.Wednesday, -7 * 60 * 60, "PDT"]],
  ];


  it("seconds to local time", function() {
    for (var i = 0; i < localtests.length; i++) {
      var test = localtests[i];
      var sec = internal.Int64.from(test[0]);
      var golden = test[1];
      var tm = time.unix(sec, internal.Int64.from(0));
      var newsec = tm.unix();
      newsec.toString().should.equal(sec.toString(), util.format("SecondsToLocalTime(%d).Seconds() = %d", sec, newsec));
      same(tm, golden);
    }
  });

  var isoWeekTests = [
    [1981, 1, 1, 1981, 1], [1982, 1, 1, 1981, 53], [1983, 1, 1, 1982, 52],
    [1984, 1, 1, 1983, 52], [1985, 1, 1, 1985, 1], [1986, 1, 1, 1986, 1],
    [1987, 1, 1, 1987, 1], [1988, 1, 1, 1987, 53], [1989, 1, 1, 1988, 52],
    [1990, 1, 1, 1990, 1], [1991, 1, 1, 1991, 1], [1992, 1, 1, 1992, 1],
    [1993, 1, 1, 1992, 53], [1994, 1, 1, 1993, 52], [1995, 1, 2, 1995, 1],
    [1996, 1, 1, 1996, 1], [1996, 1, 7, 1996, 1], [1996, 1, 8, 1996, 2],
    [1997, 1, 1, 1997, 1], [1998, 1, 1, 1998, 1], [1999, 1, 1, 1998, 53],
    [2000, 1, 1, 1999, 52], [2001, 1, 1, 2001, 1], [2002, 1, 1, 2002, 1],
    [2003, 1, 1, 2003, 1], [2004, 1, 1, 2004, 1], [2005, 1, 1, 2004, 53],
    [2006, 1, 1, 2005, 52], [2007, 1, 1, 2007, 1], [2008, 1, 1, 2008, 1],
    [2009, 1, 1, 2009, 1], [2010, 1, 1, 2009, 53], [2010, 1, 1, 2009, 53],
    [2011, 1, 1, 2010, 52], [2011, 1, 2, 2010, 52], [2011, 1, 3, 2011, 1],
    [2011, 1, 4, 2011, 1], [2011, 1, 5, 2011, 1], [2011, 1, 6, 2011, 1],
    [2011, 1, 7, 2011, 1], [2011, 1, 8, 2011, 1], [2011, 1, 9, 2011, 1],
    [2011, 1, 10, 2011, 2], [2011, 1, 11, 2011, 2], [2011, 6, 12, 2011, 23],
    [2011, 6, 13, 2011, 24], [2011, 12, 25, 2011, 51], [2011, 12, 26, 2011, 52],
    [2011, 12, 27, 2011, 52], [2011, 12, 28, 2011, 52], [2011, 12, 29, 2011, 52],
    [2011, 12, 30, 2011, 52], [2011, 12, 31, 2011, 52], [1995, 1, 1, 1994, 52],
    [2012, 1, 1, 2011, 52], [2012, 1, 2, 2012, 1], [2012, 1, 8, 2012, 1],
    [2012, 1, 9, 2012, 2], [2012, 12, 23, 2012, 51], [2012, 12, 24, 2012, 52],
    [2012, 12, 30, 2012, 52], [2012, 12, 31, 2013, 1], [2013, 1, 1, 2013, 1],
    [2013, 1, 6, 2013, 1], [2013, 1, 7, 2013, 2], [2013, 12, 22, 2013, 51],
    [2013, 12, 23, 2013, 52], [2013, 12, 29, 2013, 52], [2013, 12, 30, 2014, 1],
    [2014, 1, 1, 2014, 1], [2014, 1, 5, 2014, 1], [2014, 1, 6, 2014, 2],
    [2015, 1, 1, 2015, 1], [2016, 1, 1, 2015, 53], [2017, 1, 1, 2016, 52],
    [2018, 1, 1, 2018, 1], [2019, 1, 1, 2019, 1], [2020, 1, 1, 2020, 1],
    [2021, 1, 1, 2020, 53], [2022, 1, 1, 2021, 52], [2023, 1, 1, 2022, 52],
    [2024, 1, 1, 2024, 1], [2025, 1, 1, 2025, 1], [2026, 1, 1, 2026, 1],
    [2027, 1, 1, 2026, 53], [2028, 1, 1, 2027, 52], [2029, 1, 1, 2029, 1],
    [2030, 1, 1, 2030, 1], [2031, 1, 1, 2031, 1], [2032, 1, 1, 2032, 1],
    [2033, 1, 1, 2032, 53], [2034, 1, 1, 2033, 52], [2035, 1, 1, 2035, 1],
    [2036, 1, 1, 2036, 1], [2037, 1, 1, 2037, 1], [2038, 1, 1, 2037, 53],
    [2039, 1, 1, 2038, 52], [2040, 1, 1, 2039, 52],
  ];

  it("isoWeek", function() {
    // Selected dates and corner cases
    for (var i = 0; i < isoWeekTests.length; i++) {
      var wt = isoWeekTests[i];
      var dt = time.date(wt[0], new time.Month(wt[1]), wt[2], 0, 0, 0, 0, time.Local);
      var weekResults = dt.isoWeek();
      var year = weekResults.year, week = weekResults.week;
      week.should.equal(wt[4], util.format("got %d/%d; expected %d/%d for %d-%d-%d",
          year, week, wt[3], wt[4], wt[0], wt[1], wt[2]));
      year.should.equal(wt[3], util.format("got %d/%d; expected %d/%d for %d-%d-%d",
          year, week, wt[3], wt[4], wt[0], wt[1], wt[2]));
    }

    // The only real invariant: Jan 04 is in week 1
    for (var year = 1950; year < 2100; year++) {
      var weekResults = time.date(year, time.January, 4, 0, 0, 0, 0, time.UTC).isoWeek();
      var y = weekResults.year, w = weekResults.week;
      w.should.equal(1);
      year.should.equal(y);
    }
  });

  // year, month, day, hour, min, sec, nsec int
  // z                                      *Location
  // unix                                   int64
  var dateTests = [
    [2011, 11, 6, 1, 0, 0, 0, time.Local, 1320566400],   // 1:00:00 PDT
    [2011, 11, 6, 1, 59, 59, 0, time.Local, 1320569999], // 1:59:59 PDT
    [2011, 11, 6, 2, 0, 0, 0, time.Local, 1320573600],   // 2:00:00 PST

    [2011, 3, 13, 1, 0, 0, 0, time.Local, 1300006800],   // 1:00:00 PST
    [2011, 3, 13, 1, 59, 59, 0, time.Local, 1300010399], // 1:59:59 PST
    [2011, 3, 13, 3, 0, 0, 0, time.Local, 1300010400],   // 3:00:00 PDT
    [2011, 3, 13, 2, 30, 0, 0, time.Local, 1300008600],  // 2:30:00 PDT ≡ 1:30 PST

    // Many names for Fri Nov 18 7:56:35 PST 2011
    [2011, 11, 18, 7, 56, 35, 0, time.Local, 1321631795],                 // Nov 18 7:56:35
    [2011, 11, 19, -17, 56, 35, 0, time.Local, 1321631795],               // Nov 19 -17:56:35
    [2011, 11, 17, 31, 56, 35, 0, time.Local, 1321631795],                // Nov 17 31:56:35
    [2011, 11, 18, 6, 116, 35, 0, time.Local, 1321631795],                // Nov 18 6:116:35
    [2011, 10, 49, 7, 56, 35, 0, time.Local, 1321631795],                 // Oct 49 7:56:35
    [2011, 11, 18, 7, 55, 95, 0, time.Local, 1321631795],                 // Nov 18 7:55:95
    [2011, 11, 18, 7, 56, 34, 1e9, time.Local, 1321631795],               // Nov 18 7:56:34 + 10⁹ns
    [2011, 12, -12, 7, 56, 35, 0, time.Local, 1321631795],                // Dec -21 7:56:35
    [2012, 1, -43, 7, 56, 35, 0, time.Local, 1321631795],                 // Jan -52 7:56:35 2012
    [2012, time.January.month - 2, 18, 7, 56, 35, 0, time.Local, 1321631795],   // (Jan-2) 18 7:56:35 2012
    [2010, time.December.month + 11, 18, 7, 56, 35, 0, time.Local, 1321631795], // (Dec+11) 18 7:56:35 2010
    [2012, 12, 24, 0, 0, 0, 0, time.Local, 1356336000],
  ];

  it("date", function() {
    for (var i = 0; i < dateTests.length; i++) {
      var tt = dateTests[i];
      var tm = time.date(tt[0], new time.Month(tt[1]), tt[2], tt[3], tt[4], tt[5], tt[6], tt[7]);
      var want = time.unix(internal.Int64.from(tt[8]), internal.Int64.from(0));
      tm.equal(want).should.equal(true, util.format("Date(%d, %d, %d, %d, %d, %d, %d, %s) = %s, want %s",
          tt[0], tt[1], tt[2], tt[3], tt[4], tt[5], tt[6], tt[7], tm.unix(), want.unix()));
    }
  });

  // Test YearDay in several different scenarios
  // and corner cases
  var yearDayTests = [
    // Non-leap-year tests
    [2007, 1, 1, 1],
    [2007, 1, 15, 15],
    [2007, 2, 1, 32],
    [2007, 2, 15, 46],
    [2007, 3, 1, 60],
    [2007, 3, 15, 74],
    [2007, 4, 1, 91],
    [2007, 12, 31, 365],

    // Leap-year tests
    [2008, 1, 1, 1],
    [2008, 1, 15, 15],
    [2008, 2, 1, 32],
    [2008, 2, 15, 46],
    [2008, 3, 1, 61],
    [2008, 3, 15, 75],
    [2008, 4, 1, 92],
    [2008, 12, 31, 366],

    // Looks like leap-year (but isn't) tests
    [1900, 1, 1, 1],
    [1900, 1, 15, 15],
    [1900, 2, 1, 32],
    [1900, 2, 15, 46],
    [1900, 3, 1, 60],
    [1900, 3, 15, 74],
    [1900, 4, 1, 91],
    [1900, 12, 31, 365],

    // Year one tests (non-leap)
    [1, 1, 1, 1],
    [1, 1, 15, 15],
    [1, 2, 1, 32],
    [1, 2, 15, 46],
    [1, 3, 1, 60],
    [1, 3, 15, 74],
    [1, 4, 1, 91],
    [1, 12, 31, 365],

    // Year minus one tests (non-leap)
    [-1, 1, 1, 1],
    [-1, 1, 15, 15],
    [-1, 2, 1, 32],
    [-1, 2, 15, 46],
    [-1, 3, 1, 60],
    [-1, 3, 15, 74],
    [-1, 4, 1, 91],
    [-1, 12, 31, 365],

    // 400 BC tests (leap-year)
    [-400, 1, 1, 1],
    [-400, 1, 15, 15],
    [-400, 2, 1, 32],
    [-400, 2, 15, 46],
    [-400, 3, 1, 61],
    [-400, 3, 15, 75],
    [-400, 4, 1, 92],
    [-400, 12, 31, 366],

    // Special Cases

    // Gregorian calendar change (no effect)
    [1582, 10, 4, 277],
    [1582, 10, 15, 288],
  ];

  var yearDayLocations = [
    time.fixedZone("UTC-8", -8*60*60),
    time.fixedZone("UTC-4", -4*60*60),
    time.UTC,
    time.fixedZone("UTC+4", 4*60*60),
    time.fixedZone("UTC+8", 8*60*60),
  ];

  it("yearDay", function() {
    for (var i = 0; i < yearDayLocations.length; i++) {
      var loc = yearDayLocations[i];
      for (var j = 0; j < yearDayTests.length; j++) {
        var ydt = yearDayTests[j];
        var dt = time.date(ydt[0], new time.Month(ydt[1]), ydt[2], 0, 0, 0, 0, loc);
        var yday = dt.yearDay();
        yday.should.equal(ydt[3], util.format("got %d, expected %d for %d-%d-%d in %s",
            yday, ydt[3], ydt[0], ydt[1], ydt[2], loc));
      }
    }
  });

  //  str string
  //  d   Duration
  var durationTests = [
    ["0s", new time.Duration(0)],
    ["1ns", time.Nanosecond.muln(1)],
    ["1.1µs", time.Nanosecond.muln(1100)],
    ["2.2ms", time.Microsecond.muln(2200)],
    ["3.3s", time.Millisecond.muln(3300)],
    ["4m5s", time.Minute.muln(4).add(time.Second.muln(5))],
    ["4m5.001s", time.Minute.muln(4).add(time.Millisecond.muln(5001))],
    ["5h6m7.001s", time.Hour.muln(5).add(time.Minute.muln(6)).add(time.Millisecond.muln(7001))],
    ["8m0.000000001s", time.Minute.muln(8).add(time.Nanosecond.muln(1))],
    ["2562047h47m16.854775807s", new time.Duration(internal.Int64(1).shln(63).subn(1))],
    ["-2562047h47m16.854775808s", new time.Duration(internal.Int64.from(-1).shln(63))],
  ];

  it("duration.toString", function() {
    for (var i = 0; i < durationTests.length; i++) {
      var tt = durationTests[i];
      var str = tt[1].toString();
      str.should.equal(tt[0], util.format("Duration(%s).String() = %s, want %s", tt[1].d.toString(), str, tt[0]));
      if (tt[1].d > 0) {
        var str = new time.Duration(tt[1].d.muln(-1)).toString();
        str.should.equal("-" + tt[0], util.format("Duration(%d).String() = %s, want %s", tt[1].d.toString(), str, "-"+tt[0]));
      }
    }
  });

  //var parseDurationTests = []struct {
  //in   string
  //ok   bool
  //want Duration
  //}[
  var parseDurationTests = [
    // simple
    ["0", true, new time.Duration(0)],
    ["5s", true, time.Second.muln(5)],
    ["30s", true, time.Second.muln(30)],
    ["1478s", true, time.Second.muln(1478)],
    // sign
    ["-5s", true, time.Second.muln(-5)],
    ["+5s", true, time.Second.muln(5)],
    ["-0", true, new time.Duration(0)],
    ["+0", true, new time.Duration(0)],
    // decimal
    ["5.0s", true, time.Second.muln(5)],
    ["5.6s", true, time.Second.muln(5).add(time.Millisecond.muln(600))],
    ["5.s", true, time.Second.muln(5)],
    [".5s", true, time.Millisecond.muln(500)],
    ["1.0s", true, time.Second.muln(1)],
    ["1.00s", true, time.Second.muln(1)],
    ["1.004s", true, time.Second.muln(1).add(time.Millisecond.muln(4))],
    ["1.0040s", true, time.Second.muln(1).add(time.Millisecond.muln(4))],
    ["100.00100s", true, time.Second.muln(100).add(time.Millisecond.muln(1))],
    // different units
    ["10ns", true, time.Nanosecond.muln(10)],
    ["11us", true, time.Microsecond.muln(11)],
    ["12µs", true, time.Microsecond.muln(12)], // U+00B5
    ["12μs", true, time.Microsecond.muln(12)], // U+03BC
    ["13ms", true, time.Millisecond.muln(13)],
    ["14s", true, time.Second.muln(14)],
    ["15m", true, time.Minute.muln(15)],
    ["16h", true, time.Hour.muln(16)],
    // composite durations
    ["3h30m", true, time.Hour.muln(3).add(time.Minute.muln(30))],
    ["10.5s4m", true, time.Minute.muln(4).add(time.Second.muln(10)).add(time.Millisecond.muln(500))],
    ["-2m3.4s", true, time.Minute.muln(2).add(time.Second.muln(3)).add(time.Millisecond.muln(400)).muln(-1)],
    ["1h2m3s4ms5us6ns", true, time.Hour.muln(1).add(time.Minute.muln(2)).add(time.Second.muln(3)).add(time.Millisecond.muln(4)).add(time.Microsecond.muln(5)).add(time.Nanosecond.muln(6))],
    ["39h9m14.425s", true, time.Hour.muln(39).add(time.Minute.muln(9)).add(time.Second.muln(14)).add(time.Millisecond.muln(425))],
    // large value
    ["52763797000ns", true, time.Nanosecond.mul(internal.Int64.fromString('52763797000'))],
    // more than 9 digits after decimal point, see https://golang.org/issue/6617
    ["0.3333333333333333333h", true, time.Minute.muln(20)],
    // 9007199254740993 = 1<<53+1 cannot be stored precisely in a float64
    ["9007199254740993ns", true, time.Nanosecond.mul(internal.Int64.from(1).shln(53).addn(1))],
    // largest duration that can be represented by int64 in nanoseconds
    ["9223372036854775807ns", true, time.Nanosecond.mul(internal.Int64.from(1).shln(63).subn(1))],
    ["9223372036854775.807us", true, time.Nanosecond.mul(internal.Int64.from(1).shln(63).subn(1))],
    ["9223372036s854ms775us807ns", true, time.Nanosecond.mul(internal.Int64.from(1).shln(63).subn(1))],
    // large negative value
    ["-9223372036854775807ns", true, time.Nanosecond.mul(internal.Int64.from(-1).shln(63).addn(1))],
    // huge string; issue 15011.
    ["0.100000000000000000000h", true, time.Minute.muln(6)],
    // This value tests the first overflow check in leadingFraction.
    ["0.830103483285477580700h", true, time.Minute.muln(49).add(time.Second.muln(48)).add(time.Nanosecond.muln(372539827))],

    // errors
    ["", false, new time.Duration(0)],
    ["3", false, new time.Duration(0)],
    ["-", false, new time.Duration(0)],
    ["s", false, new time.Duration(0)],
    [".", false, new time.Duration(0)],
    ["-.", false, new time.Duration(0)],
    [".s", false, new time.Duration(0)],
    ["+.s", false, new time.Duration(0)],
    ["3000000h", false, new time.Duration(0)],                  // overflow
    ["9223372036854775808ns", false, new time.Duration(0)],     // overflow
    ["9223372036854775.808us", false, new time.Duration(0)],    // overflow
    ["9223372036854ms775us808ns", false, new time.Duration(0)], // overflow
    // largest negative value of type int64 in nanoseconds should fail
    // see https://go-review.googlesource.com/#/c/2461/
    ["-9223372036854775808ns", false, new time.Duration(0)],
  ];

  it("parseDuration", function() {
    for (var i = 0; i < parseDurationTests.length; i++) {
      var tc = parseDurationTests[i];
      var d;
      try {
        d = time.parseDuration(tc[0]);
        d.d.eq(tc[2].d).should.equal(true, util.format("ParseDuration(%s) = %s, %s, want %s, nil", tc[0], d, null, tc[2]));
      } catch (err) {
        internal.throwSystem(err);
        if (err instanceof should.AssertionError || err.name === 'AssertionError') {
          throw err;
        }
        tc[1].should.equal(false, util.format("ParseDuration(%s) = %s, %s, want %s, nil", tc[0], d, err, tc[2]));
      }
    }
  });

  it("parseDuration round trip", function() {
    for (var i = 0; i < 100; i++) {
      // Resolutions finer than milliseconds will result in
      // imprecise round-trips.
      var d0 = new time.Duration(Math.random(-2147483647, 2147483647)).mul(time.Millisecond);
      var s = d0.toString();
      var d1 = time.parseDuration(s);
      d0.d.eq(d1.d).should.equal(true, util.format("round-trip failed: %d => %q => %d", d0, s, d1));
    }
  });

  // year, month, di int
  var daysInTests = [
    [2011, 1, 31],  // January, first month, 31 days
    [2011, 2, 28],  // February, non-leap year, 28 days
    [2012, 2, 29],  // February, leap year, 29 days
    [2011, 6, 30],  // June, 30 days
    [2011, 12, 31], // December, last month, 31 days
  ];

  // this isn't part of the public API and go does some tricks to make it work
  it.skip("daysIn", function() {
    // The daysIn function is not exported.
    // Test the daysIn function via the `var DaysIn = daysIn`
    // statement in the internal_test.go file.
    for (var i = 0; i < daysInTests.length; i++) {
      var tt = daysInTests[i];
      var di = time.daysIn(new time.Month(tt[1]), tt[0]);
      di.should.equal(tt[2], util.format("got %d; expected %d for %d-%02d",
          di, tt[2], tt[0], tt[1]));
    }
  });

  // Several ways of getting from
  // Fri Nov 18 7:56:35 PST 2011
  // to
  // Thu Mar 19 7:56:35 PST 2016
  // years, months, days int
  var addDateTests = [
    [4, 4, 1],
    [3, 16, 1],
    [3, 15, 30],
    [5, -6, -18 - 30 - 12],
  ];

  it("addDate", function() {
    var t0 = time.date(2011, new time.Month(11), 18, 7, 56, 35, 0, time.UTC);
    var t1 = time.date(2016, new time.Month(3), 19, 7, 56, 35, 0, time.UTC);
    for (var i = 0; i < addDateTests.length; i++) {
      var at = addDateTests[i];
      var tm = t0.addDate(at[0], at[1], at[2]);
      tm.equal(t1).should.equal(true, util.format("AddDate(%d, %d, %d) = %v, want %v",
        at[0], at[1], at[2], tm, t1));
    }
  });

  it("add", function() {
    // Add an amount to the current time to round it up to the next exact second.
    // This test checks that the nsec field still lies within the range [0, 999999999].
    var t1 = time.now();
    var t2 = t1.add(time.Second.sub(new time.Duration(t1.nanosecond())));
    var sec = (t1.second() + 1) % 60;
    if (t2.second() !== sec || t2.nanosecond() !== 0) {
      throw new Error(util.format("sec = %d, nsec = %d, want sec = %d, nsec = 0", t2.second(), t2.nanosecond(), sec));
    }
  });

  var minDuration = new time.Duration(internal.Int64.from(-1).shln(63));
  var maxDuration = new time.Duration(internal.Int64.from(1).shln(63).subn(1));

  var tzero = new time.Time(undefined, undefined, null);
  //t Time
  //u Time
  //d Duration
  var subTests = [
    [tzero, tzero, new time.Duration(0)],
    [time.date(2009, new time.Month(11), 23, 0, 0, 0, 1, time.UTC), time.date(2009, time.November, 23, 0, 0, 0, 0, time.UTC), new time.Duration(1)],
    [time.date(2009, time.November, 23, 0, 0, 0, 0, time.UTC), time.date(2009, time.November, 24, 0, 0, 0, 0, time.UTC), time.Hour.muln(-24)],
    [time.date(2009, time.November, 24, 0, 0, 0, 0, time.UTC), time.date(2009, time.November, 23, 0, 0, 0, 0, time.UTC), time.Hour.muln(24)],
    [time.date(-2009, time.November, 24, 0, 0, 0, 0, time.UTC), time.date(-2009, time.November, 23, 0, 0, 0, 0, time.UTC), time.Hour.muln(24)],
    [tzero, time.date(2109, time.November, 23, 0, 0, 0, 0, time.UTC), minDuration],
    [time.date(2109, time.November, 23, 0, 0, 0, 0, time.UTC), tzero, maxDuration],
    [tzero, time.date(-2109, time.November, 23, 0, 0, 0, 0, time.UTC), maxDuration],
    [time.date(-2109, time.November, 23, 0, 0, 0, 0, time.UTC), tzero, minDuration],
    [time.date(2290, time.January, 1, 0, 0, 0, 0, time.UTC), time.date(2000, time.January, 1, 0, 0, 0, 0, time.UTC), time.Hour.muln(290*365*24).add(time.Hour.muln(71*24))],
    [time.date(2300, time.January, 1, 0, 0, 0, 0, time.UTC), time.date(2000, time.January, 1, 0, 0, 0, 0, time.UTC), maxDuration],
    [time.date(2000, time.January, 1, 0, 0, 0, 0, time.UTC), time.date(2290, time.January, 1, 0, 0, 0, 0, time.UTC), time.Hour.muln(-290*365*24).add(time.Hour.muln(-71*24))],
    [time.date(2000, time.January, 1, 0, 0, 0, 0, time.UTC), time.date(2300, time.January, 1, 0, 0, 0, 0, time.UTC), minDuration],
  ];

  it("sub", function() {
    for (var i = 0; i < subTests.length; i++) {
      var st = subTests[i];
      var got = st[0].sub(st[1]);
      if (got.equal(st[2]) === false) {
        throw new Error(util.format("#%d: Sub(%s, %s): got %s; want %s", i, st[0], st[1], got, st[2]));
      }
    }
  });

  // t Time
  // d Duration
  // var truncateRoundTests = [
  // [time.date(-1, time.January, 1, 12, 15, 30, 5e8, time.UTC), 3],
  // [time.date(-1, time.January, 1, 12, 15, 31, 5e8, time.UTC), 3],
  // [time.date(2012, time.January, 1, 12, 15, 30, 5e8, time.UTC), time.Second],
  // [time.date(2012, time.January, 1, 12, 15, 31, 5e8, time.UTC), time.Second],
  // [time.unix(-19012425939, 649146258), 7435029458905025217], // 5.8*d rounds to 6*d, but .8*d+.8*d < 0 < d
  // ]; // TODO; use these tests.
});
