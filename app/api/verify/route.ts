import { NextResponse } from 'next/server';
import { combinedSeedFromParts, commitHexFromParts, seedPRNG } from '@/utils/prng';
import { runPlinkoGame } from '@/lib/engine';

export async function GET(request: Request) {
    console.log(request);
    const { searchParams } = new URL(request.url);

    // 1. Get all inputs from the query parameters 
    const serverSeed = searchParams.get('serverSeed');
    const clientSeed = searchParams.get('clientSeed');
    const nonce = searchParams.get('nonce');
    const dropColumnStr = searchParams.get('dropColumn');

    if (!serverSeed || !clientSeed || !nonce || !dropColumnStr) {
        return NextResponse.json(
            { error: 'Missing required query parameters.' },
            { status: 400 }
        );
    }

    try {
        const dropColumn = parseInt(dropColumnStr, 10);
        if (isNaN(dropColumn)) {
            return NextResponse.json(
                { error: 'Invalid dropColumn.' },
                { status: 400 }
            );
        }

        // --- Deterministic Re-computation ---
        // This re-runs the *exact* same logic from your tests and 'start' endpoint.

        // 2. Re-compute commitHex
        const commitHex = commitHexFromParts(serverSeed, nonce);

        // 3. Re-compute combinedSeed
        const combinedSeed = combinedSeedFromParts(serverSeed, clientSeed, nonce);

        // 4. Create the PRNG
        const prng = seedPRNG(combinedSeed);

        // 5. Run the deterministic engine
        const { pegMapHash, binIndex, path } = runPlinkoGame(prng, dropColumn);

        // 6. Return all computed values for verification 
        return NextResponse.json({
            commitHex,
            combinedSeed,
            pegMapHash,
            binIndex,
            path, // Also return the path for a visual replay
        });

    } catch (error) {
        console.error('Verify Error:', error);
        return NextResponse.json(
            { error: 'Failed to re-compute results.' },
            { status: 500 }
        );
    }
}