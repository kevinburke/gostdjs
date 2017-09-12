"use strict";

const utf8 = require('./');

describe("utf8", function() {
  it("should have constants", function() {
    (utf8.runeError > 1000).should.equal(true);
  });
});
