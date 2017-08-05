"use strict";
require("should");

const unicode = require("./unicode.js");

describe("unicode", function() {
  var testDigit = [
    0x0030,
    0x0039,
    0x0661,
    0x06F1,
    0x07C9,
    0x0966,
    0x09EF,
    0x0A66,
    0x0AEF,
    0x0B66,
    0x0B6F,
    0x0BE6,
    0x0BEF,
    0x0C66,
    0x0CEF,
    0x0D66,
    0x0D6F,
    0x0E50,
    0x0E59,
    0x0ED0,
    0x0ED9,
    0x0F20,
    0x0F29,
    0x1040,
    0x1049,
    0x1090,
    0x1091,
    0x1099,
    0x17E0,
    0x17E9,
    0x1810,
    0x1819,
    0x1946,
    0x194F,
    0x19D0,
    0x19D9,
    0x1B50,
    0x1B59,
    0x1BB0,
    0x1BB9,
    0x1C40,
    0x1C49,
    0x1C50,
    0x1C59,
    0xA620,
    0xA629,
    0xA8D0,
    0xA8D9,
    0xA900,
    0xA909,
    0xAA50,
    0xAA59,
    0xFF10,
    0xFF19,
    0x104A1,
    0x1D7CE,
  ];
  var spaceTest = [
    0x09,
    0x0a,
    0x0b,
    0x0c,
    0x0d,
    0x20,
    0x85,
    0xA0,
    0x2000,
    0x3000,
  ];
  var letterTest = [
    0x41,
    0x61,
    0xaa,
    0xba,
    0xc8,
    0xdb,
    0xf9,
    0x2ec,
    0x535,
    0x620,
    0x6e6,
    0x93d,
    0xa15,
    0xb99,
    0xdc0,
    0xedd,
    0x1000,
    0x1200,
    0x1312,
    0x1401,
    0x2c00,
    0xa800,
    0xf900,
    0xfa30,
    0xffda,
    0xffdc,
    0x10000,
    0x10300,
    0x10400,
    0x20000,
    0x2f800,
    0x2fa1d,
  ];

  it("isSpace", function() {
    for (var i = 0; i < spaceTest.length; i++) {
      var test = spaceTest[i];
      var got = unicode.isSpace(test);
      got.should.equal(true, "isSpace(" + JSON.stringify(test) + "): got " + JSON.stringify(got) + ", want true");
    }
    for (var i = 0; i < letterTest.length; i++) {
      var test = letterTest[i];
      var got = unicode.isSpace(test);
      got.should.equal(false, "isSpace(" + JSON.stringify(test) + "): got " + JSON.stringify(got) + ", want false");
    }
  });

  var upperTest = [
    0x41,
    0xc0,
    0xd8,
    0x100,
    0x139,
    0x14a,
    0x178,
    0x181,
    0x376,
    0x3cf,
    0x13bd,
    0x1f2a,
    0x2102,
    0x2c00,
    0x2c10,
    0x2c20,
    0xa650,
    0xa722,
    0xff3a,
    0x10400,
    0x1d400,
    0x1d7ca,
  ];
  var notupperTest = [
    0x40,
    0x5b,
    0x61,
    0x185,
    0x1b0,
    0x377,
    0x387,
    0x2150,
    0xab7d,
    0xffff,
    0x10000,
  ];

  var notletterTest = [
    0x20,
    0x35,
    0x375,
    0x619,
    0x700,
    0x1885,
    0xfffe,
    0x1ffff,
    0x10ffff,
  ];

  it("isUpper", function() {
    for (var i = 0; i < upperTest.length; i++) {
      var test = upperTest[i];
      var got = unicode.isUpper(test);
      got.should.equal(true, "isUpper(" + JSON.stringify(test) + "): got " + JSON.stringify(got) + ", want true");
    }
    for (var i = 0; i < notupperTest.length; i++) {
      var test = notupperTest[i];
      var got = unicode.isUpper(test);
      got.should.equal(false, "isUpper(" + JSON.stringify(test) + "): got " + JSON.stringify(got) + ", want false");
    }
    for (var i = 0; i < notletterTest.length; i++) {
      var test = notletterTest[i];
      var got = unicode.isUpper(test);
      got.should.equal(false, "isUpper(" + JSON.stringify(test) + "): got " + JSON.stringify(got) + ", want false");
    }
  });
});
