"use strict";

require("should");

const internal = require("./index.js");

describe("internal", function() {
  it("deflateSync", function() {
    var d = internal.deflateFilesSync(__dirname + "/time/zoneinfo.zip", "America/Los_Angeles");
    (Object.keys(d).length > 100).should.equal(true);
  });
});
