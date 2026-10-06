export function decodeAmount(value: string | null | undefined): bigint | undefined;
export function toBase58(bytes: Uint8Array | null | undefined): string | undefined;
export function fromBase58(text: string): Uint8Array;
export function pubkey(value: string | Uint8Array): Uint8Array;
export function signature(value: string | Uint8Array): Uint8Array;
export function toBigInt(value: string | number | null | undefined): bigint;
