// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
"use strict";

const types = require('../internal/types.js');

class Once {
  constructor(f) {
    this.done = false;
  }

  do(f) {
    if (this.done === true) {
      return;
    }
    types.isFunction(f);
    this.done = true;
    f();
  };
};

var sync = {
  Once: Once,
};

module.exports = sync;
