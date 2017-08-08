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
