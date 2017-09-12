// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
"use strict";
require("should");

const sync = require("./sync.js");

describe("sync", function() {
  it("once", function() {
    var count = 0;
    var o = function() {
      count++;
    };
    var once = new sync.Once();
    for (var i = 0; i < 10; i++) {
      once.do(o);
    }
    count.should.equal(1);
    // todo check once with callbacks as well
  });
});
