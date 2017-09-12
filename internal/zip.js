// gostdjs version 0.1
// Copyright 2017 The Go Authors. All rights reserved. Use of this source code
// is governed by a BSD-style license that can be found in the LICENSE file.
"use strict";

const fs = require("fs");

const bits = require("./64bitints.js");
const types = require("./types.js");

var closefd = function(fd) {
  return fs.closeSync(fd);
};

const zecheader = 0x06054b50;
const zcheader  = 0x02014b50;
const ztailsize = 22;

const zheadersize = 30;
const zheader     = 0x04034b50;

// read buf bytes from fd or throw an error.
var preadn = function(fd, buf, off) {
  var pos; // null === beginning of file
  if (off < 0) {
    // unreal that I have to write this myself
    var stat = fs.fstatSync(fd);
    var size = stat.size;
    pos = size + off;
  } else {
    pos = off;
  }
  while (buf.length > 0) {
    var m = fs.readSync(fd, buf, 0, buf.length, pos);
    if (m <= 0) {
      throw new Error("short read");
    }
    buf = buf.slice(m);
    if (pos !== null) {
      pos += m;
    }
  }
  return;
};

// There are 500+ zoneinfo files. Rather than distribute them all
// individually, we ship them in an uncompressed zip file.
// Used this way, the zip file format serves as a commonly readable
// container for the individual small files. We choose zip over tar
// because zip files have a contiguous table of contents, making
// individual file lookups faster, and because the per-file overhead
// in a zip file is considerably less than tar's 512 bytes.

// get4 returns the little-endian 32-bit value in b.
var get4 = function(b) {
  if (b.length < 4) {
    return 0;
  }
  var i = bits.Int64.from(b[0]);
  i = i.or(bits.Int64.from(b[1]).shln(8));
  i = i.or(bits.Int64.from(b[2]).shln(16));
  i = i.or(bits.Int64.from(b[3]).shln(24));
  return i.toNumber();
};

// get2 returns the little-endian 16-bit value in b.
var get2 = function(b) {
  if (b.length < 2) {
    return 0;
  }
  var i = bits.Int64.from(b[0]);
  i = i.or(bits.Int64.from(b[1]).shln(8));
  return i.toNumber();
};

// Copy of the deflate function in Go's time package. Necessary because zlib
// does not support archives with multiple files in them.
var zip = {
  // deflateFileSync returns a Buffer containing the contents of the file in
  // zipfile with the given name. If no such file exists an error is thrown.
  deflateFileSync: function(zipfile, name) {
    // TODO can probably condense the code here a little bit.
    types.areStrings([zipfile, name]);
    var fd = fs.openSync(zipfile, 'r');
    try {
      var buf = new Buffer(ztailsize);
      buf.fill();
      preadn(fd, buf, -ztailsize);
      if (get4(buf) !== zecheader) {
        throw new Error("corrupt zip file " + zipfile);
      }
      var n = get2(buf.slice(10));
      var size = get4(buf.slice(12));
      var off = get4(buf.slice(16));

      buf = new Buffer(size);
      buf.fill();
      preadn(fd, buf, off);

      for (var i = 0; i < n; i++) {
        // zip entry layout:
        //	0	magic[4]
        //	4	madevers[1]
        //	5	madeos[1]
        //	6	extvers[1]
        //	7	extos[1]
        //	8	flags[2]
        //	10	meth[2]
        //	12	modtime[2]
        //	14	moddate[2]
        //	16	crc[4]
        //	20	csize[4]
        //	24	uncsize[4]
        //	28	namelen[2]
        //	30	xlen[2]
        //	32	fclen[2]
        //	34	disknum[2]
        //	36	iattr[2]
        //	38	eattr[4]
        //	42	off[4]
        //	46	name[namelen]
        //	46+namelen+xlen+fclen - next header
        //
        if (get4(buf) !== zcheader) {
          break;
        }
        var meth = get2(buf.slice(10));
        var size = get4(buf.slice(24));
        var namelen = get2(buf.slice(28));
        var xlen = get2(buf.slice(30));
        var fclen = get2(buf.slice(32));
        var off = get4(buf.slice(42));
        var zname = buf.slice(46, 46+namelen);
        buf = buf.slice(46+namelen+xlen+fclen);
        if (zname.toString() !== name) {
          continue;
        }
        if (meth !== 0) {
          throw new Error("unsupported compression for " + name + " in " + zipfile);
        }

        // zip per-file header layout:
        //	0	magic[4]
        //	4	extvers[1]
        //	5	extos[1]
        //	6	flags[2]
        //	8	meth[2]
        //	10	modtime[2]
        //	12	moddate[2]
        //	14	crc[4]
        //	18	csize[4]
        //	22	uncsize[4]
        //	26	namelen[2]
        //	28	xlen[2]
        //	30	name[namelen]
        //	30+namelen+xlen - file data
        //
        buf = new Buffer(zheadersize+namelen);
        buf.fill(0);
        preadn(fd, buf, off);
        if (get4(buf) !== zheader ||
          get2(buf.slice(8)) !== meth ||
          get2(buf.slice(26)) !== namelen ||
          buf.slice(30, 30+namelen).toString() !== name) {
          throw new Error("corrupt zip file " + zipfile);
        }
        xlen = get2(buf.slice(28));

        buf = new Buffer(size);
        buf.fill(0);
        preadn(fd, buf, off+30+namelen+xlen);

        return buf;
      }

      throw new Error("no file named " + name + " in " + zipfile);
    } finally {
      closefd(fd);
    }
  },

  // deflateFilesSync retuns a map[filename]Buffer of all of the zip files in
  // zipfile.
  deflateFilesSync: function(zipfile) {
    types.areStrings([zipfile]);
    var fd = fs.openSync(zipfile, 'r');
    try {
      var buf = new Buffer(ztailsize);
      buf.fill();
      preadn(fd, buf, -ztailsize);
      if (get4(buf) !== zecheader) {
        throw new Error("corrupt zip file " + zipfile);
      }
      var n = get2(buf.slice(10));
      var size = get4(buf.slice(12));
      var off = get4(buf.slice(16));

      buf = new Buffer(size);
      buf.fill();
      preadn(fd, buf, off);

      var d = {};
      for (var i = 0; i < n; i++) {
        // zip entry layout:
        //	0	magic[4]
        //	4	madevers[1]
        //	5	madeos[1]
        //	6	extvers[1]
        //	7	extos[1]
        //	8	flags[2]
        //	10	meth[2]
        //	12	modtime[2]
        //	14	moddate[2]
        //	16	crc[4]
        //	20	csize[4]
        //	24	uncsize[4]
        //	28	namelen[2]
        //	30	xlen[2]
        //	32	fclen[2]
        //	34	disknum[2]
        //	36	iattr[2]
        //	38	eattr[4]
        //	42	off[4]
        //	46	name[namelen]
        //	46+namelen+xlen+fclen - next header
        //
        if (get4(buf) !== zcheader) {
          console.log("get4", get4(buf));
          console.log("breaking", zcheader);
          break;
        }
        var meth = get2(buf.slice(10));
        var size = get4(buf.slice(24));
        var namelen = get2(buf.slice(28));
        var xlen = get2(buf.slice(30));
        var fclen = get2(buf.slice(32));
        off = get4(buf.slice(42));
        var zname = buf.slice(46, 46+namelen);
        var buf = buf.slice(46+namelen+xlen+fclen);
        var obuf = new Buffer(buf);
        if (meth !== 0) {
          throw new Error("unsupported compression for " + name + " in " + zipfile);
        }

        // zip per-file header layout:
        //	0	magic[4]
        //	4	extvers[1]
        //	5	extos[1]
        //	6	flags[2]
        //	8	meth[2]
        //	10	modtime[2]
        //	12	moddate[2]
        //	14	crc[4]
        //	18	csize[4]
        //	22	uncsize[4]
        //	26	namelen[2]
        //	28	xlen[2]
        //	30	name[namelen]
        //	30+namelen+xlen - file data
        //
        buf = new Buffer(zheadersize+namelen);
        buf.fill();
        preadn(fd, buf, off);
        if (get4(buf) !== zheader ||
          get2(buf.slice(8)) !== meth ||
          get2(buf.slice(26)) !== namelen) {
          throw new Error("corrupt zip file " + zipfile);
        }
        xlen = get2(buf.slice(28));

        buf = new Buffer(size);
        buf.fill();
        preadn(fd, buf, off+30+namelen+xlen);

        d[zname.toString()] = buf;
        buf = obuf;
      }

      return d;
    } finally {
      closefd(fd);
    }

  },
};

module.exports = zip;
