const util = require('util');

require("should");

const internal = require('../internal/index.js');
const time = require('./index.js');
const location = require("./location.js"); // avoid using this import

describe("time", function() {
  var formatTests = [
    ["ANSIC", time.ANSIC, "Wed Feb  4 21:00:57 2009"],
    ["UnixDate", time.UnixDate, "Wed Feb  4 21:00:57 PST 2009"],
    ["RubyDate", time.RubyDate, "Wed Feb 04 21:00:57 -0800 2009"],
    ["RFC822", time.RFC822, "04 Feb 09 21:00 PST"],
    ["RFC850", time.RFC850, "Wednesday, 04-Feb-09 21:00:57 PST"],
    ["RFC1123", time.RFC1123, "Wed, 04 Feb 2009 21:00:57 PST"],
    ["RFC1123Z", time.RFC1123Z, "Wed, 04 Feb 2009 21:00:57 -0800"],
    ["RFC3339", time.RFC3339, "2009-02-04T21:00:57-08:00"],
    ["RFC3339Nano", time.RFC3339Nano, "2009-02-04T21:00:57.0123456-08:00"],
    ["Kitchen", time.Kitchen, "9:00PM"],
    ["am/pm", "3pm", "9pm"],
    ["AM/PM", "3PM", "9PM"],
    ["two-digit year", "06 01 02", "09 02 04"],
    // Three-letter months and days must not be followed by lower-case letter.
    ["Janet", "Hi Janet, the Month is January", "Hi Janet, the Month is February"],
    // Time stamps, Fractional seconds.
    ["Stamp", time.Stamp, "Feb  4 21:00:57"],
    ["StampMilli", time.StampMilli, "Feb  4 21:00:57.012"],
    ["StampMicro", time.StampMicro, "Feb  4 21:00:57.012345"],
    ["StampNano", time.StampNano, "Feb  4 21:00:57.012345600"],
  ];

  before(function() {
    location._setToPacific();
  });

  it("format", function() {
    // The numeric time represents Thu Feb  4 21:00:57.012345600 PST 2010
    var tm = time.unix(internal.Int64.from(0), internal.Int64.fromString("1233810057012345600"));
    for (var i = 0; i < formatTests.length; i++) {
      var test = formatTests[i];
      var result = tm.format(test[1]);
      result.should.equal(test[2], util.format("%s expected %s got %s", test[0], test[2], result));
    }
  });
});
