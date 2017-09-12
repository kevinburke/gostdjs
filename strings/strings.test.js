// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
"use strict";
const should = require('should');

const strings = require("./strings.js");
const unicode = require("../unicode/unicode.js");
const utf8 = require("../unicode/utf8/utf8.js");

var abcd = "abcd";
var commas = "1,2,3,4";
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
  });

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
    var pred = function(c) { return c === x; };
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

  var isValidRune = function(r) {
    return 0xd800 > r || r > 0xe000;
  };

  const space = "\t\v\r\f\n\u0085\u00a0\u2000\u3000";
  var not = function(f) {
    return function(i) {
      var result = f(i);
      if (result === true) {
        return false;
      }
      if (result === false) {
        return true;
      }
      throw new Error("unknown result: " + JSON.stringify(result));
    };
  };

  var indexFuncTests = [
    ["", isValidRune, -1, -1],
    ["abc", unicode.isDigit, -1, -1],
    ["0123", unicode.isDigit, 0, 3],
    ["a1b", unicode.isDigit, 1, 1],
    // last rune in space is 1 byte. TODO add better utf-16 test here.
    [space, unicode.isSpace, 0, space.length - 1],
    // changed last value to 12 from 18 (3 chars of 1 byte instead of 3)
    ["\u0e50\u0e5212hello34\u0e50\u0e51", unicode.isDigit, 0, 12],

    // Changed from 34, 8 chars that are 1 byte instead of 3, skipped one
    // backwards, so 2*7 fewer.
    ["\u2C6F\u2C6F\u2C6F\u2C6FABCDhelloEF\u2C6F\u2C6FGH\u2C6F\u2C6F", unicode.isUpper, 0, 20],
    // NB: This returns different results than Go, because the Unicode
    // characters are one digit each. Changed "8" to "4" here.
    ["12\u0e50\u0e52hello34\u0e50\u0e51", not(unicode.isDigit), 4, 8],

    // tests of invalid UTF-16
    // Changed from UTF-8 - \xc0 is a valid utf-16 encoding.
    ["\ue0001", unicode.isDigit, 1, 1],
    ["\ue000abc", unicode.isDigit, -1, -1],
    ["\ud800a\ud800", isValidRune, 1, 1],
    ["\ud800a\ud800", not(isValidRune), 0, 2],
    ["\ue000☺\ue0000", not(isValidRune), 0, 2],
    ["\ue000☺\ue000\ue000", not(isValidRune), 0, 3],
    ["ab\ue000a\ue000cd", not(isValidRune), 2, 4],
    ["a\ue000\ud800cd", not(isValidRune), 1, 2],
    ["\ud800\ud800\ud800\ud800", not(isValidRune), 0, 3],
  ];

  it("indexFunc|lastIndexFunc", function() {
    for (var i = 0; i < indexFuncTests.length; i++) {
      var test = indexFuncTests[i];
      var got = strings.indexFunc(test[0], test[1]);
      got.should.eql(test[2], i.toString() + ": indexFunc("+ JSON.stringify(test[0]) + "), got " + JSON.stringify(got) + ", want " + JSON.stringify(test[2]));

    }

    for (var i = 0; i < indexFuncTests.length; i++) {
      var test = indexFuncTests[i];
      var got = strings.lastIndexFunc(test[0], test[1]);
      got.should.eql(test[3], i.toString() + ": lastIndexFunc("+ JSON.stringify(test[0]) + "), got " + JSON.stringify(got) + ", want " + JSON.stringify(test[3]));

    }
  });

  var indexRuneTests = [
    ["", 'a', -1],
    ["", '☺', -1],
    ["foo", '☹', -1],
    ["foo", 'o', 1],
    ["foo☺bar", '☺', 3],
    // changed from "9" because each happy face is a single utf16 code point
    ["foo☺☻☹bar", '☹', 5],
    ["a A x", 'A', 2],
    ["some_text=some_value", '=', 9],
    // changed from "3" because each happy face is a single utf16 code point
    ["☺a", 'a', 1],
    // changed from "4" because each happy face is a single utf16 code point
    ["a☻☺b", '☺', 2],

    // Some tests skipped here because Javascript is more permissive than Go
  ];

  it("indexRune", function() {
    for (var i = 0; i < indexRuneTests.length; i++) {
      var test = indexRuneTests[i];
      var got = strings.indexRune(test[0], test[1].codePointAt(0));
      got.should.eql(test[2], i.toString() + ": indexRune("+ JSON.stringify(test[0]) + "), got " + JSON.stringify(got) + ", want " + JSON.stringify(test[2]));

    }
  });

  it("join", function() {
    strings.join(["foo", "bar", "baz"], ",").should.equal("foo,bar,baz");
    strings.join([], ",").should.equal("");
  });

  var runIndexTests = function(f, name, tests) {
    for (var i = 0; i < tests.length; i++) {
      var test = tests[i];
      var got = f(test[0], test[1]);
      if (got !== test[2]) {
        throw new Error(name + "(" + JSON.stringify(test[0]) + ", " + JSON.stringify(test[1]) + "): got " + got + ", want " + test[2]);
      }
    }
  };

  var indexTests = [
    ["", "", 0],
    ["", "a", -1],
    ["", "foo", -1],
    ["fo", "foo", -1],
    ["foo", "foo", 0],
    ["oofofoofooo", "f", 2],
    ["oofofoofooo", "foo", 4],
    ["barfoobarfoo", "foo", 3],
    ["foo", "", 0],
    ["foo", "o", 1],
    ["abcABCabc", "A", 3],
    // cases with one byte strings - test special case in Index()
    ["", "a", -1],
    ["x", "a", -1],
    ["x", "x", 0],
    ["abc", "a", 0],
    ["abc", "b", 1],
    ["abc", "c", 2],
    ["abc", "x", -1],
    // test special cases in Index() for short strings
    ["", "ab", -1],
    ["bc", "ab", -1],
    ["ab", "ab", 0],
    ["xab", "ab", 1],
    ["xab".slice(0, 2), "ab", -1],
    ["", "abc", -1],
    ["xbc", "abc", -1],
    ["abc", "abc", 0],
    ["xabc", "abc", 1],
    ["xab".slice(0,3), "abc", -1],
    ["xabxc", "abc", -1],
    ["", "abcd", -1],
    ["xbcd", "abcd", -1],
    ["abcd", "abcd", 0],
    ["xabcd", "abcd", 1],
    ["xyabcd".slice(0, 5), "abcd", -1],
    ["xbcqq", "abcqq", -1],
    ["abcqq", "abcqq", 0],
    ["xabcqq", "abcqq", 1],
    ["xyabcqq".slice(0, 6), "abcqq", -1],
    ["xabxcqq", "abcqq", -1],
    ["xabcqxq", "abcqq", -1],
    ["", "01234567", -1],
    ["32145678", "01234567", -1],
    ["01234567", "01234567", 0],
    ["x01234567", "01234567", 1],
    ["x0123456x01234567", "01234567", 9],
    ["xx01234567".slice(0, 9), "01234567", -1],
    ["", "0123456789", -1],
    ["3214567844", "0123456789", -1],
    ["0123456789", "0123456789", 0],
    ["x0123456789", "0123456789", 1],
    ["x012345678x0123456789", "0123456789", 11],
    ["xyz0123456789".slice(0, 12), "0123456789", -1],
    ["x01234567x89", "0123456789", -1],
    ["", "0123456789012345", -1],
    ["3214567889012345", "0123456789012345", -1],
    ["0123456789012345", "0123456789012345", 0],
    ["x0123456789012345", "0123456789012345", 1],
    ["x012345678901234x0123456789012345", "0123456789012345", 17],
    ["", "01234567890123456789", -1],
    ["32145678890123456789", "01234567890123456789", -1],
    ["01234567890123456789", "01234567890123456789", 0],
    ["x01234567890123456789", "01234567890123456789", 1],
    ["x0123456789012345678x01234567890123456789", "01234567890123456789", 21],
    ["xyz01234567890123456789".slice(0, 22), "01234567890123456789", -1],
    ["", "0123456789012345678901234567890", -1],
    ["321456788901234567890123456789012345678911", "0123456789012345678901234567890", -1],
    ["0123456789012345678901234567890", "0123456789012345678901234567890", 0],
    ["x0123456789012345678901234567890", "0123456789012345678901234567890", 1],
    ["x012345678901234567890123456789x0123456789012345678901234567890", "0123456789012345678901234567890", 32],
    ["xyz0123456789012345678901234567890".slice(0, 33), "0123456789012345678901234567890", -1],
    ["", "01234567890123456789012345678901", -1],
    ["32145678890123456789012345678901234567890211", "01234567890123456789012345678901", -1],
    ["01234567890123456789012345678901", "01234567890123456789012345678901", 0],
    ["x01234567890123456789012345678901", "01234567890123456789012345678901", 1],
    ["x0123456789012345678901234567890x01234567890123456789012345678901", "01234567890123456789012345678901", 33],
    ["xyz01234567890123456789012345678901".slice(0, 34), "01234567890123456789012345678901", -1],
    ["xxxxxx012345678901234567890123456789012345678901234567890123456789012", "012345678901234567890123456789012345678901234567890123456789012", 6],
    ["", "0123456789012345678901234567890123456789", -1],
    ["xx012345678901234567890123456789012345678901234567890123456789012", "0123456789012345678901234567890123456789", 2],
    ["xx012345678901234567890123456789012345678901234567890123456789012".slice(0, 41), "0123456789012345678901234567890123456789", -1],
    ["xx012345678901234567890123456789012345678901234567890123456789012", "0123456789012345678901234567890123456xxx", -1],
    ["xx0123456789012345678901234567890123456789012345678901234567890120123456789012345678901234567890123456xxx", "0123456789012345678901234567890123456xxx", 65],
  ];

  var lastIndexTests = [
    ["", "", 0],
    ["", "a", -1],
    ["", "foo", -1],
    ["fo", "foo", -1],
    ["foo", "foo", 0],
    ["foo", "f", 0],
    ["oofofoofooo", "f", 7],
    ["oofofoofooo", "foo", 7],
    ["barfoobarfoo", "foo", 9],
    ["foo", "", 3],
    ["foo", "o", 2],
    ["abcABCabc", "A", 3],
    ["abcABCabc", "a", 6],
  ];

  var lastIndexAnyTests = [
    ["", "", -1],
    ["", "a", -1],
    ["", "abc", -1],
    ["a", "", -1],
    ["a", "a", 0],
    ["aaa", "a", 2],
    ["abc", "xyz", -1],
    ["abc", "ab", 1],
    ["ab☺c", "x☺yz", 2],
    ["a☺b☻c☹d", "cx", "a☺b☻".length],
    ["a☺b☻c☹d", "uvw☻xyz", "a☺b".length],
    ["a.RegExp*", ".(|)*+?^$[]", 8],
    [dots + dots + dots, " ", -1],
    ["012abcba210", "\xffb", 6],

    // Go replaces this with the unicode replacement character uffd. Javascript
    // does not do that. I'm not sure what the behavior should be here. For now
    // just comment this out.
    // ["012\ud800bcb\ud800210", "\ue000b", 7],
  ];

  it("index", function() {
    runIndexTests(strings.index, this.test.title, indexTests);
  });

  it("lastIndex", function() {
    runIndexTests(strings.lastIndex, this.test.title, lastIndexTests);
  });

  it("lastIndexAny", function() {
    runIndexTests(strings.lastIndexAny, this.test.title, lastIndexAnyTests);
  });

  var lastIndexByteTests = [
    ["", "q".charCodeAt(0), -1],
    ["abcdef", "q".charCodeAt(0), -1],
    ["abcdefabcdef", "a".charCodeAt(0), "abcdef".length],      // something in the middle
    ["abcdefabcdef", "f".charCodeAt(0), "abcdefabcde".length], // last byte
    ["zabcdefabcdef", "z".charCodeAt(0), 0],                 // first byte
    ["a☺b☻c☹d", "b".charCodeAt(0), "a☺".length],               // non-ascii
  ];

  it("lastIndexByte", function() {
    for (var i = 0; i < lastIndexByteTests.length; i++) {
      var test = lastIndexByteTests[i];
      var got = strings.lastIndexByte(test[0], test[1]);
      got.should.eql(test[2], i.toString() + ": lastIndexByte("+ JSON.stringify(test[0]) + ", " + JSON.stringify(test[1])+ "), got " + JSON.stringify(got) + ", want " + JSON.stringify(test[2]));

    }
  });

  const a = 'a'.codePointAt(0);
  const z = 'z'.codePointAt(0);
  const A = 'A'.codePointAt(0);
  const Z = 'Z'.codePointAt(0);
  var rot13 = function(i) {
    if (i >= a && i <= z) {
      i = i + 13;
      if (i > z) {
        return i - 26;
      }
      return i;
    }
    if (i >= A && i <= Z) {
      i = i + 13;
      if (i > Z) {
        return i - 26;
      }
      return i;
    }
    return i;
  };

  it("map", function() {
    var m = strings.map(rot13, "a to zed");
    m.should.equal("n gb mrq");

    var m = strings.map(rot13, strings.map(rot13, "a to zed"));
    m.should.equal("a to zed");
  });

  var repeatTests = [
    ["", "", 0],
    ["", "", 1],
    ["", "", 2],
    ["-", "", 0],
    ["-", "-", 1],
    ["-", "----------", 10],
    ["abc ", "abc abc abc ", 3],
  ];

  it("repeat", function() {
    for (var i = 0; i < repeatTests.length; i++) {
      var test = repeatTests[i];
      var got = strings.repeat(test[0], test[2]);
      got.should.eql(test[1], i.toString() + ": repeat("+ JSON.stringify(test[0]) + ", " + JSON.stringify(test[2])+ "), got " + JSON.stringify(got) + ", want " + JSON.stringify(test[2]));

    }
  });

  var replaceTests = [
    ["hello", "l", "L", 0, "hello"],
    ["hello", "l", "L", -1, "heLLo"],
    ["hello", "x", "X", -1, "hello"],
    ["", "x", "X", -1, ""],
    ["radar", "r", "<r>", -1, "<r>ada<r>"],
    ["", "", "<>", -1, "<>"],
    ["banana", "a", "<>", -1, "b<>n<>n<>"],
    ["banana", "a", "<>", 1, "b<>nana"],
    ["banana", "a", "<>", 1000, "b<>n<>n<>"],
    ["banana", "an", "<>", -1, "b<><>a"],
    ["banana", "ana", "<>", -1, "b<>na"],
    ["banana", "", "<>", -1, "<>b<>a<>n<>a<>n<>a<>"],
    ["banana", "", "<>", 10, "<>b<>a<>n<>a<>n<>a<>"],
    ["banana", "", "<>", 6, "<>b<>a<>n<>a<>n<>a"],
    ["banana", "", "<>", 5, "<>b<>a<>n<>a<>na"],
    ["banana", "", "<>", 1, "<>banana"],
    ["banana", "a", "a", -1, "banana"],
    ["banana", "a", "a", 1, "banana"],
    ["☺☻☹", "", "<>", -1, "<>☺<>☻<>☹<>"],
  ];

  it("replace", function() {
    for (var i = 0; i < replaceTests.length; i++) {
      var test = replaceTests[i];
      var got = strings.replace(test[0], test[1], test[2], test[3]);
      got.should.eql(test[4], i.toString() + ": replace("+ JSON.stringify(test[0]) +
        ", " + JSON.stringify(test[1]) + ", " + JSON.stringify(test[2]) + ", " +
        JSON.stringify(test[3]) + "), got " + JSON.stringify(got) +
        ", want " + JSON.stringify(test[4]));

    }
  });

  var splitTests = [
    ["", "", -1, []],
    [abcd, "", 2, ["a", "bcd"]],
    [abcd, "", 4, ["a", "b", "c", "d"]],
    [abcd, "", -1, ["a", "b", "c", "d"]],
    [faces, "", -1, ["☺", "☻", "☹"]],
    [faces, "", 3, ["☺", "☻", "☹"]],
    [faces, "", 17, ["☺", "☻", "☹"]],
    ["☺�☹", "", -1, ["☺", "�", "☹"]],
    [abcd, "a", 0, null],
    [abcd, "a", -1, ["", "bcd"]],
    [abcd, "z", -1, ["abcd"]],
    [commas, ",", -1, ["1", "2", "3", "4"]],
    [dots, "...", -1, ["1", ".2", ".3", ".4"]],
    [faces, "☹", -1, ["☺☻", ""]],
    [faces, "~", -1, [faces]],
    ["1 2 3 4", " ", 3, ["1", "2", "3 4"]],
    ["1 2", " ", 3, ["1", "2"]],
  ];

  it("split|splitN", function() {
    for (var i = 0; i < splitTests.length; i++) {
      var test = splitTests[i];
      var got = strings.splitN(test[0], test[1], test[2]);
      should(got).eql(test[3], "splitN("+JSON.stringify(test[0]) + ", " + JSON.stringify(test[1]) + "): got " + JSON.stringify(got) + ", want " + JSON.stringify(test[3]));
      if (test[2] !== -1) {
        continue;
      }
      if (got !== null) {
        var s = strings.join(got, test[1]);
        s.should.eql(test[0], "join(" + JSON.stringify(got) + ", \"\"): got " + JSON.stringify(s) + ", want " + JSON.stringify(test[0]));
      }
      var got = strings.split(test[0], test[1]);
      got.should.eql(test[3], "split("+JSON.stringify(test[0]) + ", " + JSON.stringify(test[1]) + "): got " + JSON.stringify(got) + ", want " + JSON.stringify(test[3]));
    }
  });

  var splitAfterTests = [
    [abcd, "a", -1, ["a", "bcd"]],
    [abcd, "z", -1, ["abcd"]],
    [abcd, "", -1, ["a", "b", "c", "d"]],
    [commas, ",", -1, ["1,", "2,", "3,", "4"]],
    [dots, "...", -1, ["1...", ".2...", ".3...", ".4"]],
    [faces, "☹", -1, ["☺☻☹", ""]],
    [faces, "~", -1, [faces]],
    [faces, "", -1, ["☺", "☻", "☹"]],
    ["1 2 3 4", " ", 3, ["1 ", "2 ", "3 4"]],
    ["1 2 3", " ", 3, ["1 ", "2 ", "3"]],
    ["1 2", " ", 3, ["1 ", "2"]],
    ["123", "", 2, ["1", "23"]],
    ["123", "", 17, ["1", "2", "3"]],
  ];

  it("splitAfter|splitAfterN", function() {
    for (var i = 0; i < splitAfterTests.length; i++) {
      var test = splitAfterTests[i];
      var got = strings.splitAfterN(test[0], test[1], test[2]);
      got.should.eql(test[3], "splitAfter("+JSON.stringify(test[0]) + ", " + JSON.stringify(test[1]) + "): got " + JSON.stringify(got) + ", want " + JSON.stringify(test[3]));
      var s = strings.join(got, "");
      s.should.eql(test[0], "join(" + JSON.stringify(got) + "): got " + JSON.stringify(s), ", want " + JSON.stringify(test[0]));
      if (test[2] !== -1) {
        continue;
      }
      got = strings.splitAfter(test[0], test[1]);
      got.should.eql(test[3], "splitAfter("+JSON.stringify(test[0]) + ", " + JSON.stringify(test[1]) + "): got " + JSON.stringify(got) + ", want " + JSON.stringify(test[3]));
    }
  });

  var titleTests = [
    ["", ""],
    ["a", "A"],
    [" aaa aaa aaa ", " Aaa Aaa Aaa "],
    [" Aaa Aaa Aaa ", " Aaa Aaa Aaa "],
    ["123a456", "123a456"],
    ["double-blind", "Double-Blind"],
    ["ÿøû", "Ÿøû"],
    ["with_underscore", "With_underscore"],
    // TODO check that I converted this test to utf-16 correctly and that it
    // does the right thing now.
    ["unicode \u2028 line separator", "Unicode \u2028 Line Separator"],
  ];

  it("title", function() {
    for (var i = 0; i < titleTests.length; i++) {
      var test = titleTests[i];
      var got = strings.title(test[0]);
      got.should.equal(test[1], "title("+ test[0] + "): got " + JSON.stringify(got) + ", want " + JSON.stringify(test[1]));
    }
  });

  var lowerTests =[
    ["", ""],
    ["abc", "abc"],
    ["AbC123", "abc123"],
    ["azAZ09_", "azaz09_"],
    ["\u2C6D\u2C6D\u2C6D\u2C6D\u2C6D", "\u0251\u0251\u0251\u0251\u0251"], // shrinks one byte per char
  ];

  it("toLower", function() {
    for (var i = 0; i < lowerTests.length; i++) {
      var test = lowerTests[i];
      var got = strings.toLower(test[0]);
      got.should.equal(test[1]);
    }
  });

  var upperTests = [
    ["", ""],
    ["abc", "ABC"],
    ["AbC123", "ABC123"],
    ["azAZ09_", "AZAZ09_"],
    ["\u0250\u0250\u0250\u0250\u0250", "\u2C6F\u2C6F\u2C6F\u2C6F\u2C6F"], // grows one byte per char
  ];

  it("toUpper", function() {
    for (var i = 0; i < upperTests.length; i++) {
      var test = upperTests[i];
      var got = strings.toUpper(test[0]);
      got.should.equal(test[1]);
    }
  });

  var trimTests = [
    ["Trim", "abba", "a", "bb"],
    ["Trim", "abba", "ab", ""],
    ["TrimLeft", "abba", "ab", ""],
    ["TrimRight", "abba", "ab", ""],
    ["TrimLeft", "abba", "a", "bba"],
    ["TrimRight", "abba", "a", "abb"],
    ["Trim", "<tag>", "<>", "tag"],
    ["Trim", "* listitem", " *", "listitem"],
    ["Trim", `"quote"`, `"`, "quote"],
    ["Trim", "\u2C6F\u2C6F\u0250\u0250\u2C6F\u2C6F", "\u2C6F", "\u0250\u0250"],
    // Not sure what to do here. in UTF-8, the beginning and end characters get
    // replaced with RuneError, or the replacement character, which is a single
    // char in utf-8, and similarly with the cutset, so this test works.
    // Javascript doesn't provide easy methods for detecting/replacing invalid
    // chars in a string.
    //
    // In the future maybe we implement utf16.Decode and this package operates
    // entirely on integer arrays.
    //["Trim", "\x80test\xff", "\xff", "test"],
    ["Trim", " Ġ ", " ", "Ġ"],
    ["Trim", " Ġİ0", "0 ", "Ġİ"],
    //empty string tests
    ["Trim", "abba", "", "abba"],
    ["Trim", "", "123", ""],
    ["Trim", "", "", ""],
    ["TrimLeft", "abba", "", "abba"],
    ["TrimLeft", "", "123", ""],
    ["TrimLeft", "", "", ""],
    ["TrimRight", "abba", "", "abba"],
    ["TrimRight", "", "123", ""],
    ["TrimRight", "", "", ""],
    ["TrimRight", "☺\xc0", "☺", "☺\xc0"],
    ["TrimPrefix", "aabb", "a", "abb"],
    ["TrimPrefix", "aabb", "b", "aabb"],
    ["TrimSuffix", "aabb", "a", "aabb"],
    ["TrimSuffix", "aabb", "b", "aab"],
  ];

  it("trim", function() {
    for (var i = 0; i < trimTests.length; i++) {
      var test = trimTests[i];
      if (test[0] !== "Trim") {
        continue;
      }
      var got = strings.trim(test[1], test[2]);
      got.should.equal(test[3], "trim " + JSON.stringify(test[1]) + " " + JSON.stringify(test[2]));
    }
  });

  it("trimLeft", function() {
    for (var i = 0; i < trimTests.length; i++) {
      var test = trimTests[i];
      if (test[0] !== "TrimLeft") {
        continue;
      }
      var got = strings.trimLeft(test[1], test[2]);
      got.should.equal(test[3], "trimLeft " + JSON.stringify(test[1]) + " " + JSON.stringify(test[2]));
    }
  });

  it("trimRight", function() {
    for (var i = 0; i < trimTests.length; i++) {
      var test = trimTests[i];
      if (test[0] !== "TrimRight") {
        continue;
      }
      var got = strings.trimRight(test[1], test[2]);
      got.should.equal(test[3], "trimRight " + JSON.stringify(test[1]) + " " + JSON.stringify(test[2]));
    }
  });

  it("trimPrefix", function() {
    for (var i = 0; i < trimTests.length; i++) {
      var test = trimTests[i];
      if (test[0] !== "TrimPrefix") {
        continue;
      }
      var got = strings.trimPrefix(test[1], test[2]);
      got.should.equal(test[3], "trimPrefix " + JSON.stringify(test[1]) + " " + JSON.stringify(test[2]));
    }
  });

  it("trimSuffix", function() {
    for (var i = 0; i < trimTests.length; i++) {
      var test = trimTests[i];
      if (test[0] !== "TrimSuffix") {
        continue;
      }
      var got = strings.trimSuffix(test[1], test[2]);
      got.should.equal(test[3], "trimSuffix " + JSON.stringify(test[1]) + " " + JSON.stringify(test[2]));
    }
  });
});
