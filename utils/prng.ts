import { createHash } from "crypto";

/**
 * Implements a deterministic Xorshift32 pseudo-random number generator.
 * This specific implementation (Marsaglia variant) is used to ensure
 * 100% reproducible results from a given seed, matching the test vectors.
 */
export class Xorshift32 {
    private state: number;

    /**
     * Creates a new PRNG instance.
     * @param seed A 32-bit integer seed. Will be forced to unsigned.
     */
    constructor(seed: number) {
        this.state = (seed >>> 0) || 1;
    }

    /**
     * Advances the internal state and returns the next pseudo-random integer.
     * @returns A 32-bit unsigned integer.
     */
    private nextInt(): number {
        let x = this.state;
        x ^= (x << 13);
        x ^= (x >>> 17);
        x ^= (x << 5);
        this.state = x >>> 0;
        return this.state;
    }

    /**
     * Generates the next pseudo-random number as a float.
     * @returns A float between 0 (inclusive) and 1 (exclusive).
     */
    public rand(): number {
        return this.nextInt() / 0x100000000;
    }
}

/**
 * Creates a new Xorshift32 instance seeded from a SHA-256 hex string.
 * Per the assignment spec, this uses the first 4 bytes (big-endian)
 * of the combined seed.
 *
 * @param combinedSeedHex A SHA-256 hex string (e.g., from `combinedSeedFromParts`).
 * @returns A new, seeded Xorshift32 instance.
 */
export function seedPRNG(combinedSeedHex: string): Xorshift32 {
    if (!combinedSeedHex || combinedSeedHex.length < 8) {
        throw new Error("combinedSeedHex must be a hex string with at least 8 chars");
    }

    const buf = Buffer.from(combinedSeedHex, "hex");
    if (buf.length < 4) {
        throw new Error("combinedSeedHex must contain at least 4 bytes (8 hex chars)");
    }

    const seedInt = buf.readUInt32BE(0);
    return new Xorshift32(seedInt);
}

/**
 * Generates the `combinedSeed` hash from its constituent parts.
 * This is the master seed for all game-related randomness.
 *
 * @param serverSeed The server's secret seed.
 * @param clientSeed The client's provided seed.
 * @param nonce The unique round nonce.
 * @returns A SHA-256 hex string.
 */
export function combinedSeedFromParts(serverSeed: string, clientSeed: string, nonce: string): string {
    const str = `${serverSeed}:${clientSeed}:${nonce}`;
    return createHash("sha256").update(str).digest("hex");
}

/**
 * Generates the `commitHex` (public commitment) from the server's parts.
 *
 * @param serverSeed The server's secret seed.
 * @param nonce The unique round nonce.
 * @returns A SHA-256 hex string.
 */
export function commitHexFromParts(serverSeed: string, nonce: string): string {
    return createHash("sha256").update(`${serverSeed}:${nonce}`).digest("hex");
}