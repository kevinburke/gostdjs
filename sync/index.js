"use strict";

const sync = require("./sync.js");
module.exports = {
  // Once is an object that will perform exactly one action.
  // Once relies on Javascript's single threaded nature; if somehow two CPU's are
  // executing on the same contiguous memory region, Once's behavior is undefined.
  //
  // Usage:
  //
  //    var once = new sync.Once();
  //    once.do(function() { console.log('hi')});
  //    once.do(function() { console.log('hi')}); // Only one will print
  Once: sync.Once,
};
