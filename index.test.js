const packages = [
  'bytes',
  'strings',
  'sync',
  'time',
  'unicode',
  'unicode/utf8',
];

describe('imports', function() {
  it('packages are importable', function() {
    for (var i = 0; i < packages.length; i++) {
      require('./' + packages[i]);
    }
  });
});
