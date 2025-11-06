import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Use our shared client
import { commitHexFromParts } from '@/utils/prng'; // Your verified function
import { randomBytes } from 'crypto'; // Node.js built-in crypto

// Helper to generate a secure random string
function generateRandomString(length: number): string {
    return randomBytes(length).toString('hex');
}

export async function POST() {
    try {
        // 1. Generate server-side secrets
        const serverSeed = generateRandomString(32); // e.g., 64 hex chars
        const nonce = generateRandomString(8);       // e.g., 16 hex chars

        // 2. Calculate the public commitment
        const commitHex = commitHexFromParts(serverSeed, nonce);

        // 3. Create the round in the database
        const newRound = await prisma.round.create({
            data: {
                status: 'CREATED',
                serverSeed: serverSeed, // Store the secret
                nonce: nonce,
                commitHex: commitHex, // Store the public promise

                // --- Placeholders ---
                // These will be updated when the user plays
                clientSeed: '',
                combinedSeed: '',
                pegMapHash: '',
                rows: 12, // From assignment
                dropColumn: 0,
                binIndex: 0,
                payoutMultiplier: 0,
                betCents: 0,
                pathJson: {},
            },
        });

        // 4. Return the public data to the client
        return NextResponse.json({
            roundId: newRound.id,
            commitHex: newRound.commitHex,
        });

    } catch (error) {
        console.error('Commit Error:', error);
        return NextResponse.json(
            { error: 'Failed to create round.' },
            { status: 500 }
        );
    }
}