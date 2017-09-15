// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
const index = require('./');

describe('imports', function() {
  it('packages are importable', function() {
    for (var i = 0; i < index.packages.length; i++) {
      require('./' + index.packages[i]);
    }
  });
});
