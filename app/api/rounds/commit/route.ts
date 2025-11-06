import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { commitHexFromParts } from '@/utils/prng';
import { randomBytes } from 'crypto';

/**
 * Generates a cryptographically secure random string of a given byte length.
 * The output will be a hex string twice the byte length.
 * @param length - The number of bytes to generate.
 * @returns A hex-encoded random string.
 */
function generateRandomString(length: number): string {
    return randomBytes(length).toString('hex');
}

/**
 * API Route: POST /api/rounds/commit
 *
 * This is the first step in the provably-fair game flow.
 * It generates the server-side secrets (`serverSeed`, `nonce`) and
 * creates a public "commitment" (`commitHex`) to them.
 * This commitment is stored in the database and sent to the client,
 * "locking in" the server's seed before the player provides their input.
 */
export async function POST() {
    try {
        /**
         * 1. Generate server-side secrets:
         * - `serverSeed`: A long, secret string that will be the main input.
         * - `nonce`: A unique string to prevent hash collisions for identical server seeds.
         */
        const serverSeed = generateRandomString(32); // 64 hex characters
        const nonce = generateRandomString(8);       // 16 hex characters

        /**
         * 2. Calculate the public commitment hash.
         * This is the server's "promise" to the client, proving it
         * won't change its seed after seeing the client's seed.
         */
        const commitHex = commitHexFromParts(serverSeed, nonce);

        /**
         * 3. Create a new round record in the database.
         * We store the secrets (`serverSeed`, `nonce`) and the public
         * commitment (`commitHex`). The status is set to 'CREATED'.
         */
        const newRound = await prisma.round.create({
            data: {
                status: 'CREATED',
                serverSeed: serverSeed,
                nonce: nonce,
                commitHex: commitHex,

                // Initialize placeholder fields. These will be updated
                // when the user plays the round in the '/start' endpoint.
                clientSeed: '',
                combinedSeed: '',
                pegMapHash: '',
                rows: 12, // As per assignment spec
                dropColumn: 0,
                binIndex: 0,
                payoutMultiplier: 0,
                betCents: 0,
                pathJson: {},
            },
        });

        /**
         * 4. Return the public data to the client.
         * The client needs the `roundId` to play the game and the
         * `commitHex` to display the server's commitment.
         */
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