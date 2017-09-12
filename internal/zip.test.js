// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
"use strict";

require("should");

const internal = require("./index.js");

describe("internal", function() {
  it("deflateSync", function() {
    var d = internal.deflateFilesSync(__dirname + "/time/zoneinfo.zip", "America/Los_Angeles");
    (Object.keys(d).length > 100).should.equal(true);
  });
});
