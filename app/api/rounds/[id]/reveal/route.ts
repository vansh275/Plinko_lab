import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * API Route: POST /api/rounds/[id]/reveal
 *
 * Handles the final step of the provably-fair game flow.
 * This endpoint takes a round ID, validates its state,
 * and then "reveals" the secret `serverSeed` to the client
 * so that the round's outcome can be independently verified.
 */
export async function POST(
    request: Request,
    context: { params: { id: string } }
) {
    const { id } = await context.params;
    const roundId = id;

    try {
        /**
         * 1. Fetch the specified round from the database.
         * We only select the 'status' and 'serverSeed' for security,
         * performance, and to validate the round's state.
         */
        const round = await prisma.round.findUnique({
            where: { id: roundId },
            select: {
                status: true,
                serverSeed: true,
                nonce: true,
            },
        });

        /**
         * 2. Handle cases where the round doesn't exist.
         */
        if (!round) {
            return NextResponse.json({ error: 'Round not found.' }, { status: 404 });
        }

        /**
         * 3. Validate the round's status.
         * A round can only be revealed if it has been 'STARTED' (played)
         * but not yet 'REVEALED'. If it's 'CREATED' or already 'REVEALED',
         * we return an error.
         */
        if (round.status !== 'STARTED') {
            return NextResponse.json(
                { error: 'Round is not in a state to be revealed.' },
                { status: 400 } // 400 Bad Request
            );
        }

        /**
         * 4. Update the round's status to 'REVEALED'.
         * This logs the reveal time and prevents the round from being
         * revealed or played again.
         */
        await prisma.round.update({
            where: { id: roundId },
            data: {
                status: 'REVEALED',
                revealedAt: new Date(),
            },
        });

        /**
         * 5. Return the secret serverSeed.
         * The client can now use this (along with their clientSeed and
         * the nonce) to verify the game's outcome on the /verify page.
         */
        return NextResponse.json({
            serverSeed: round.serverSeed,
            nonce: round.nonce,
        });

    } catch (error) {
        console.error('Reveal Error:', error);
        return NextResponse.json(
            { error: 'Failed to reveal round.' },
            { status: 500 }
        );
    }
}