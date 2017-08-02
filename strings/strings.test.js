"use strict";
require('should');

const strings = require("./strings.js");

describe("strings", function() {
  describe("uint32mul", function() {
    it("multiplies correctly", function() {
      var start = 2013314400;
      var got = strings._uint32mul(start, 16777619) + 48;
      got.should.equal(1227497040);
    });
  });

  var compareTests = [
    ["", "", 0],
    ["a", "", 1],
    ["", "a", -1],
    ["abc", "abc", 0],
    ["ab", "abc", -1],
    ["abc", "ab", 1],
    ["x", "ab", 1],
    ["ab", "x", -1],
    ["x", "a", 1],
    ["b", "x", -1],
    // test runtime·memeq's chunked implementation
    ["abcdefgh", "abcdefgh", 0],
    ["abcdefghi", "abcdefghi", 0],
    ["abcdefghi", "abcdefghj", -1],
  ];

  describe("compare", function() {
    it("performs the correct comparison", function() {
      for (var i = 0; i < compareTests.length; i++) {
        var test = compareTests[i];
        var got = strings.compare(test[0], test[1]);
        got.should.equal(test[2], "compare("+ test[0] + ", " + test[1] + "), got " + got + ", want " + test[2]);
      }
    });
  });

  var containsTests = [
    ["abc", "bc", true],
    ["abc", "bcd", false],
    ["abc", "", true],
    ["a", "a", true],
    ["a", "b", false],
    ["", "a", false],

    // cases to cover code in runtime/asm_amd64.s:indexShortStr
    // 2-byte needle
    ["xxxxxx", "01", false],
    ["01xxxx", "01", true],
    ["xx01xx", "01", true],
    ["xxxx01", "01", true],
    // 3-byte needle
    ["xxxxxxx", "012", false],
    ["012xxxx", "012", true],
    ["xx012xx", "012", true],
    ["xxxx012", "012", true],
    // 4-byte needle
    ["xxxxxxxx", "0123", false],
    ["0123xxxx", "0123", true],
    ["xx0123xx", "0123", true],
    ["xxxx0123", "0123", true],
    // 5-7-byte needle
    ["xxxxxxxxx", "01234", false],
    ["01234xxxx", "01234", true],
    ["xx01234xx", "01234", true],
    ["xxxx01234", "01234", true],
    // 8-byte needle
    ["xxxxxxxxxxxx", "01234567", false],
    ["01234567xxxx", "01234567", true],
    ["xx01234567xx", "01234567", true],
    ["xxxx01234567", "01234567", true],
    // 9-15-byte needle
    ["xxxxxxxxxxxxx", "012345678", false],
    ["012345678xxxx", "012345678", true],
    ["xx012345678xx", "012345678", true],
    ["xxxx012345678", "012345678", true],
    // 16-byte needle
    ["xxxxxxxxxxxxxxxxxxxx", "0123456789ABCDEF", false],
    ["0123456789ABCDEFxxxx", "0123456789ABCDEF", true],
    ["xx0123456789ABCDEFxx", "0123456789ABCDEF", true],
    ["xxxx0123456789ABCDEF", "0123456789ABCDEF", true],
    // 17-31-byte needle
    ["xxxxxxxxxxxxxxxxxxxxx", "0123456789ABCDEFG", false],
    ["0123456789ABCDEFGxxxx", "0123456789ABCDEFG", true],
    ["xx0123456789ABCDEFGxx", "0123456789ABCDEFG", true],
    ["xxxx0123456789ABCDEFG", "0123456789ABCDEFG", true],

    // partial match cases
    ["xx01x", "012", false],                             // 3
    ["xx0123x", "01234", false],                         // 5-7
    ["xx01234567x", "012345678", false],                 // 9-15
    ["xx0123456789ABCDEFx", "0123456789ABCDEFG", false], // 17-31, issue 15679
  ];

  it("contains", function() {
    for (var i = 0; i < containsTests.length; i++) {
      var test = containsTests[i];
      var got = strings.contains(test[0], test[1]);
      got.should.equal(test[2], "contains("+ test[0] + ", " + test[1] + "), got " + got + ", want " + test[2]);
    }
  });
});
