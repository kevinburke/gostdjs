// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
"use strict";

var utf8 = {
  runeSelf: 0x80,
  runeError: '\uFFFD'.codePointAt(0),
};

module.exports = utf8;
