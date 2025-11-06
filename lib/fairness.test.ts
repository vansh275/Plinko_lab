import { getCommitHex, getCombinedSeed, createPRNG } from './fairness';
import { Xorshift32, seedPRNG, combinedSeedFromParts } from '../utils/prng';
import { runPlinkoGame } from './engine';

// Test Vectors from the PDF [cite: 110-119]
const TEST_VECTORS = {
    rows: 12,
    serverSeed: "b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc",
    nonce: "42",
    clientSeed: "candidate-hello",

    // Derived values we must match
    commitHex: "bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34",
    combinedSeed: "e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0",
    prngResults: [
        0.1106166649,
        0.7625129214,
        0.0439292176,
        0.4578678815,
        0.3438999297
    ]
};

describe('Provably-Fair Core Logic', () => {

    // Test 1: Verify the commitHex generation 
    it('should generate the correct commitHex', () => {
        const { serverSeed, nonce, commitHex } = TEST_VECTORS;
        const generatedCommit = getCommitHex(serverSeed, nonce);
        expect(generatedCommit).toBe(commitHex);
    });

    // Test 2: Verify the combinedSeed generation 
    it('should generate the correct combinedSeed', () => {
        const { serverSeed, clientSeed, nonce, combinedSeed } = TEST_VECTORS;

        // We test the formula from Source 33
        const generatedSeed = getCombinedSeed(serverSeed, clientSeed, nonce);

        // If this fails, we try the formula from Source 86 (with colons)
        expect(generatedSeed).toBe(combinedSeed);
    });

    // Test 3: Verify the PRNG stream [cite: 118, 119]
    it('should generate the correct PRNG sequence', () => {
        const { combinedSeed, prngResults } = TEST_VECTORS;

        // Seed the PRNG using the first 4 bytes of the combinedSeed
        const prng = createPRNG(combinedSeed);

        // Generate 5 numbers and check them
        const results: number[] = [];
        for (let i = 0; i < 5; i++) {
            // We must round to the same precision as the test vector (10 decimal places)
            const num = prng.rand();
            results.push(parseFloat(num.toFixed(10)));
        }

        expect(results).toEqual(prngResults);
    });
    it('should reproduce the correct path outcome', () => {
        const { serverSeed, clientSeed, nonce, combinedSeed } = TEST_VECTORS;

        // 1. Get the combined seed (using your new working function)
        const testCombinedSeed = combinedSeedFromParts(serverSeed, clientSeed, nonce);
        expect(testCombinedSeed).toBe(combinedSeed); // Double-check

        // 2. Create the PRNG
        const prng = seedPRNG(testCombinedSeed);

        // 3. Run the game engine [cite: 126]
        const dropColumn = 6; // Center drop
        const { binIndex, pegMap } = runPlinkoGame(prng, dropColumn);

        // 4. Check the peg map (first rows from PDF) [cite: 120-123]
        expect(pegMap[0][0].leftBias).toBe(0.422123);
        expect(pegMap[1][0].leftBias).toBe(0.552503);
        expect(pegMap[1][1].leftBias).toBe(0.408786);
        expect(pegMap[2][0].leftBias).toBe(0.491574);

        // 5. Check the final bin index [cite: 126]
        expect(binIndex).toBe(6);
    });
});