import { decodeAmount, pubkey, toBase58 } from '../src/codec.js';

const address = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const bytes = pubkey(address);
const amount = decodeAmount('18446744073709551615');
console.log(JSON.stringify({ address: toBase58(bytes), keyBytes: bytes.length, amount: amount.toString() }, null, 2));
