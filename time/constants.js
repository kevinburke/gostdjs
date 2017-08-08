const internal = require("../internal/index.js");

const secondsPerMinute = internal.Int64.from(60);
const secondsPerHour   = internal.Int64.from(60 * 60);
const secondsPerDay    = internal.Int64.from(24 * secondsPerHour);
const secondsPerWeek   = secondsPerDay.muln(7);
const daysPer400Years  = internal.Int64.from(365*400 + 97);
const daysPer100Years  = internal.Int64.from(365*100 + 24);
const daysPer4Years    = internal.Int64.from(365*4 + 1);

// Computations on time.
//
// The zero value for a Time is defined to be
//	January 1, year 1, 00:00:00.000000000 UTC
// which (1) looks like a zero, or as close as you can get in a date
// (1-1-1 00:00:00 UTC), (2) is unlikely enough to arise in practice to
// be a suitable "not set" sentinel, unlike Jan 1 1970, and (3) has a
// non-negative year even in time zones west of UTC, unlike 1-1-0
// 00:00:00 UTC, which would be 12-31-(-1) 19:00:00 in New York.
//
// The zero Time value does not force a specific epoch for the time
// representation. For example, to use the Unix epoch internally, we
// could define that to distinguish a zero value from Jan 1 1970, that
// time would be represented by sec=-1, nsec=1e9. However, it does
// suggest a representation, namely using 1-1-1 00:00:00 UTC as the
// epoch, and that's what we do.
//
// The Add and Sub computations are oblivious to the choice of epoch.
//
// The presentation computations - year, month, minute, and so on - all
// rely heavily on division and modulus by positive constants. For
// calendrical calculations we want these divisions to round down, even
// for negative values, so that the remainder is always positive, but
// Go's division (like most hardware division instructions) rounds to
// zero. We can still do those computations and then adjust the result
// for a negative numerator, but it's annoying to write the adjustment
// over and over. Instead, we can change to a different epoch so long
// ago that all the times we care about will be positive, and then round
// to zero and round down coincide. These presentation routines already
// have to add the zone offset, so adding the translation to the
// alternate epoch is cheap. For example, having a non-negative time t
// means that we can write
//
//	sec = t % 60
//
// instead of
//
//	sec = t % 60
//	if sec < 0 {
//		sec += 60
//	}
//
// everywhere.
//
// The calendar runs on an exact 400 year cycle: a 400-year calendar
// printed for 1970-2369 will apply as well to 2370-2769. Even the days
// of the week match up. It simplifies the computations to choose the
// cycle boundaries so that the exceptional years are always delayed as
// long as possible. That means choosing a year equal to 1 mod 400, so
// that the first leap year is the 4th year, the first missed leap year
// is the 100th year, and the missed missed leap year is the 400th year.
// So we'd prefer instead to print a calendar for 2001-2400 and reuse it
// for 2401-2800.
//
// Finally, it's convenient if the delta between the Unix epoch and
// long-ago epoch is representable by an int64 constant.
//
// These three considerations—choose an epoch as early as possible, that
// uses a year equal to 1 mod 400, and that is no more than 2⁶³ seconds
// earlier than 1970—bring us to the year -292277022399. We refer to
// this year as the absolute zero year, and to times measured as a uint64
// seconds since this year as absolute times.
//
// Times measured as an int64 seconds since the year 1—the representation
// used for Time's sec field—are called internal times.
//
// Times measured as an int64 seconds since the year 1970 are called Unix
// times.
//
// It is tempting to just use the year 1 as the absolute epoch, defining
// that the routines are only valid for years >= 1. However, the
// routines would then be invalid when displaying the epoch in time zones
// west of UTC, since it is year 0. It doesn't seem tenable to say that
// printing the zero time correctly isn't supported in half the time
// zones. By comparison, it's reasonable to mishandle some times in
// the year -292277022399.
//
// All this is opaque to clients of the API and can be changed if a
// better implementation presents itself.

// The unsigned zero year for internal calculations.
// Must be 1 mod 400, and times before it will not compute correctly,
// but otherwise can be changed at will.
const absoluteZeroYear = internal.Int64.from(-292277022399);

// JS can't do this calculation accurately:
// absoluteToInternal int64 = (absoluteZeroYear - internalYear) * 365.2425 * secondsPerDay

const absoluteToInternal = internal.Int64.fromString("-9223371966579724800");
const internalToAbsolute = absoluteToInternal.muln(-1);
const unixToInternal = internal.Int64.from(secondsPerDay.muln(1969*365 + Math.floor(1969/4) - Math.floor(1969/100) + Math.floor(1969/400)));
const internalToUnix = unixToInternal.muln(-1);

const wallToInternal = internal.Int64.from((1884*365 + Math.floor(1884/4) - Math.floor(1884/100) + Math.floor(1884/400)) * secondsPerDay);

const hasMonotonic = internal.Uint64.from(1).shln(63);
const minWall = wallToInternal;
const nsecMask = internal.Int64.from(1).shln(30).subn(1);
const nsecShift = internal.Int64.from(30);

module.exports = {
  secondsPerMinute: secondsPerMinute,
  secondsPerHour: secondsPerHour,
  secondsPerDay: secondsPerDay,
  secondsPerWeek: secondsPerWeek,
  daysPer400Years: daysPer400Years,
  daysPer100Years: daysPer100Years,
  daysPer4Years: daysPer4Years,

  absoluteZeroYear: absoluteZeroYear,
  absoluteToInternal: absoluteToInternal,
  internalToAbsolute: internalToAbsolute,
  unixToInternal: unixToInternal,
  internalToUnix: internalToUnix,

  wallToInternal: wallToInternal,

  hasMonotonic: hasMonotonic,
  minWall: minWall,
  nsecMask: nsecMask,
  nsecShift: nsecShift,
};
