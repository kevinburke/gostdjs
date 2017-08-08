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
