require("should");

const bytes = require('./index.js');

describe("bytes", function() {
  it("Slice", function() {
    var a = new bytes.Slice();
    a = a.append([0xc2, 0xa2]);
    a.toString().should.equal("¢");

    a = bytes.Slice.from([0xc2, 0xa2]);
    a.toString().should.equal("¢");
  });

  it("Slice.slice", function() {
    var a = bytes.Slice.from([0, 0, 0, 1, 2, 3]);
    var b = a.slice(3);
    b.length.should.equal(3);
    b.get(0).should.equal(1);
  });

  it("fromString", function() {
    var a = bytes.Slice.fromString("¢");
    a.get(0).should.equal(0xc2);
    a = bytes.Slice.fromString("€"); // UTF-8 encoded
    a.get(0).should.equal(0xe2);
    a.get(1).should.equal(0x82);
    a.get(2).should.equal(0xac);
    a.length.should.equal(3);
  });
});
