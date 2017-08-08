const time = require("./time.js");

describe("time", function() {
  it("isZero", function() {
    var t = time.now();
    t.isZero().should.equal(false);
    t = new time.Time();
    t.isZero().should.equal(true);
  });

  it("sleep", function(done) {
    var start = Date.now();
    var d = time.Microsecond.mul(new time.Duration(5));
    var start = time.now();
    time.sleep(d, function() {
      done();
    });
  });
});
