// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
module.exports = {
  throwSystem: function(e) {
    if ((e instanceof Error) === false) { return; }
    if (e instanceof TypeError ||
      e instanceof SyntaxError ||
      e instanceof ReferenceError ||
      e instanceof RangeError) {
      throw e;
    }
  },
};
