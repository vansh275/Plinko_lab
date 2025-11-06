import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { combinedSeedFromParts, seedPRNG } from '@/utils/prng';
import { runPlinkoGame } from '@/lib/engine';

/**
 * A fixed, symmetric payout map for the 13 possible bins (0-12).
 * The edges (0 and 12) have the highest multipliers, while the center (6)
 * has the lowest, as per the assignment's suggestion.
 */
const PAYOUT_MAP = [
    10,  // Bin 0
    5,   // Bin 1
    2,   // Bin 2
    1.5, // Bin 3
    1,   // Bin 4
    0.5, // Bin 5
    0.2, // Bin 6 (Center)
    0.5, // Bin 7
    1,   // Bin 8
    1.5, // Bin 9
    2,   // Bin 10
    5,   // Bin 11
    10,  // Bin 12
];

/**
 * Defines the expected shape of the JSON body for a "start game" request.
 */
interface StartRequest {
    clientSeed: string;
    betCents: number;
    dropColumn: number;
}

/**
 * API Route: POST /api/rounds/[id]/start
 *
 * This is the main game-play endpoint. It takes a `roundId` (from the 'commit'
 * step) and the user's inputs (`clientSeed`, `betCents`, `dropColumn`).
 * It then runs the deterministic game engine, calculates the result,
 * and saves it to the database.
 *
 * @returns A JSON object with the public game results (binIndex, path, etc.).
 * Crucially, it **does not** return the `serverSeed`.
 */
export async function POST(
    request: Request,
    context: { params: { id: string } }
) {
    const { id } = await context.params;
    const roundId = id;

    try {
        const { clientSeed, betCents, dropColumn }: StartRequest = await request.json();

        /**
         * 1. Fetch the round created during the 'commit' step.
         */
        const round = await prisma.round.findUnique({
            where: { id: roundId },
        });

        /**
         * 2. Validate the round.
         */
        if (!round) {
            return NextResponse.json({ error: 'Round not found.' }, { status: 404 });
        }

        /**
         * 3. Ensure the round hasn't been played.
         * The status must be 'CREATED'. If it's 'STARTED' or 'REVEALED',
         * the game cannot be played.
         */
        if (round.status !== 'CREATED') {
            return NextResponse.json(
                { error: 'Round already started or finished.' },
                { status: 400 }
            );
        }

        /**
         * 4. Sanity check for the server seed.
         */
        if (!round.serverSeed) {
            return NextResponse.json(
                { error: 'Server seed missing from round.' },
                { status: 500 }
            );
        }

        /**
         * 5. Run the Provably-Fair Deterministic Engine
         */

        // 5a. Generate the master seed from all three parts.
        const combinedSeed = combinedSeedFromParts(
            round.serverSeed,
            clientSeed,
            round.nonce
        );

        // 5b. Create the deterministic PRNG from the master seed.
        const prng = seedPRNG(combinedSeed);

        // 5c. Run the game engine to get the final path and bin.
        const { pegMapHash, binIndex, path } = runPlinkoGame(prng, dropColumn);

        // 5d. Look up the payout from our fixed map.
        const payoutMultiplier = PAYOUT_MAP[binIndex] || 0;

        /**
         * 6. Update the round in the database with the results.
         * The status is moved to 'STARTED', and all game data is recorded.
         */
        const updatedRound = await prisma.round.update({
            where: { id: roundId },
            data: {
                status: 'STARTED',
                clientSeed: clientSeed,
                betCents: betCents,
                dropColumn: dropColumn,
                combinedSeed: combinedSeed,
                pegMapHash: pegMapHash,
                binIndex: binIndex,
                pathJson: path as any, // Store the path for replay
                payoutMultiplier: payoutMultiplier,
            },
        });

        /**
         * 7. Return the public, non-secret results to the frontend.
         * This data is used to render the animation and show the result.
         */
        return NextResponse.json({
            roundId: updatedRound.id,
            pegMapHash: updatedRound.pegMapHash,
            rows: updatedRound.rows,
            binIndex: updatedRound.binIndex,
            path: updatedRound.pathJson,
            payoutMultiplier: updatedRound.payoutMultiplier,
        });

    } catch (error) {
        console.error('Start Error:', error);
        return NextResponse.json(
            { error: 'Failed to start round.' },
            { status: 500 }
        );
    }
}