let nonceCounter = BigInt(Date.now()) * 1000n;

export function nextNonce(): string {
    nonceCounter += 1n;
    return nonceCounter.toString();
}