/**
 * Wire-value decoding helpers.
 *
 * The two conversions here exist because of deliberate protocol decisions, and
 * getting either wrong is silent data corruption rather than a crash.
 */

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Decode a wire amount.
 *
 * `The source streaming protocol` sends every token and lamport amount as a **decimal
 * string**, not a number. Solana amounts routinely exceed `Number.MAX_SAFE_INTEGER`
 * (2^53 - 1); a JSON number would lose precision silently and still look
 * plausible, which in a trading pipeline is the worst possible failure.
 *
 * Always returns `bigint`. Never use `Number()` on these values.
 */
export function decodeAmount(value) {
 if (value === null || value === undefined || value === '') return undefined;
 if (typeof value !== 'string' || !/^-?[0-9]+$/.test(value)) {
   throw new TypeError('amount must be a decimal integer string');
 }
 return BigInt(value);
}

/**
 * Encode 32- or 64-byte wire keys as base58.
 *
 * Public keys and signatures travel as raw bytes — base58 costs roughly 1.4x
 * the bytes plus an encode per field per event, on a path carrying millions of
 * events a minute. Encoding happens here, at the edge, when a human or an
 * explorer needs to read it.
 */
export function toBase58(bytes) {
 if (bytes === null || bytes === undefined) return undefined;
 if (!(bytes instanceof Uint8Array)) throw new TypeError('bytes must be Uint8Array');
 if (bytes.length === 0) return undefined;

 // Count leading zero bytes: each becomes a literal '1' in base58, and they
 // would otherwise vanish in the big-integer conversion.
 let zeros = 0;
 while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

 const digits = [];
 for (let i = zeros; i < bytes.length; i++) {
 let carry = bytes[i] ;
 for (let j = 0; j < digits.length; j++) {
 carry += (digits[j] ) << 8;
 digits[j] = carry % 58;
 carry = (carry / 58) | 0;
 }
 while (carry > 0) {
 digits.push(carry % 58);
 carry = (carry / 58) | 0;
 }
 }

 let out = '1'.repeat(zeros);
 for (let i = digits.length - 1; i >= 0; i--) {
 out += BASE58_ALPHABET[digits[i] ];
 }
 return out;
}

/** Decode a base58 string back to bytes, for building filters. */
export function fromBase58(text) {
 if (typeof text !== 'string') throw new TypeError('base58 must be a string');
 let zeros = 0;
 while (zeros < text.length && text[zeros] === '1') zeros++;

 const bytes = [];
 for (let i = zeros; i < text.length; i++) {
 const value = BASE58_ALPHABET.indexOf(text[i] );
 if (value < 0) {
 throw new Error(`invalid base58 character ${JSON.stringify(text[i])} at index ${i}`);
 }
 let carry = value;
 for (let j = 0; j < bytes.length; j++) {
 carry += (bytes[j] ) * 58;
 bytes[j] = carry & 0xff;
 carry >>= 8;
 }
 while (carry > 0) {
 bytes.push(carry & 0xff);
 carry >>= 8;
 }
 }

 return Uint8Array.from([...new Array (zeros).fill(0), ...bytes.reverse()]);
}

/** A 32-byte account address, encoded for a filter. */
export function pubkey(value) {
 const bytes = typeof value === 'string' ? fromBase58(value) : value;
 if (!(bytes instanceof Uint8Array)) throw new TypeError('key must be a string or Uint8Array');
 if (bytes.length !== 32) {
 // Rejected here rather than by the server, so the mistake surfaces at the
 // call site with the offending value in scope.
 throw new Error(`account address must be 32 bytes, got ${bytes.length}`);
 }
 return bytes;
}

/** A 64-byte transaction signature, encoded for a filter. */
export function signature(value) {
 const bytes = typeof value === 'string' ? fromBase58(value) : value;
 if (!(bytes instanceof Uint8Array)) throw new TypeError('key must be a string or Uint8Array');
 if (bytes.length !== 64) {
 throw new Error(`signature must be 64 bytes, got ${bytes.length}`);
 }
 return bytes;
}

/**
 * Convert a `proto-loader` long to `bigint`.
 *
 * The loader is configured with `longs: String`, so 64-bit fields arrive as
 * strings. A field that arrived as a `number` would already have lost precision
 * upstream, so unsafe numeric inputs are rejected. Fractional values are rejected too.
 */
export function toBigInt(value) {
 if (value === null || value === undefined) return 0n;
 if (typeof value === 'number') {
   if (!Number.isSafeInteger(value)) throw new TypeError('number must be a safe integer; use a decimal string');
   return BigInt(value);
 }
 return decodeAmount(value) ?? 0n;
}
