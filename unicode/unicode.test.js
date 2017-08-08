"use strict";
require("should");

const unicode = require("./unicode.js");

describe("unicode", function() {
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

  it("isLetter", function() {
    for (var i = 0; i < upperTest.length; i++) {
      var test = upperTest[i];
      if (!unicode.isLetter(test)) {
        throw new Error("isLetter("+JSON.stringify(test) + ") = false, want true");
      }
    }
    for (var i = 0; i < letterTest.length; i++) {
      var test = letterTest[i];
      if (!unicode.isLetter(test)) {
        throw new Error("isLetter("+JSON.stringify(test) + ") = false, want true");
      }
    }
    for (var i = 0; i < notletterTest.length; i++) {
      var test = notletterTest[i];
      if (unicode.isLetter(test)) {
        throw new Error("isLetter("+JSON.stringify(test) + ") = false, want true");
      }
    }
  });

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

  var caseTest = [
    // errors
    // [-1, '\n', 0xFFFD], // TODO test throws.
    // [unicode.upperCase, -1, -1],
    // [unicode.upperCase, 1 << 30, 1 << 30],

    // ASCII (special-cased so test carefully)
    [unicode.upperCase, '\n', '\n'],
    [unicode.upperCase, 'a', 'A'],
    [unicode.upperCase, 'A', 'A'],
    [unicode.upperCase, '7', '7'],
    [unicode.lowerCase, '\n', '\n'],
    [unicode.lowerCase, 'a', 'a'],
    [unicode.lowerCase, 'A', 'a'],
    [unicode.lowerCase, '7', '7'],
    [unicode.titleCase, '\n', '\n'],
    [unicode.titleCase, 'a', 'A'],
    [unicode.titleCase, 'A', 'A'],
    [unicode.titleCase, '7', '7'],

    // Latin-1: easy to read the tests!
    [unicode.upperCase, 0x80, 0x80],
    [unicode.upperCase, 'Å', 'Å'],
    [unicode.upperCase, 'å', 'Å'],
    [unicode.lowerCase, 0x80, 0x80],
    [unicode.lowerCase, 'Å', 'å'],
    [unicode.lowerCase, 'å', 'å'],
    [unicode.titleCase, 0x80, 0x80],
    [unicode.titleCase, 'Å', 'Å'],
    [unicode.titleCase, 'å', 'Å'],

    // 0131;LATIN SMALL LETTER DOTLESS I;Ll;0;L;;;;;N;;;0049;;0049
    [unicode.upperCase, 0x0131, 'I'],
    [unicode.lowerCase, 0x0131, 0x0131],
    [unicode.titleCase, 0x0131, 'I'],

    // 0133;LATIN SMALL LIGATURE IJ;Ll;0;L;<compat> 0069 006A;;;;N;LATIN SMALL LETTER I J;;0132;;0132
    [unicode.upperCase, 0x0133, 0x0132],
    [unicode.lowerCase, 0x0133, 0x0133],
    [unicode.titleCase, 0x0133, 0x0132],

    // 212A;KELVIN SIGN;Lu;0;L;004B;;;;N;DEGREES KELVIN;;;006B;
    [unicode.upperCase, 0x212A, 0x212A],
    [unicode.lowerCase, 0x212A, 'k'],
    [unicode.titleCase, 0x212A, 0x212A],

    // From an UpperLower sequence
    // A640;CYRILLIC CAPITAL LETTER ZEMLYA;Lu;0;L;;;;;N;;;;A641;
    [unicode.upperCase, 0xA640, 0xA640],
    [unicode.lowerCase, 0xA640, 0xA641],
    [unicode.titleCase, 0xA640, 0xA640],
    // A641;CYRILLIC SMALL LETTER ZEMLYA;Ll;0;L;;;;;N;;;A640;;A640
    [unicode.upperCase, 0xA641, 0xA640],
    [unicode.lowerCase, 0xA641, 0xA641],
    [unicode.titleCase, 0xA641, 0xA640],
    // A64E;CYRILLIC CAPITAL LETTER NEUTRAL YER;Lu;0;L;;;;;N;;;;A64F;
    [unicode.upperCase, 0xA64E, 0xA64E],
    [unicode.lowerCase, 0xA64E, 0xA64F],
    [unicode.titleCase, 0xA64E, 0xA64E],
    // A65F;CYRILLIC SMALL LETTER YN;Ll;0;L;;;;;N;;;A65E;;A65E
    [unicode.upperCase, 0xA65F, 0xA65E],
    [unicode.lowerCase, 0xA65F, 0xA65F],
    [unicode.titleCase, 0xA65F, 0xA65E],

    // From another UpperLower sequence
    // 0139;LATIN CAPITAL LETTER L WITH ACUTE;Lu;0;L;004C 0301;;;;N;LATIN CAPITAL LETTER L ACUTE;;;013A;
    [unicode.upperCase, 0x0139, 0x0139],
    [unicode.lowerCase, 0x0139, 0x013A],
    [unicode.titleCase, 0x0139, 0x0139],
    // 013F;LATIN CAPITAL LETTER L WITH MIDDLE DOT;Lu;0;L;<compat> 004C 00B7;;;;N;;;;0140;
    [unicode.upperCase, 0x013f, 0x013f],
    [unicode.lowerCase, 0x013f, 0x0140],
    [unicode.titleCase, 0x013f, 0x013f],
    // 0148;LATIN SMALL LETTER N WITH CARON;Ll;0;L;006E 030C;;;;N;LATIN SMALL LETTER N HACEK;;0147;;0147
    [unicode.upperCase, 0x0148, 0x0147],
    [unicode.lowerCase, 0x0148, 0x0148],
    [unicode.titleCase, 0x0148, 0x0147],

    // Lowercase lower than uppercase.
    // AB78;CHEROKEE SMALL LETTER GE;Ll;0;L;;;;;N;;;13A8;;13A8
    [unicode.upperCase, 0xab78, 0x13a8],
    [unicode.lowerCase, 0xab78, 0xab78],
    [unicode.titleCase, 0xab78, 0x13a8],
    [unicode.upperCase, 0x13a8, 0x13a8],
    [unicode.lowerCase, 0x13a8, 0xab78],
    [unicode.titleCase, 0x13a8, 0x13a8],

    // Last block in the 5.1.0 table
    // 10400;DESERET CAPITAL LETTER LONG I;Lu;0;L;;;;;N;;;;10428;
    [unicode.upperCase, 0x10400, 0x10400],
    [unicode.lowerCase, 0x10400, 0x10428],
    [unicode.titleCase, 0x10400, 0x10400],
    // 10427;DESERET CAPITAL LETTER EW;Lu;0;L;;;;;N;;;;1044F;
    [unicode.upperCase, 0x10427, 0x10427],
    [unicode.lowerCase, 0x10427, 0x1044F],
    [unicode.titleCase, 0x10427, 0x10427],
    // 10428;DESERET SMALL LETTER LONG I;Ll;0;L;;;;;N;;;10400;;10400
    [unicode.upperCase, 0x10428, 0x10400],
    [unicode.lowerCase, 0x10428, 0x10428],
    [unicode.titleCase, 0x10428, 0x10400],
    // 1044F;DESERET SMALL LETTER EW;Ll;0;L;;;;;N;;;10427;;10427
    [unicode.upperCase, 0x1044F, 0x10427],
    [unicode.lowerCase, 0x1044F, 0x1044F],
    [unicode.titleCase, 0x1044F, 0x10427],

    // First one not in the 5.1.0 table
    // 10450;SHAVIAN LETTER PEEP;Lo;0;L;;;;;N;;;;;
    [unicode.upperCase, 0x10450, 0x10450],
    [unicode.lowerCase, 0x10450, 0x10450],
    [unicode.titleCase, 0x10450, 0x10450],

    // Non-letters with case.
    [unicode.lowerCase, 0x2161, 0x2171],
    [unicode.upperCase, 0x0345, 0x0399],
  ];

  it("to", function() {
    for (var i = 0; i < caseTest.length; i++) {
      var test = caseTest[i];
      if (typeof test[1] === "string") {
        test[1] = test[1].codePointAt(0);
      }
      if (typeof test[2] === "string") {
        test[2] = test[2].codePointAt(0);
      }
      var got = unicode.to(test[0], test[1]);
      got.should.equal(test[2], "to(" + JSON.stringify(test[0]) + ", " + JSON.stringify(test[1]) + "): got " + JSON.stringify(got) + ", want " + JSON.stringify(test[2]));
    }
  });

  it("toLower", function() {
    var count = 0;
    for (var i = 0; i < caseTest.length; i++) {
      var test = caseTest[i];
      if (test[0] !== unicode.lowerCase) {
        continue;
      }
      count++;
      var r = unicode.toLower(test[1]);
      r.should.equal(test[2]);
    }
    (count > 0).should.equal(true);
  });
});
