import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
    request: Request,
    context: { params: { id: string } }
) {
    const { id } = await context.params;
    const roundId = id;

    try {
        // 1. Find the round
        const round = await prisma.round.findUnique({
            where: { id: roundId },
            // Select only the fields we need
            select: {
                status: true,
                serverSeed: true,
            },
        });

        if (!round) {
            return NextResponse.json({ error: 'Round not found.' }, { status: 404 });
        }

        // 2. Check if the game has been played (status 'STARTED')
        if (round.status !== 'STARTED') {
            // If it's 'CREATED', it hasn't been played.
            // If it's 'REVEALED', it's already done.
            return NextResponse.json(
                { error: 'Round is not in a state to be revealed.' },
                { status: 400 }
            );
        }

        // 3. Update the status to 'REVEALED'
        await prisma.round.update({
            where: { id: roundId },
            data: {
                status: 'REVEALED',
                revealedAt: new Date(), // Log when it was revealed
            },
        });

        // 4. Return the serverSeed
        // This is the key part for the verifier page
        return NextResponse.json({
            serverSeed: round.serverSeed,
        });

    } catch (error) {
        console.error('Reveal Error:', error);
        return NextResponse.json(
            { error: 'Failed to reveal round.' },
            { status: 500 }
        );
    }
}