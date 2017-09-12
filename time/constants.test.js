// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
"use strict";
require("should");

const internal = require("../internal/index.js");

const constants = require("./constants.js");

describe("constants", function() {
  it("match go values", function() {
    var azy = internal.Int64.fromString("-292277022399");
    azy.eq(constants.absoluteZeroYear).should.equal(true);

    var spd = internal.Int64.fromString("86400");
    spd.eq(constants.secondsPerDay).should.equal(true);

    var spw = internal.Int64.fromString("604800");
    spw.eq(constants.secondsPerWeek).should.equal(true);

    var dp400 = internal.Int64.fromString("146097");
    dp400.eq(constants.daysPer400Years).should.equal(true);

    var dp1 = internal.Int64.fromString("36524");
    dp1.eq(constants.daysPer100Years).should.equal(true);

    var dp4 = internal.Int64.fromString("1461");
    dp4.eq(constants.daysPer4Years).should.equal(true);

    var ati = internal.Int64.fromString("-9223371966579724800");
    ati.eq(constants.absoluteToInternal).should.equal(true);

    var ita = internal.Int64.fromString("9223371966579724800");
    ita.eq(constants.internalToAbsolute).should.equal(true);

    var uti = internal.Int64.fromString("62135596800");
    uti.eq(constants.unixToInternal).should.equal(true);

    var itu = internal.Int64.fromString("-62135596800");
    itu.eq(constants.internalToUnix).should.equal(true);

    var wti = internal.Int64.fromString("59453308800");
    wti.eq(constants.wallToInternal).should.equal(true);

    var hm = internal.Uint64.fromString("9223372036854775808");
    hm.eq(constants.hasMonotonic).should.equal(true);

    var nsm = internal.Int64.fromString("1073741823");
    nsm.eq(constants.nsecMask).should.equal(true);

    var nss = internal.Int64.fromString("30");
    nss.eq(constants.nsecShift).should.equal(true);
  });
});
