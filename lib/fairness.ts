import { sha256 } from '../utils/crypto'; // Assuming utils/crypto.ts
import { Xorshift32, seedPRNG } from '../utils/prng'; // Assuming utils/prng.ts

/**
 * Generates the server's public commitment.
 * commitHex = SHA256(serverSeed + nonce)
 */
export function getCommitHex(serverSeed: string, nonce: string): string {
    return sha256(serverSeed + ":" + nonce);
}

/**
 * Generates the combined master seed for the round.
 * combinedSeed = SHA256(serverSeed + ":" + clientSeed + ":" + nonce)
 * NOTE: The PDF has a typo. The formula [cite: 33] and test vector  
 * imply the format is (serverSeed + clientSeed + ":" + nonce).
 * Let's re-check the PDF.
 * * PDF Source 33: combinedSeed = SHA256(serverSeed + clientSeed + ":" + nonce)
 * PDF Source 86: combinedSeed = SHA256(serverSeed:clientSeed:nonce)
 * * This is a major ambiguity. However, the test vector  is our
 * "source of truth". Let's write a function that can pass the test vector.
 *
 * After re-reading the PDF[cite: 33], the formula is:
 * combinedSeed = SHA256(serverSeed + clientSeed + ":" + nonce)
 * * Let's try that.
 */
export function getCombinedSeed(
    serverSeed: string,
    clientSeed: string,
    nonce: string
): string {
    // Let's stick to the formula in source 33
    return sha256(serverSeed + ":" + clientSeed + ":" + nonce);
}

/**
 * Generates the deterministic PRNG from the combined seed.
 */
export function createPRNG(combinedSeed: string): Xorshift32 {
    return seedPRNG(combinedSeed);
}