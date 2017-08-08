const location = require("./location.js");
const time = require("./time.js");

var index = {
  Nanosecond: time.Nanosecond,
  Microsecond: time.Microsecond,
  Millisecond: time.Millisecond,
  Second: time.Second,
  Minute: time.Minute,
  Hour: time.Hour,
  Duration: time.Duration,
  Time: time.Time,
  Month: time.Month,
  Location: location.Location,
  UTC: location.UTC,
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
  // Handy time stamps.
  Stamp: "Jan _2 15:04:05",
  StampMilli: "Jan _2 15:04:05.000",
  StampMicro: "Jan _2 15:04:05.000000",
  StampNano: "Jan _2 15:04:05.000000000",

  // date(year int, month Month, day, hour, min, sec, nsec int, loc Location) Time
  //
  // Date returns the Time corresponding to
  //	yyyy-mm-dd hh:mm:ss + nsec nanoseconds
  // in the appropriate zone for that time in the given location.
  //
  // The month, day, hour, min, sec, and nsec values may be outside
  // their usual ranges and will be normalized during the conversion.
  // For example, October 32 converts to November 1.
  //
  // A daylight savings time transition skips or repeats times.
  // For example, in the United States, March 13, 2011 2:15am never occurred,
  // while November 6, 2011 1:15am occurred twice. In such cases, the
  // choice of time zone, and therefore the time, is not well-defined.
  // Date returns a time that is correct in one of the two zones involved
  // in the transition, but it does not guarantee which.
  //
  // Date throws an error if loc is nil.
  date: time.date,

  // fixedZone(name string, offset int)
  //
  // FixedZone returns a Location that always uses the given zone name and
  // offset (seconds east of UTC).
  fixedZone: location.fixedZone,

  // loadLocation(name string)
  //
  // LoadLocation returns the Location with the given name.
  //
  // If the name is "" or "UTC", LoadLocation returns UTC.
  // If the name is "Local", LoadLocation returns Local.
  //
  // Otherwise, the name is taken to be a location name corresponding to a file
  // in the IANA Time Zone database, such as "America/New_York".
  //
  // The time zone database needed by LoadLocation may not be
  // present on all systems, especially non-Unix systems.
  // LoadLocation looks in the directory or uncompressed zip file
  // named by the ZONEINFO environment variable, if any, then looks in
  // known installation locations on Unix systems,
  // and finally looks in internal/time/zoneinfo.zip.
  loadLocation: location.loadLocation,
  now: time.now,
  parse: time.parse,

  // ParseDuration parses a duration string.
  // A duration string is a possibly signed sequence of
  // decimal numbers, each with optional fraction and a unit suffix,
  // such as "300ms", "-1.5h" or "2h45m".
  // Valid time units are "ns", "us" (or "µs"), "ms", "s", "m", "h".
  parseDuration: time.parseDuration,
  sleep: time.sleep,

  // unix(sec int64, nsec int64)
  //
  // Unix returns the local Time corresponding to the given Unix time,
  // sec seconds and nsec nanoseconds since January 1, 1970 UTC.
  // It is valid to pass nsec outside the range [0, 999999999].
  // Not all sec values have a corresponding time value. One such
  // value is 1<<63-1 (the largest int64 value).
  unix: time.unix,
};

module.exports = index;
