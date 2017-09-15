// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
const location = require("./location.js");
const time = require("./time.js");

var index = {
  Nanosecond: time.Nanosecond,
  Microsecond: time.Microsecond,
  Millisecond: time.Millisecond,
  Second: time.Second,
  Minute: time.Minute,
  Hour: time.Hour,

  /**
   * A Duration represents the elapsed time between two instants
   * as an int64 nanosecond count. The representation limits the
   * largest representable duration to approximately 290 years.
   * @class
   * @example
   * var t0 = time.now();
   * expensiveCall();
   * var t1 = time.now();
   * console.log("The call took ", t1.sub(t0).toString(), "to run.");
   */
  Duration: time.Duration,

  /**
   * A Time represents an instant in time with nanosecond precision.
   *
   * Time instants can be compared using the before, after, and equal methods.
   * The sub method subtracts two instants, producing a Duration.
   * The add method adds a Time and a Duration, producing a Time.
   *
   * The zero value of type Time is January 1, year 1, 00:00:00.000000000 UTC.
   * As this time is unlikely to come up in practice, the isZero method gives
   * a simple way of detecting a time that has not been initialized explicitly.
   *
   * Each Time has associated with it a Location, consulted when computing the
   * presentation form of the time, such as in the Format, Hour, and Year methods.
   * The methods local, utc, and in return a Time with a specific location.
   * Changing the location in this way changes only the presentation; it does not
   * change the instant in time being denoted and therefore does not affect the
   * computations described in earlier paragraphs.
   *
   * Therefore, Time values should not be used as map or database keys without
   * first guaranteeing that the identical Location has been set for all values,
   * which can be achieved through use of the UTC or Local method, and that the
   * monotonic clock reading has been stripped by setting t = t.round(0). In
   * general, prefer t.equal(u) to t == u, since t.equal uses the most accurate
   * comparison available and correctly handles the case when only one of its
   * arguments has a monotonic clock reading.
   *
   * In addition to the required “wall clock” reading, a Time may contain an
   * optional reading of the current process's monotonic clock, to provide
   * additional precision for comparison or subtraction. See the “Monotonic
   * Clocks” section in the package documentation for details.
   *
   * @example
   */
  Time: time.Time,

  /**
   * A Month specifies a month of the year (January = 1, ...).
   *
   * @class
   * @param {integer} m Month (1-indexed month)
   */
  Month: time.Month,

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

  January: time.January,
  February: time.February,
  March: time.March,
  April: time.April,
  May: time.May,
  June: time.June,
  July: time.July,
  August: time.August,
  September: time.September,
  October: time.October,
  November: time.November,
  December: time.December,

  Sunday: time.Sunday,
  Monday: time.Monday,
  Tuesday: time.Tuesday,
  Wednesday: time.Wednesday,
  Thursday: time.Thursday,
  Friday: time.Friday,
  Saturday: time.Saturday,

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
  date: time.date,

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
  now: time.now,

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
  parse: time.parse,

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
