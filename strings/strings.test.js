"use strict";
require('should');

const strings = require("./strings.js");

describe("strings", function() {
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
});
