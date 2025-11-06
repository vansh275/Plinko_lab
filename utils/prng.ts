// lib/prng.ts
import { createHash } from "crypto";

/**
 * Xorshift32 - canonical Marsaglia variant
 * - state is always an unsigned 32-bit integer
 * - shifts: 13, 17 (unsigned right), 5
 */
export class Xorshift32 {
    private state: number;

    constructor(seed: number) {
        // Force unsigned 32-bit, non-zero
        this.state = (seed >>> 0) || 1;
    }

    /** Advances state and returns the new unsigned 32-bit state */
    private nextInt(): number {
        let x = this.state;
        x ^= (x << 13);
        x ^= (x >>> 17);
        x ^= (x << 5);
        // ensure unsigned 32-bit
        this.state = x >>> 0;
        return this.state;
    }

    /** Returns float in [0, 1) */
    public rand(): number {
        // divide by 2^32
        return this.nextInt() / 0x100000000;
    }
}

/**
 * Seed the PRNG from a combinedSeed hex string.
 * Per test vector: take the FIRST 4 bytes (8 hex chars) in BIG-ENDIAN order.
 * combinedSeed is expected to be a hex string (eg. sha256 hex).
 */
export function seedPRNG(combinedSeedHex: string): Xorshift32 {
    if (!combinedSeedHex || combinedSeedHex.length < 8) {
        throw new Error("combinedSeedHex must be a hex string with at least 8 chars");
    }

    // Buffer.from(..., 'hex') will throw if the string is invalid hex
    const buf = Buffer.from(combinedSeedHex, "hex");
    if (buf.length < 4) {
        throw new Error("combinedSeedHex must contain at least 4 bytes (8 hex chars)");
    }

    // BIG-ENDIAN read of the first 4 bytes (per assignment test vector)
    const seedInt = buf.readUInt32BE(0);
    return new Xorshift32(seedInt);
}

/** Helper: combine serverSeed, clientSeed, nonce exactly like spec */
export function combinedSeedFromParts(serverSeed: string, clientSeed: string, nonce: string): string {
    const str = `${serverSeed}:${clientSeed}:${nonce}`;
    return createHash("sha256").update(str).digest("hex");
}

/** Helper: commitHex = SHA256(serverSeed + ":" + nonce) */
export function commitHexFromParts(serverSeed: string, nonce: string): string {
    return createHash("sha256").update(`${serverSeed}:${nonce}`).digest("hex");
}
