const index = require('./');

describe('imports', function() {
  it('packages are importable', function() {
    for (var i = 0; i < index.packages.length; i++) {
      require('./' + index.packages[i]);
    }
  });
});
