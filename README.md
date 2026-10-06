# SYNAPZ Solana Wire Codec

Dependency-free JavaScript utilities with TypeScript declarations for Solana
address/signature encoding and exact integer decoding. Developed by Dathan
Eldridge as part of the bootstrapped SYNAPZ Geyser project.

## Run

Requires Node.js 20 or newer. No installation, API key, validator, wallet,
RPC endpoint or network access is required.

```sh
npm test
npm run example
```

```js
import { pubkey, toBase58, decodeAmount } from './src/codec.js';

const key = pubkey('11111111111111111111111111111111');
console.log(key.length); // 32
console.log(toBase58(key)); // original address, including leading zeros
console.log(decodeAmount('18446744073709551615')); // exact bigint
```

## API

| Function | Behavior |
| --- | --- |
| `fromBase58(text)` | Decode bytes; reject invalid characters. Empty string gives empty bytes. |
| `toBase58(bytes)` | Encode bytes while preserving leading zeros; absent/empty input gives undefined. |
| `pubkey(value)` | Accept base58 or Uint8Array; require exactly 32 bytes. |
| `signature(value)` | Accept base58 or Uint8Array; require exactly 64 bytes. |
| `decodeAmount(value)` | Decode a signed decimal integer string to bigint; absent/empty input stays undefined. |
| `toBigInt(value)` | Convert safe integer numbers or decimal strings; absent input defaults to 0n. |

`decodeAmount` preserves missing values. `toBigInt` intentionally defaults
missing values to zero; choose the function appropriate to your data model.
Neither function validates token-specific ranges or decimal scaling.
Key/signature length checks do not establish ownership or cryptographic validity.
Serialize bigint values as decimal strings when producing JSON.

## Origin and scope

Extracted from first-party SYNAPZ Geyser TypeScript codec code. The public
extraction adds strict decimal validation and rejects unsafe/fractional numbers.
It contains no streaming server, private protocol schema, trading logic,
credentials or private infrastructure configuration. It is a codec utility,
not a complete Geyser plugin or a claim of validator compatibility.

This extracted package is licensed under MIT. The private parent project
retains its existing licence. No third-party runtime code or dependencies
are included. Contributions with tests are welcome.
