import { NextResponse } from 'next/server';
import { combinedSeedFromParts, commitHexFromParts, seedPRNG } from '@/utils/prng';
import { runPlinkoGame } from '@/lib/engine';

/**
 * API Route: GET /api/verify
 *
 * This endpoint allows any user to publicly verify the outcome of a
 * completed game. It accepts the three core seeds (`serverSeed`, `clientSeed`,
 * `nonce`) and the game input (`dropColumn`) as query parameters.
 *
 * It then re-runs the *exact* deterministic game logic on the server
 * to re-compute the results. The client can compare these results
 * (commitHex, binIndex, etc.) to the results from the original game
 * to prove that the outcome was not tampered with.
 *
 * This endpoint does NOT interact with the database.
 */
export async function GET(request: Request) {
    console.log(request);
    const { searchParams } = new URL(request.url);

    /**
     * 1. Extract all required inputs from the URL query parameters.
     */
    const serverSeed = searchParams.get('serverSeed');
    const clientSeed = searchParams.get('clientSeed');
    const nonce = searchParams.get('nonce');
    const dropColumnStr = searchParams.get('dropColumn');

    /**
     * 2. Validate that all required parameters are present.
     */
    if (!serverSeed || !clientSeed || !nonce || !dropColumnStr) {
        return NextResponse.json(
            { error: 'Missing required query parameters.' },
            { status: 400 }
        );
    }

    try {
        /**
         * 3. Sanitize and validate the 'dropColumn' input.
         */
        const dropColumn = parseInt(dropColumnStr, 10);
        if (isNaN(dropColumn)) {
            return NextResponse.json(
                { error: 'Invalid dropColumn.' },
                { status: 400 }
            );
        }

        /**
         * 4. Run the full deterministic re-computation.
         * This block mimics the logic from the '/start' endpoint using
         * the user-provided inputs.
         */

        // 4a. Re-compute the server's public commitment.
        const commitHex = commitHexFromParts(serverSeed, nonce);

        // 4b. Re-compute the master game seed.
        const combinedSeed = combinedSeedFromParts(serverSeed, clientSeed, nonce);

        // 4c. Create the deterministic PRNG from the master seed.
        const prng = seedPRNG(combinedSeed);

        // 4d. Run the game engine to get the final path, hash, and bin.
        const { pegMapHash, binIndex, path } = runPlinkoGame(prng, dropColumn);

        /**
         * 5. Return all computed values for verification.
         * The client-side verifier page will display these results.
         */
        return NextResponse.json({
            commitHex,
            combinedSeed,
            pegMapHash,
            binIndex,
            path, // Include the path for a visual replay
        });

    } catch (error) {
        console.error('Verify Error:', error);
        return NextResponse.json(
            { error: 'Failed to re-compute results.' },
            { status: 500 }
        );
    }
}