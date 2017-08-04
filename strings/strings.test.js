"use strict";
require('should');

const strings = require("./strings.js");
const unicode = require("../unicode/unicode.js");

var dots = "1....2....3....4";
var faces = "☺☻☹";

describe("strings", function() {
  it("uint32mul", function() {
    var start = 2013314400;
    var got = strings._uint32mul(start, 16777619) + 48;
    got.should.equal(1227497040);
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

  it("compare", function() {
    for (var i = 0; i < compareTests.length; i++) {
      var test = compareTests[i];
      var got = strings.compare(test[0], test[1]);
      got.should.equal(test[2], "compare("+ test[0] + ", " + test[1] + "), got " + got + ", want " + test[2]);
    }
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

  var containsAnyTests = [
    ["", "", false],
    ["", "a", false],
    ["", "abc", false],
    ["a", "", false],
    ["a", "a", true],
    ["aaa", "a", true],
    ["abc", "xyz", false],
    ["abc", "xcz", true],
    ["a☺b☻c☹d", "uvw☻xyz", true],
    ["aRegExp*", ".(|)*+?^$[]", true],
    [dots + dots + dots, " ", false],
  ];

  it("containsAny", function() {
    for (var i = 0; i < containsAnyTests.length; i++) {
      var test = containsAnyTests[i];
      var got = strings.containsAny(test[0], test[1]);
      got.should.equal(test[2], "containsAny("+ test[0] + ", " + test[1] + "), got " + got + ", want " + test[2]);
    }
  });

  var countTests = [
    ["", "", 1],
    ["", "notempty", 0],
    ["notempty", "", 9],
    ["smaller", "not smaller", 0],
    ["12345678987654321", "6", 2],
    ["611161116", "6", 3],
    ["notequal", "NotEqual", 0],
    ["equal", "equal", 1],
    ["abc1231231123q", "123", 3],
    ["11111", "11", 2],
  ];

  it("count", function() {
    for (var i = 0; i < countTests.length; i++) {
      var test = countTests[i];
      var got = strings.count(test[0], test[1]);
      got.should.equal(test[2], "count("+ test[0] + ", " + test[1] + "), got " + got + ", want " + test[2]);
    }
  });

  var equalFoldTests = [
    ["abc", "abc", true],
    ["ABcd", "ABcd", true],
    ["123abc", "123ABC", true],
    ["αβδ", "ΑΒΔ", true],
    ["abc", "xyz", false],
    ["abc", "XYZ", false],
    ["abcdefghijk", "abcdefghijX", false],
    ["abcdefghijk", "abcdefghij\u212A", true],
    ["abcdefghijK", "abcdefghij\u212A", true],
    ["abcdefghijkz", "abcdefghij\u212Ay", false],
    ["abcdefghijKz", "abcdefghij\u212Ay", false],
  ];

  it("equalFold", function() {
    for (var i = 0; i < equalFoldTests.length; i++) {
      var test = equalFoldTests[i];
      var got = strings.equalFold(test[0], test[1]);
      got.should.equal(test[2], "equalFold("+ test[0] + ", " + test[1] + "), got " + got + ", want " + test[2]);
    }
  })

  var fieldsTests = [
    ["", []],
    [" ", []],
    [" \t ", []],
    ["\u2000", []],
    ["  abc  ", ["abc"]],
    ["1 2 3 4", ["1", "2", "3", "4"]],
    ["1  2  3  4", ["1", "2", "3", "4"]],
    ["1\t\t2\t\t3\t4", ["1", "2", "3", "4"]],
    ["1\u20002\u20013\u20024", ["1", "2", "3", "4"]],
    ["\u2000\u2001\u2002", []],
    ["\n™\t™\n", ["™", "™"]],
    ["\n\u20001™2\u2000 \u2001 ™", ["1™2", "™"]],
    ["\n1\uFFFD \uFFFD2\u20003\uFFFD4", ["1\uFFFD", "\uFFFD2", "3\uFFFD4"]],
    ["1\xFF\u2000\xFF2\xFF \xFF", ["1\xFF", "\xFF2\xFF", "\xFF"]],
    [faces, [faces]],
  ];

  it("fields", function() {
    for (var i = 0; i < fieldsTests.length; i++) {
      var test = fieldsTests[i];
      var got = strings.fields(test[0]);
      got.should.eql(test[1], "fields("+ JSON.stringify(test[0]) + "), got " + JSON.stringify(got) + ", want " + JSON.stringify(test[1]));
    }
  });

  var fieldsFuncTests = [
    ["", []],
    ["XX", []],
    ["XXhiXXX", ["hi"]],
    ["aXXbXXXcX", ["a", "b", "c"]],
  ];

  it("fieldsFunc", function() {
    // NB these are the fields tests
    for (var i = 0; i < fieldsTests.length; i++) {
      var test = fieldsTests[i];
      var got = strings.fieldsFunc(test[0], unicode.isSpace);
      got.should.eql(test[1], "fieldsFunc("+ JSON.stringify(test[0]) + "), got " + JSON.stringify(got) + ", want " + JSON.stringify(test[1]));

    }
    const x = 'X'.codePointAt(0);
    var pred = function(c) { return c === x; }
    for (var i = 0; i < fieldsFuncTests.length; i++) {
      var test = fieldsFuncTests[i];
      var got = strings.fieldsFunc(test[0], pred);
      got.should.eql(test[1], "fieldsFunc("+ JSON.stringify(test[0]) + "), got " + JSON.stringify(got) + ", want " + JSON.stringify(test[1]));

    }
  });

  it("hasPrefix", function() {
    strings.hasPrefix("abc", "ab").should.equal(true);
    strings.hasPrefix("abc", "abcd").should.equal(false);
    strings.hasPrefix("abc", "ac").should.equal(false);
    strings.hasPrefix("abc", "").should.equal(true);
  });

  it("hasSuffix", function() {
    strings.hasSuffix("abc", "bc").should.equal(true);
    strings.hasSuffix("abc", "dabc").should.equal(false);
    strings.hasSuffix("abc", "ac").should.equal(false);
    strings.hasSuffix("abc", "").should.equal(true);
  });
});
