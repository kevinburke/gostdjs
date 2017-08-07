'use strict';

var assert = require('assert');
var bits = require('./64bitints.js');
var Uint64 = bits.Uint64;

var ZERO = Uint64.fromInt(0);
var ONE = Uint64.fromInt(1);
var UONE = Uint64.fromInt(1);
var MAX_U64 = Uint64.fromBits(0xffffffff, 0xffffffff);
var MAX_SAFE = Uint64.fromNumber(Number.MAX_SAFE_INTEGER);
var MAX_SAFE_MIN = Uint64.fromNumber(-Number.MAX_SAFE_INTEGER);
var MAX_SAFE_MAX = Uint64.fromNumber(Number.MAX_SAFE_INTEGER);

describe('uint64', function() {
  it('should instantiate and serialize', function() {
    var num1 = Uint64.fromBits(0x7fffffff, 0xffffffff);
    var num2;

    assert.strictEqual(num1.toDouble(), 9223372036854775807);
    assert.strictEqual(num1.toString(), '9223372036854775807');

    num2 = Uint64.fromString(num1.toString());

    assert.strictEqual(num2.toDouble(), 9223372036854775807);
    assert.strictEqual(num2.toString(), '9223372036854775807');
    assert.strictEqual(num2.signed, num1.signed);
  });

  it('should duck type', function() {
    var num = Uint64.fromBits(0x7fffffff, 0xffffffff);
    assert.strictEqual(Uint64.isUint64(num), true);
    assert.strictEqual(Uint64.isUint64({}), false);
  });

  it('should serialize unsigned strings', function() {
    var num = Uint64.fromBits(0xffffffff, 0xffffffff);
    assert.strictEqual(num.toString(16), 'ffffffffffffffff');
    assert.strictEqual(num.toString(10), '18446744073709551615');
    assert.strictEqual(num.toString(8), '1777777777777777777777');
    assert.strictEqual(num.toString(2),
      '1111111111111111111111111111111111111111111111111111111111111111');

    num = Uint64.fromNumber(123456789012);
    assert.strictEqual(num.toNumber(), 123456789012);
    assert.strictEqual(num.toString(16), '1cbe991a14');
    assert.strictEqual(num.toString(10), '123456789012');
    assert.strictEqual(num.toString(8), '1627646215024');
    assert.strictEqual(num.toString(2),
      '1110010111110100110010001101000010100');
  });

  it('should deserialize unsigned strings', function() {
    var num = Uint64.fromString('ffffffffffffffff', 16);
    assert.strictEqual(num.toString(16), 'ffffffffffffffff');

    num = Uint64.fromString('18446744073709551615', 10);
    assert.strictEqual(num.toString(10), '18446744073709551615');

    num = Uint64.fromString('1777777777777777777777', 8);
    assert.strictEqual(num.toString(8), '1777777777777777777777');

    num = Uint64.fromString(
      '1111111111111111111111111111111111111111111111111111111111111111', 2);
    assert.strictEqual(num.toString(2),
      '1111111111111111111111111111111111111111111111111111111111111111');

    num = Uint64.fromString('1cbe991a14', 16);
    assert.strictEqual(num.toString(16), '1cbe991a14');

    num = Uint64.fromString('123456789012', 10);
    assert.strictEqual(num.toString(10), '123456789012');

    num = Uint64.fromString('1627646215024', 8);
    assert.strictEqual(num.toString(8), '1627646215024');

    num = Uint64.fromString('1110010111110100110010001101000010100', 2);
    assert.strictEqual(num.toString(2), '1110010111110100110010001101000010100');
  });

  it('should serialize strings for min/max', function() {
    assert.strictEqual(MAX_U64.toString(), '18446744073709551615');
  });

  it('should cast a negative', function() {
    var num = Uint64.fromInt(-1);
    assert.strictEqual(num.lo, -1);
    assert.strictEqual(num.hi, -1);
    assert.throws(function() {
      num.toNumber();
    });
    assert.strictEqual(num.toDouble(), 18446744073709551615);
    assert.strictEqual(num.toString(), '18446744073709551615');
  });

  it('should handle uint64 max', function() {
    var num = Uint64.fromBits(0xffffffff, 0xffffffff);
    assert.strictEqual(num.lo, -1);
    assert.strictEqual(num.hi, -1);
    assert.throws(function() {
      num.toNumber();
    });
    assert.strictEqual(num.toDouble(), 18446744073709551615);
    assert.strictEqual(num.toString(), '18446744073709551615');
  });

  it('should handle uint64 max as string', function() {
    var num = Uint64.fromString('ffffffffffffffff', 16);
    assert.strictEqual(num.lo, -1);
    assert.strictEqual(num.hi, -1);
    assert.strictEqual(num.toDouble(), 18446744073709551615);
    assert.strictEqual(num.toString(), '18446744073709551615');
  });

  it('should count bits', function() {
    var num = Uint64.fromString('000010000fffffff', 16);
    assert.strictEqual(num.bitLength(), 45);
    assert.strictEqual(num.byteLength(), 6);
    num = Uint64.fromString('800010000fffffff', 16);
    assert.strictEqual(num.bitLength(), 64);
    assert.strictEqual(num.byteLength(), 8);
  });

  it('should subtract from uint64 max to zero', function() {
    var num = MAX_U64.sub(MAX_U64);
    assert.strictEqual(num.lo, 0);
    assert.strictEqual(num.hi, 0);
    assert.strictEqual(num.toDouble(), 0);
    assert.strictEqual(num.toString(), '0');
  });

  it('should overflow from subtraction', function() {
    var num = Uint64.fromInt(0).sub(Uint64.fromInt(1));
    assert.strictEqual(num.lo, -1);
    assert.strictEqual(num.hi, -1);
    assert.strictEqual(num.toDouble(), 18446744073709551615);
    assert.strictEqual(num.toString(), '18446744073709551615');
  });

  it('should divide uint64 max by itself', function() {
    var num = MAX_U64;
    assert.strictEqual(num.div(num).toString(), '1');
  });

  it('should implicitly cast for comparison', function() {
    var num = UONE.shln(63);
    assert.strictEqual(num.toString(), '9223372036854775808');
    assert.strictEqual(
      Uint64.fromString('9223372036854775808').toString(),
      '9223372036854775808');
  });

  it('should maintain sign after division', function() {
    var a = Uint64.fromBits(8, 0);
    var b = Uint64.fromNumber(2656901066);
    var x;

    x = a.div(b);

    assert.strictEqual(x.toString(), '12');
  });

  it('should do comparisons', function() {
    assert.strictEqual(ONE.eq(UONE), true);
    assert.strictEqual(ONE.cmp(UONE), 0);
    assert.strictEqual(MAX_U64.eq(ONE), false);
    assert.strictEqual(ONE.eq(MAX_U64), false);
    assert.strictEqual(ONE.isOdd(), true);
    assert.strictEqual(ONE.isEven(), false);
    assert.strictEqual(MAX_U64.isOdd(), true);
    assert.strictEqual(MAX_U64.isEven(), false);
    assert.strictEqual(MAX_U64.subn(1).isOdd(), false);
    assert.strictEqual(MAX_U64.subn(1).isEven(), true);
    assert.strictEqual(Uint64.fromNumber(0, false).isZero(), true);
    assert.strictEqual(Uint64.fromNumber(0, true).isZero(), true);
    assert.strictEqual(ONE.isZero(), false);
    assert.strictEqual(MAX_U64.isZero(), false);
    assert.strictEqual(MAX_U64.isNeg(), false);
    assert.strictEqual(ONE.eqn(1), true);
    assert.strictEqual(ONE.ltn(1), false);
    assert.strictEqual(ONE.lten(1), true);
    assert.strictEqual(ONE.subn(1).lten(1), true);
    assert.strictEqual(ONE.subn(1).ltn(1), true);
    assert.strictEqual(ONE.addn(1).lten(1), false);
    assert.strictEqual(ONE.addn(1).ltn(1), false);
    assert.strictEqual(ONE.addn(1).gten(1), true);
    assert.strictEqual(ONE.addn(1).gtn(1), true);
    assert.strictEqual(ONE.addn(1).lten(1), false);
    assert.strictEqual(ONE.addn(1).ltn(1), false);
    assert.strictEqual(Uint64.min(ZERO, ONE), ZERO);
    assert.strictEqual(Uint64.max(ZERO, ONE), ONE);
    assert.strictEqual(Uint64.min(Uint64(1), ONE), ONE);
    assert.strictEqual(Uint64.max(Uint64(1), ONE), ONE);
  });

  it('should do small addition (unsigned)', function() {
    var a = Uint64.fromNumber(100, false);
    var b = Uint64.fromNumber(200, false);
    a.iadd(b);
    assert.strictEqual(a.toString(), '300');

    a = Uint64.fromNumber(100, false);
    a.iaddn(200);
    assert.strictEqual(a.toString(), '300');

    a = Uint64.fromNumber(100, false);
    b = Uint64.fromNumber(200, false);
    assert.strictEqual(a.add(b).toString(), '300');
    assert.strictEqual(a.toString(), '100');

    a = Uint64.fromNumber(100, false);
    assert.strictEqual(a.addn(200).toString(), '300');
    assert.strictEqual(a.toString(), '100');
  });

  it('should do small addition (signed)', function() {
    var a = Uint64.fromNumber(100, true);
    var b = Uint64.fromNumber(-50, true);
    a.iadd(b);
    assert.strictEqual(a.toString(), '50');

    a = Uint64.fromNumber(100, true);
    a.iaddn(-50);
    assert.strictEqual(a.toString(), '50');

    a = Uint64.fromNumber(100, true);
    b = Uint64.fromNumber(-50, true);
    assert.strictEqual(a.add(b).toString(), '50');
    assert.strictEqual(a.toString(), '100');

    a = Uint64.fromNumber(100, true);
    assert.strictEqual(a.addn(-50).toString(), '50');
    assert.strictEqual(a.toString(), '100');
  });

  it('should do big addition (unsigned)', function() {
    var a = Uint64.fromNumber(100 * 0x100000000, false);
    var b = Uint64.fromNumber(200 * 0x100000000, false);
    a.iadd(b);
    assert.strictEqual(a.toString(), '1288490188800');

    a = Uint64.fromNumber(100 * 0x100000000, false);
    a.iaddn(0x3ffffff);
    assert.strictEqual(a.toString(), '429563838463');

    a = Uint64.fromNumber(100 * 0x100000000, false);
    b = Uint64.fromNumber(200 * 0x100000000, false);
    assert.strictEqual(a.add(b).toString(), '1288490188800');
    assert.strictEqual(a.toString(), '429496729600');

    a = Uint64.fromNumber(100 * 0x100000000, false);
    assert.strictEqual(a.addn(0x3ffffff).toString(), '429563838463');
    assert.strictEqual(a.toString(), '429496729600');
  });

  it('should do big addition (signed)', function() {
    var a = Uint64.fromNumber(100 * 0x100000000, true);
    var b = Uint64.fromNumber(-50 * 0x100000000, true);
    a.iadd(b);
    assert.strictEqual(a.toString(), '214748364800');

    a = Uint64.fromNumber(100 * 0x100000000, true);
    a.iaddn(-50 * 0x100000);
    assert.strictEqual(a.toString(), '429444300800');

    a = Uint64.fromNumber(100 * 0x100000000, true);
    b = Uint64.fromNumber(-50 * 0x100000000, true);
    assert.strictEqual(a.add(b).toString(), '214748364800');
    assert.strictEqual(a.toString(), '429496729600');

    a = Uint64.fromNumber(100 * 0x100000000, true);
    assert.strictEqual(a.addn(-50 * 0x100000).toString(), '429444300800');
    assert.strictEqual(a.toString(), '429496729600');
  });

  it('should do small subtraction (unsigned)', function() {
    var a = Uint64.fromNumber(200, false);
    var b = Uint64.fromNumber(100, false);
    a.isub(b);
    assert.strictEqual(a.toString(), '100');

    a = Uint64.fromNumber(200, false);
    a.isubn(100);
    assert.strictEqual(a.toString(), '100');

    a = Uint64.fromNumber(200, false);
    b = Uint64.fromNumber(100, false);
    assert.strictEqual(a.sub(b).toString(), '100');
    assert.strictEqual(a.toString(), '200');

    a = Uint64.fromNumber(200, false);
    assert.strictEqual(a.subn(100).toString(), '100');
    assert.strictEqual(a.toString(), '200');
  });

  it('should do small subtraction (signed)', function() {
    var a = Uint64.fromNumber(100, true);
    var b = Uint64.fromNumber(-50, true);
    a.isub(b);
    assert.strictEqual(a.toString(), '150');

    a = Uint64.fromNumber(100, true);
    a.isubn(-50);
    assert.strictEqual(a.toString(), '150');

    a = Uint64.fromNumber(100, true);
    b = Uint64.fromNumber(-50, true);
    assert.strictEqual(a.sub(b).toString(), '150');
    assert.strictEqual(a.toString(), '100');

    a = Uint64.fromNumber(100, true);
    assert.strictEqual(a.subn(-50).toString(), '150');
    assert.strictEqual(a.toString(), '100');
  });

  it('should do big subtraction (unsigned)', function() {
    var a = Uint64.fromNumber(100 * 0x100000000);
    var b = Uint64.fromNumber(200 * 0x100000000);
    a.isub(b);
    assert.strictEqual(a.toString(), '18446743644212822016');

    a = Uint64.fromNumber(100 * 0x100000000);
    a.isubn(200 * 0x100000);
    assert.strictEqual(a.toString(), '429287014400');

    a = Uint64.fromNumber(100 * 0x100000000);
    b = Uint64.fromNumber(200 * 0x100000000);
    assert.strictEqual(a.sub(b).toString(), '18446743644212822016');
    assert.strictEqual(a.toString(), '429496729600');

    a = Uint64.fromNumber(100 * 0x100000000, false);
    assert.strictEqual(a.subn(200 * 0x100000).toString(), '429287014400');
    assert.strictEqual(a.toString(), '429496729600');
  });

  it('should do small multiplication (unsigned)', function() {
    var a = Uint64.fromNumber(100, false);
    var b = Uint64.fromNumber(200, false);
    a.imul(b);
    assert.strictEqual(a.toString(), '20000');

    a = Uint64.fromNumber(100, false);
    a.imuln(200);
    assert.strictEqual(a.toString(), '20000');

    a = Uint64.fromNumber(100, false);
    b = Uint64.fromNumber(200, false);
    assert.strictEqual(a.mul(b).toString(), '20000');
    assert.strictEqual(a.toString(), '100');

    a = Uint64.fromNumber(100, false);
    assert.strictEqual(a.muln(200).toString(), '20000');
    assert.strictEqual(a.toString(), '100');
  });

  it('should do big multiplication (unsigned)', function() {
    var a = Uint64.fromNumber(100 * 0x100000000, false);
    var b = Uint64.fromNumber(10 * 0x10000000, false);
    a.imul(b);
    assert.strictEqual(a.toString(), '9223372036854775808');

    a = Uint64.fromNumber(100 * 0x100000000, false);
    a.imuln(200 * 0x1000000);
    assert.strictEqual(a.toString(), '2305843009213693952');

    a = Uint64.fromNumber(100 * 0x100000000, false);
    b = Uint64.fromNumber(10 * 0x10000000, false);
    assert.strictEqual(a.mul(b).toString(), '9223372036854775808');
    assert.strictEqual(a.toString(), '429496729600');

    a = Uint64.fromNumber(100 * 0x100000000, false);
    assert.strictEqual(a.muln(200 * 0x1000000).toString(),
      '2305843009213693952');
    assert.strictEqual(a.toString(), '429496729600');
  });

  it('should do small division (unsigned)', function() {
    var a = Uint64.fromNumber(200, false);
    var b = Uint64.fromNumber(100, false);
    a.idiv(b);
    assert.strictEqual(a.toString(), '2');

    a = Uint64.fromNumber(200, false);
    a.idivn(100);
    assert.strictEqual(a.toString(), '2');

    a = Uint64.fromNumber(200, false);
    b = Uint64.fromNumber(100, false);
    assert.strictEqual(a.div(b).toString(), '2');
    assert.strictEqual(a.toString(), '200');

    a = Uint64.fromNumber(200, false);
    assert.strictEqual(a.divn(100).toString(), '2');
    assert.strictEqual(a.toString(), '200');
  });

  it('should do big division (unsigned)', function() {
    var a = Uint64.fromNumber(100 * 0x100000000, false);
    var b = Uint64.fromNumber(10 * 0x10000000, false);
    a.idiv(b);
    assert.strictEqual(a.toString(), '160');

    a = Uint64.fromNumber(100 * 0x100000000, false);
    a.idivn(0x3ffffff);
    assert.strictEqual(a.toString(), '6400');

    a = Uint64.fromNumber(100 * 0x100000000, false);
    b = Uint64.fromNumber(10 * 0x10000000, false);
    assert.strictEqual(a.div(b).toString(), '160');
    assert.strictEqual(a.toString(), '429496729600');

    a = Uint64.fromNumber(100 * 0x100000000, false);
    assert.strictEqual(a.divn(0x3ffffff).toString(), '6400');
    assert.strictEqual(a.toString(), '429496729600');
  });

  it('should do small modulo (unsigned)', function() {
    var a = Uint64.fromNumber(23525432, false);
    var b = Uint64.fromNumber(100, false);
    a.imod(b);
    assert.strictEqual(a.toString(), '32');

    a = Uint64.fromNumber(435325234, false);
    a.imodn(100);
    assert.strictEqual(a.toString(), '34');

    a = Uint64.fromNumber(131235, false);
    b = Uint64.fromNumber(100, false);
    assert.strictEqual(a.mod(b).toString(), '35');
    assert.strictEqual(a.toString(), '131235');

    a = Uint64.fromNumber(1130021, false);
    assert.strictEqual(a.modn(100).toString(), '21');
    assert.strictEqual(a.toString(), '1130021');
  });

  it('should do big modulo (unsigned)', function() {
    var a = Uint64.fromNumber(100 * 0x100000000, false);
    var b = Uint64.fromNumber(9 * 0x10000000, false);
    a.imod(b);
    assert.strictEqual(a.toString(), '1879048192');

    a = Uint64.fromNumber(100 * 0x100000000, false);
    a.imodn(0x3ffffff);
    assert.strictEqual(a.toString(), '6400');

    a = Uint64.fromNumber(100 * 0x100000000, false);
    b = Uint64.fromNumber(9 * 0x10000000, false);
    assert.strictEqual(a.mod(b).toString(), '1879048192');
    assert.strictEqual(a.toString(), '429496729600');

    a = Uint64.fromNumber(100 * 0x100000000, false);
    assert.strictEqual(a.modn(0x3ffffff).toString(), '6400');
    assert.strictEqual(a.toString(), '429496729600');
  });

  it('should do small pow (unsigned)', function() {
    var a = Uint64.fromNumber(123, false);
    var b = Uint64.fromNumber(6, false);
    a.ipow(b);
    assert.strictEqual(a.toString(), '3462825991689');

    a = Uint64.fromNumber(123, false);
    a.ipown(6);
    assert.strictEqual(a.toString(), '3462825991689');

    a = Uint64.fromNumber(123, false);
    b = Uint64.fromNumber(6, false);
    assert.strictEqual(a.pow(b).toString(), '3462825991689');
    assert.strictEqual(a.toString(), '123');

    a = Uint64.fromNumber(123, false);
    assert.strictEqual(a.pown(6).toString(), '3462825991689');
    assert.strictEqual(a.toString(), '123');
  });

  it('should do big pow (unsigned)', function() {
    var a = Uint64.fromNumber(2);
    var b = Uint64.fromNumber(63);
    a.ipow(b);
    assert.strictEqual(a.toString(), '9223372036854775808');

    a = Uint64.fromNumber(2);
    a.ipown(63);
    assert.strictEqual(a.toString(), '9223372036854775808');

    a = Uint64.fromNumber(2);
    b = Uint64.fromNumber(63);
    assert.strictEqual(a.pow(b).toString(), '9223372036854775808');
    assert.strictEqual(a.toString(), '2');

    a = Uint64.fromNumber(2);
    assert.strictEqual(a.pown(63).toString(), '9223372036854775808');
    assert.strictEqual(a.toString(), '2');

    a = Uint64.fromNumber(2);
    assert.strictEqual(a.pown(64).subn(1).toString(), '18446744073709551615');

    a = Uint64.fromNumber(2);
    assert.strictEqual(a.pown(64).toString(), '0');
  });

  it('should square', function() {
    var a = Uint64.fromNumber(6);
    a.isqr();
    assert.strictEqual(a.toString(), '36');

    a = Uint64.fromNumber(6, false);
    assert.strictEqual(a.sqr().toString(), '36');
    assert.strictEqual(a.toString(), '6');
  });

  it('should do small AND (unsigned)', function() {
    var a = Uint64.fromNumber(12412, false);
    var b = Uint64.fromNumber(200, false);
    a.iand(b);
    assert.strictEqual(a.toString(), '72');

    a = Uint64.fromNumber(12412, false);
    a.iandn(200);
    assert.strictEqual(a.toString(), '72');

    a = Uint64.fromNumber(12412, false);
    b = Uint64.fromNumber(200, false);
    assert.strictEqual(a.and(b).toString(), '72');
    assert.strictEqual(a.toString(), '12412');

    a = Uint64.fromNumber(12412, false);
    assert.strictEqual(a.andn(200).toString(), '72');
    assert.strictEqual(a.toString(), '12412');
  });

  it('should do small AND (signed)', function() {
    var a = Uint64.fromNumber(12412, true);
    var b = Uint64.fromNumber(-50, true);
    a.iand(b);
    assert.strictEqual(a.toString(), '12364');

    a = Uint64.fromNumber(12412, true);
    a.iandn(-50);
    assert.strictEqual(a.toString(), '12364');

    a = Uint64.fromNumber(12412, true);
    b = Uint64.fromNumber(-50, true);
    assert.strictEqual(a.and(b).toString(), '12364');
    assert.strictEqual(a.toString(), '12412');

    a = Uint64.fromNumber(12412, true);
    assert.strictEqual(a.andn(-50).toString(), '12364');
    assert.strictEqual(a.toString(), '12412');
  });

  it('should do big AND (unsigned)', function() {
    var a = Uint64.fromNumber(1214532435245234, false);
    var b = Uint64.fromNumber(1242541452, false);
    a.iand(b);
    assert.strictEqual(a.toString(), '1242474624');

    a = Uint64.fromNumber(13545214126, false);
    a.iandn(7 * 0x1000000);
    assert.strictEqual(a.toString(), '117440512');

    a = Uint64.fromNumber(13545214126, false);
    b = Uint64.fromNumber(7 * 0x10000000, false);
    assert.strictEqual(a.and(b).toString(), '536870912');
    assert.strictEqual(a.toString(), '13545214126');

    a = Uint64.fromNumber(13545214126, false);
    assert.strictEqual(a.andn(7 * 0x1000000).toString(), '117440512');
    assert.strictEqual(a.toString(), '13545214126');
  });

  it('should do big AND (signed)', function() {
    var a = Uint64.fromNumber(1214532435245234, true);
    var b = Uint64.fromNumber(1242541452, true);
    a.iand(b);
    assert.strictEqual(a.toString(), '1242474624');

    a = Uint64.fromNumber(13545214126, true);
    a.iandn(7 * 0x1000000);
    assert.strictEqual(a.toString(), '117440512');

    a = Uint64.fromNumber(13545214126, true);
    b = Uint64.fromNumber(7 * 0x10000000, true);
    assert.strictEqual(a.and(b).toString(), '536870912');
    assert.strictEqual(a.toString(), '13545214126');

    a = Uint64.fromNumber(13545214126, true);
    assert.strictEqual(a.andn(7 * 0x1000000).toString(), '117440512');
    assert.strictEqual(a.toString(), '13545214126');
  });

  it('should do small OR (unsigned)', function() {
    var a = Uint64.fromNumber(12412, false);
    var b = Uint64.fromNumber(200, false);
    a.ior(b);
    assert.strictEqual(a.toString(), '12540');

    a = Uint64.fromNumber(12412, false);
    a.iorn(200);
    assert.strictEqual(a.toString(), '12540');

    a = Uint64.fromNumber(12412, false);
    b = Uint64.fromNumber(200, false);
    assert.strictEqual(a.or(b).toString(), '12540');
    assert.strictEqual(a.toString(), '12412');

    a = Uint64.fromNumber(12412, false);
    assert.strictEqual(a.orn(200).toString(), '12540');
    assert.strictEqual(a.toString(), '12412');
  });

  it('should do big OR (unsigned)', function() {
    var a = Uint64.fromNumber(1214532435245234, false);
    var b = Uint64.fromNumber(1242541452, false);
    a.ior(b);
    assert.strictEqual(a.toString(), '1214532435312062');

    a = Uint64.fromNumber(13545214126, false);
    a.iorn(7 * 0x1000000);
    assert.strictEqual(a.toString(), '13545214126');

    a = Uint64.fromNumber(13545214126, false);
    b = Uint64.fromNumber(7 * 0x10000000, false);
    assert.strictEqual(a.or(b).toString(), '14887391406');
    assert.strictEqual(a.toString(), '13545214126');

    a = Uint64.fromNumber(13545214126, false);
    assert.strictEqual(a.orn(7 * 0x1000000).toString(), '13545214126');
    assert.strictEqual(a.toString(), '13545214126');
  });

  it('should do small XOR (unsigned)', function() {
    var a = Uint64.fromNumber(12412, false);
    var b = Uint64.fromNumber(200, false);
    a.ixor(b);
    assert.strictEqual(a.toString(), '12468');

    a = Uint64.fromNumber(12412, false);
    a.ixorn(200);
    assert.strictEqual(a.toString(), '12468');

    a = Uint64.fromNumber(12412, false);
    b = Uint64.fromNumber(200, false);
    assert.strictEqual(a.xor(b).toString(), '12468');
    assert.strictEqual(a.toString(), '12412');

    a = Uint64.fromNumber(12412, false);
    assert.strictEqual(a.xorn(200).toString(), '12468');
    assert.strictEqual(a.toString(), '12412');
  });

  it('should do big XOR (unsigned)', function() {
    var a = Uint64.fromNumber(1214532435245234, false);
    var b = Uint64.fromNumber(1242541452, false);
    a.ixor(b);
    assert.strictEqual(a.toString(), '1214531192837438');

    a = Uint64.fromNumber(13545214126, false);
    a.ixorn(7 * 0x1000000);
    assert.strictEqual(a.toString(), '13427773614');

    a = Uint64.fromNumber(13545214126, false);
    b = Uint64.fromNumber(7 * 0x10000000, false);
    assert.strictEqual(a.xor(b).toString(), '14350520494');
    assert.strictEqual(a.toString(), '13545214126');

    a = Uint64.fromNumber(13545214126, false);
    assert.strictEqual(a.xorn(7 * 0x1000000).toString(), '13427773614');
    assert.strictEqual(a.toString(), '13545214126');
  });

  it('should do big XOR (signed)', function() {
    var a = Uint64.fromNumber(1214532435245234, true);
    var b = Uint64.fromNumber(1242541452, true);
    a.ixor(b);
    assert.strictEqual(a.toString(), '1214531192837438');

    a = Uint64.fromNumber(13545214126, true);
    a.ixorn(7 * 0x1000000);
    assert.strictEqual(a.toString(), '13427773614');

    a = Uint64.fromNumber(13545214126, true);
    b = Uint64.fromNumber(7 * 0x10000000, true);
    assert.strictEqual(a.xor(b).toString(), '14350520494');
    assert.strictEqual(a.toString(), '13545214126');

    a = Uint64.fromNumber(13545214126, true);
    assert.strictEqual(a.xorn(7 * 0x1000000).toString(), '13427773614');
    assert.strictEqual(a.toString(), '13545214126');
  });

  it('should do small left shift (unsigned)', function() {
    var a = Uint64.fromNumber(12412, false);
    var b = Uint64.fromNumber(2, false);
    a.ishl(b);
    assert.strictEqual(a.toString(), '49648');

    a = Uint64.fromNumber(12412, false);
    a.ishln(2);
    assert.strictEqual(a.toString(), '49648');

    a = Uint64.fromNumber(12412, false);
    b = Uint64.fromNumber(2, false);
    assert.strictEqual(a.shl(b).toString(), '49648');
    assert.strictEqual(a.toString(), '12412');

    a = Uint64.fromNumber(12412, false);
    assert.strictEqual(a.shln(2).toString(), '49648');
    assert.strictEqual(a.toString(), '12412');
  });

  it('should do small left shift (signed)', function() {
    var a = Uint64.fromNumber(12412, true);
    var b = Uint64.fromNumber(2, true);
    a.ishl(b);
    assert.strictEqual(a.toString(), '49648');

    a = Uint64.fromNumber(12412, true);
    a.ishln(2);
    assert.strictEqual(a.toString(), '49648');

    a = Uint64.fromNumber(12412, true);
    b = Uint64.fromNumber(2, true);
    assert.strictEqual(a.shl(b).toString(), '49648');
    assert.strictEqual(a.toString(), '12412');

    a = Uint64.fromNumber(12412, true);
    assert.strictEqual(a.shln(2).toString(), '49648');
    assert.strictEqual(a.toString(), '12412');
  });

  it('should do big left shift (unsigned)', function() {
    var a = Uint64.fromNumber(123, false);
    var b = Uint64.fromNumber(60, false);
    a.ishl(b);
    assert.strictEqual(a.toString(), '12682136550675316736');

    a = Uint64.fromNumber(123, false);
    a.ishln(60);
    assert.strictEqual(a.toString(), '12682136550675316736');

    a = Uint64.fromNumber(123, false);
    b = Uint64.fromNumber(60, false);
    assert.strictEqual(a.shl(b).toString(), '12682136550675316736');
    assert.strictEqual(a.toString(), '123');

    a = Uint64.fromNumber(123, false);
    assert.strictEqual(a.shln(60).toString(), '12682136550675316736');
    assert.strictEqual(a.toString(), '123');
  });

  it('should do small right shift (unsigned)', function() {
    var a = Uint64.fromNumber(12412, false);
    var b = Uint64.fromNumber(2, false);
    a.ishr(b);
    assert.strictEqual(a.toString(), '3103');

    a = Uint64.fromNumber(12412, false);
    a.ishrn(2);
    assert.strictEqual(a.toString(), '3103');

    a = Uint64.fromNumber(12412, false);
    b = Uint64.fromNumber(2, false);
    assert.strictEqual(a.shr(b).toString(), '3103');
    assert.strictEqual(a.toString(), '12412');

    a = Uint64.fromNumber(12412, false);
    assert.strictEqual(a.shrn(2).toString(), '3103');
    assert.strictEqual(a.toString(), '12412');
  });

  it('should do small right shift (signed)', function() {
    var a = Uint64.fromNumber(12412, true);
    var b = Uint64.fromNumber(2, true);
    a.ishr(b);
    assert.strictEqual(a.toString(), '3103');

    a = Uint64.fromNumber(12412, true);
    a.ishrn(2);
    assert.strictEqual(a.toString(), '3103');

    a = Uint64.fromNumber(12412, true);
    b = Uint64.fromNumber(2, true);
    assert.strictEqual(a.shr(b).toString(), '3103');
    assert.strictEqual(a.toString(), '12412');

    a = Uint64.fromNumber(12412, true);
    assert.strictEqual(a.shrn(2).toString(), '3103');
    assert.strictEqual(a.toString(), '12412');
  });

  it('should do big right shift (unsigned)', function() {
    var a = Uint64.fromString('f00fffffffffffff', 16);
    var b = Uint64.fromNumber(45, false);
    a.ishr(b);
    assert.strictEqual(a.toString(), '491647');

    a = Uint64.fromString('f00fffffffffffff', 16);
    a.ishrn(45);
    assert.strictEqual(a.toString(), '491647');

    a = Uint64.fromString('f00fffffffffffff', 16);
    b = Uint64.fromNumber(45, false);
    assert.strictEqual(a.shr(b).toString(), '491647');
    assert.strictEqual(a.toString(), '17298326168730075135');

    a = Uint64.fromString('f00fffffffffffff', 16);
    assert.strictEqual(a.shrn(45).toString(), '491647');
    assert.strictEqual(a.toString(), '17298326168730075135');
  });

  it('should do small unsigned right shift (unsigned)', function() {
    var a = Uint64.fromNumber(12412);
    var b = Uint64.fromNumber(2);
    a.iushr(b);
    assert.strictEqual(a.toString(), '3103');

    a = Uint64.fromNumber(12412);
    a.iushrn(2);
    assert.strictEqual(a.toString(), '3103');

    a = Uint64.fromNumber(12412, false);
    b = Uint64.fromNumber(2, false);
    assert.strictEqual(a.ushr(b).toString(), '3103');
    assert.strictEqual(a.toString(), '12412');

    a = Uint64.fromNumber(12412, false);
    assert.strictEqual(a.ushrn(2).toString(), '3103');
    assert.strictEqual(a.toString(), '12412');
  });

  it('should do small unsigned right shift (signed)', function() {
    var a = Uint64.fromNumber(12412, true);
    var b = Uint64.fromNumber(2, true);
    a.iushr(b);
    assert.strictEqual(a.toString(), '3103');

    a = Uint64.fromNumber(12412, true);
    a.iushrn(2);
    assert.strictEqual(a.toString(), '3103');

    a = Uint64.fromNumber(12412, true);
    b = Uint64.fromNumber(2, true);
    assert.strictEqual(a.ushr(b).toString(), '3103');
    assert.strictEqual(a.toString(), '12412');

    a = Uint64.fromNumber(12412, true);
    assert.strictEqual(a.ushrn(2).toString(), '3103');
    assert.strictEqual(a.toString(), '12412');
  });

  it('should do big unsigned right shift (unsigned)', function() {
    var a = Uint64.fromString('ffffffffffffffff', 16);
    var b = Uint64.fromNumber(45);
    a.iushr(b);
    assert.strictEqual(a.toString(), '524287');

    a = Uint64.fromString('ffffffffffffffff', 16);
    a.iushrn(45);
    assert.strictEqual(a.toString(), '524287');

    a = Uint64.fromString('ffffffffffffffff', 16);
    b = Uint64.fromNumber(45);
    assert.strictEqual(a.ushr(b).toString(), '524287');
    assert.strictEqual(a.toString(), '18446744073709551615');

    a = Uint64.fromString('ffffffffffffffff', 16);
    assert.strictEqual(a.ushrn(45).toString(), '524287');
    assert.strictEqual(a.toString(), '18446744073709551615');
  });

  it('should set and test bits', function() {
    var a = Uint64(0);
    assert.strictEqual(a.testn(35), 0);
    a.setn(35, 1);
    assert.strictEqual(a.toString(), '34359738368');
    assert.strictEqual(a.testn(35), 1);
    assert.strictEqual(a.testn(34), 0);
    a.setn(35, 0);
    assert.strictEqual(a.testn(35), 0);
    assert.strictEqual(a.toString(), '0');
  });

  it('should mask bits', function() {
    var a = Uint64.fromString('ffffffffffffffff', 16);
    a.imaskn(35);
    assert.strictEqual(a.toString(), '34359738367');

    a = Uint64.fromString('ffffffffffffffff', 16);
    assert.strictEqual(a.maskn(35).toString(), '34359738367');
    assert.strictEqual(a.toString(), '18446744073709551615');
  });

  it('should and lo bits', function() {
    assert.strictEqual(Uint64(1).andln(0xffff), 1);
  });

  it('should do small NOT (unsigned)', function() {
    var a = Uint64.fromNumber(12412, false);
    a.inot();
    assert.strictEqual(a.toString(), '18446744073709539203');

    a = Uint64.fromNumber(12412, false);
    assert.strictEqual(a.not().toString(), '18446744073709539203');
    assert.strictEqual(a.toString(), '12412');
  });

  it('should do big NOT (unsigned)', function() {
    var a = Uint64.fromString('ffffffffffffffff', 16);
    a.inot();
    assert.strictEqual(a.toString(), '0');

    a = Uint64.fromString('ffffffffffffffff', 16);
    assert.strictEqual(a.not().toString(), '0');
    assert.strictEqual(a.toString(), '18446744073709551615');
  });

  it('should do small NEGATE (unsigned)', function() {
    var a = Uint64.fromNumber(12412);
    a.ineg();
    assert.strictEqual(a.toString(), '18446744073709539204');

    a = Uint64.fromNumber(12412);
    assert.strictEqual(a.neg().toString(), '18446744073709539204');
    assert.strictEqual(a.toString(), '12412');
  });

  it('should do big NEGATE (unsigned)', function() {
    var a = Uint64.fromString('ffffffffffffffff', 16);
    a.ineg();
    assert.strictEqual(a.toString(), '1');

    a = Uint64.fromString('ffffffffffffffff', 16);
    assert.strictEqual(a.neg().toString(), '1');
    assert.strictEqual(a.toString(), '18446744073709551615');
  });

  it('should get absolute value', function() {
    assert.strictEqual(Uint64(1).abs().toString(), '1');
    assert.strictEqual(Uint64(1).iabs().toString(), '1');
  });

  it('should test safety', function() {
    assert.strictEqual(MAX_SAFE.toString(), '9007199254740991');
    assert.strictEqual(MAX_SAFE_MAX.toString(), '9007199254740991');
    assert.strictEqual(MAX_SAFE.toNumber(), 9007199254740991);
    assert.strictEqual(MAX_SAFE_MAX.toNumber(), 9007199254740991);

    assert.strictEqual(ONE.isSafe(), true);
    assert.strictEqual(UONE.isSafe(), true);
    assert.strictEqual(bits.INT32_MIN.isSafe(), true);
    assert.strictEqual(bits.INT32_MAX.isSafe(), true);
    assert.strictEqual(bits.UINT32_MIN.isSafe(), true);
    assert.strictEqual(bits.UINT32_MAX.isSafe(), true);
    assert.strictEqual(MAX_SAFE.isSafe(), true);
    assert.strictEqual(MAX_SAFE_MAX.isSafe(), true);
    assert.strictEqual(MAX_SAFE.clone().addn(1).isSafe(), false);
    assert.strictEqual(MAX_SAFE_MAX.clone().addn(1).isSafe(), false);
  });
});
