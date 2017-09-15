// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
"use strict";

const utf8 = require('./');

describe("utf8", function() {
  it("should have constants", function() {
    (utf8.runeError > 1000).should.equal(true);
  });
});
