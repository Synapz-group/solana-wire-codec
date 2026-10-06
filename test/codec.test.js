// Codec tests. These run offline and cover the two conversions where a bug is
// silent data corruption rather than a crash.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  decodeAmount,
  toBase58,
  fromBase58,
  pubkey,
  signature,
  toBigInt,
} from '../src/codec.js';

test('amounts beyond Number.MAX_SAFE_INTEGER survive exactly', () => {
  // This is the whole reason the protocol sends decimal strings. Parsing this
  // as a JS number gives 340282366920938500000 — wrong, and still plausible.
  const wire = '340282366920938463463';
  const decoded = decodeAmount(wire);

  assert.equal(decoded, 340282366920938463463n);
  assert.equal(decoded.toString(), wire, 'round-trip must be exact');
  assert.notEqual(
    Number(wire).toString(),
    wire,
    'sanity: a JS number genuinely cannot hold this, which is why we use bigint',
  );
});

test('an absent amount stays undefined rather than becoming zero', () => {
  // A field the chain did not state must not arrive as 0n; that would invent a
  // fact the server deliberately declined to assert.
  assert.equal(decodeAmount(undefined), undefined);
  assert.equal(decodeAmount(null), undefined);
  assert.equal(decodeAmount(''), undefined);
  assert.equal(decodeAmount('0'), 0n, 'an explicit zero is still a stated zero');
});

test('base58 round-trips for known Solana addresses', () => {
  const cases = [
    '11111111111111111111111111111111',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
    'So11111111111111111111111111111111111111112',
  ];
  for (const address of cases) {
    const bytes = fromBase58(address);
    assert.equal(bytes.length, 32, `${address} should decode to 32 bytes`);
    assert.equal(toBase58(bytes), address, `${address} failed to round-trip`);
  }
});

test('the system program decodes to 32 zero bytes', () => {
  // The classic leading-zero bug: a decoder that drops them yields a short
  // array and every downstream comparison silently fails.
  const bytes = fromBase58('11111111111111111111111111111111');
  assert.equal(bytes.length, 32);
  assert.ok(bytes.every((b) => b === 0));
});

test('leading zeros are preserved in both directions', () => {
  const bytes = new Uint8Array(32);
  bytes[31] = 1;
  const encoded = toBase58(bytes);
  assert.equal(fromBase58(encoded).length, 32);
  assert.deepEqual(Array.from(fromBase58(encoded)), Array.from(bytes));
});

test('invalid base58 characters are rejected, not silently skipped', () => {
  // 0, O, I and l are excluded from the alphabet precisely because they are
  // visually ambiguous; accepting them would decode to the wrong key.
  for (const bad of ['0', 'O', 'I', 'l']) {
    assert.throws(() => fromBase58(`abc${bad}def`), /invalid base58/);
  }
});

test('filter helpers reject wrong-length keys at the call site', () => {
  assert.throws(() => pubkey('11111111111111111111111111111'), /32 bytes/);
  assert.throws(() => signature('11111111111111111111111111111111'), /64 bytes/);

  assert.equal(pubkey('11111111111111111111111111111111').length, 32);
  assert.equal(signature(new Uint8Array(64)).length, 64);
});

test('64-bit fields convert without precision loss', () => {
  assert.equal(toBigInt('18446744073709551615'), 18446744073709551615n);
  assert.equal(toBigInt(undefined), 0n);
  assert.equal(toBigInt(null), 0n);
  assert.equal(toBigInt(42), 42n);
});

test('unsafe, fractional and non-finite numbers are rejected', () => {
  for (const value of [Number.MAX_SAFE_INTEGER + 1, 1.5, NaN, Infinity]) {
    assert.throws(() => toBigInt(value), /safe integer/);
  }
});

test('amounts require decimal integer strings', () => {
  for (const value of [' 1 ', '0x10', '1e3', '1.5', 'abc', 12, true]) {
    assert.throws(() => decodeAmount(value), /decimal integer/);
  }
  assert.equal(decodeAmount('-42'), -42n);
});

test('base58 matches independent integer arithmetic across 32/64 byte vectors', () => {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function reference(bytes) {
    let n = BigInt('0x' + Buffer.from(bytes).toString('hex'));
    let out = '';
    while (n > 0n) { out = alphabet[Number(n % 58n)] + out; n /= 58n; }
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
    return '1'.repeat(zeros) + out;
  }
  for (const length of [32, 64]) {
    for (let seed = 0; seed < 128; seed++) {
      const bytes = Uint8Array.from({length}, (_, i) => (seed * 13 + i * 37) & 255);
      bytes.fill(0, 0, seed % length);
      const encoded = toBase58(bytes);
      assert.equal(encoded, reference(bytes));
      assert.deepEqual(fromBase58(encoded), bytes);
    }
  }
});

test('wrong runtime types are rejected', () => {
  assert.throws(() => toBase58([1, 2]), /Uint8Array/);
  assert.throws(() => fromBase58(123), /string/);
  assert.throws(() => pubkey(new Array(32).fill(0)), /Uint8Array/);
  assert.throws(() => signature(null), /Uint8Array/);
});
