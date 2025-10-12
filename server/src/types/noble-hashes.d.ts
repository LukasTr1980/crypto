type HashFn = (input: Uint8Array) => Uint8Array;

declare module '@noble/hashes/sha2.js' {
    export const sha256: HashFn;
    export const sha512: HashFn;
}

declare module '@noble/hashes/hmac.js' {
    export function hmac(hash: HashFn, key: Uint8Array, message: Uint8Array): Uint8Array;
}
