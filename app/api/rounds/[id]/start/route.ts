import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { combinedSeedFromParts, seedPRNG } from '@/utils/prng';
import { runPlinkoGame } from '@/lib/engine';

// (Requirement D) A simple, symmetric payout table for bins 0-12
// Edges pay more, center pays less.
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

// Define the expected request body
interface StartRequest {
    clientSeed: string;
    betCents: number;
    dropColumn: number;
}

export async function POST(
    request: Request,
    context: { params: { id: string } }
) {
    const { id } = await context.params;
    const roundId = id;


    try {
        const { clientSeed, betCents, dropColumn }: StartRequest = await request.json();

        // 1. Find the round that was created in the 'commit' step
        const round = await prisma.round.findUnique({
            where: { id: roundId },
        });

        if (!round) {
            return NextResponse.json({ error: 'Round not found.' }, { status: 404 });
        }

        if (round.status !== 'CREATED') {
            return NextResponse.json(
                { error: 'Round already started or finished.' },
                { status: 400 }
            );
        }

        // The serverSeed was stored during commit, but must not be null
        if (!round.serverSeed) {
            return NextResponse.json(
                { error: 'Server seed missing from round.' },
                { status: 500 }
            );
        }

        // --- Run the Verified Game Logic ---

        // 2. Generate the combinedSeed
        const combinedSeed = combinedSeedFromParts(
            round.serverSeed,
            clientSeed,
            round.nonce
        );

        // 3. Create the PRNG
        const prng = seedPRNG(combinedSeed);

        // 4. Run the deterministic engine!
        const { pegMapHash, binIndex, path } = runPlinkoGame(prng, dropColumn);
        // --- MODIFY THIS ---
        // Look up the payout from the map using the final binIndex
        const payoutMultiplier = PAYOUT_MAP[binIndex] || 0; // Default to 0 if out of bounds
        // --- END MODIFY ---

        // 5. Update the round in the database with the results
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

        // 6. Return the non-secret results to the frontend
        // DO NOT return the serverSeed.
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