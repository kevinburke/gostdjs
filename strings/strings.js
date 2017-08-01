"use strict";
// Package strings implements simple functions to manipulate UTF-8 encoded strings.

module.exports = {
  // Compare returns an integer comparing two strings lexicographically. The
  // result will be 0 if a==b, -1 if a < b, and +1 if a > b. Compare is included
  // only for symmetry with package bytes. It is usually clearer and always
  // faster to use the built-in string comparison operators ==, <, >, and so on.
  //
  // Note compare uses the Javascript notions of string equality, not the Go
  // notions.
  compare: function(a, b) {
    if (a === b) {
      return 0;
    }
    if (a < b) {
      return -1;
    }
    return 1;
  },
}
