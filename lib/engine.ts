import { sha256 } from '../utils/crypto';
import { Xorshift32 } from '../utils/prng';

/**
 * Defines the structure for a single peg, containing its leftward bias.
 */
export type Peg = { leftBias: number };
/**
 * Defines the structure for the entire game board (an array of peg rows).
 */
export type PegMap = Peg[][];
/**
 * Defines the possible directional decision for the ball at a peg.
 */
export type PathDecision = 'L' | 'R';

/**
 * The fixed number of rows for the Plinko game, as specified by the assignment.
 */
const GAME_ROWS = 12;

/**
 * Generates the entire peg map (board) deterministically from the PRNG stream.
 * The peg layout is a critical component of the verifiable outcome.
 *
 * @param prng - The deterministic Xorshift32 instance.
 * @returns The fully generated PegMap structure.
 */
function createPegMap(prng: Xorshift32): PegMap {
    const pegMap: PegMap = [];

    for (let r = 0; r < GAME_ROWS; r++) {
        const row: Peg[] = [];
        const pegsInRow = r + 1;

        for (let p = 0; p < pegsInRow; p++) {
            // Draw a number from the PRNG stream to establish the base bias.
            const rand = prng.rand();
            // Apply the assignment's defined formula: 0.5 +/- 0.1 based on PRNG output.
            let leftBias = 0.5 + (rand - 0.5) * 0.2;

            // Rounding to 6 decimal places ensures the pegMapHash is stable and reproducible across environments.
            leftBias = parseFloat(leftBias.toFixed(6));

            row.push({ leftBias });
        }
        pegMap.push(row);
    }
    return pegMap;
}

/**
 * Calculates the final bin index and the sequence of movements by simulating the ball's path.
 *
 * @param prng - The continuing deterministic Xorshift32 instance.
 * @param pegMap - The pre-calculated peg map for the current round.
 * @param dropColumn - The player's initial choice of drop column (0-12).
 * @returns An object containing the final bin index and the deterministic path taken.
 */
function calculatePath(
    prng: Xorshift32,
    pegMap: PegMap,
    dropColumn: number
): { binIndex: number, path: PathDecision[] } {

    // 'pos' tracks the number of RIGHT moves made, which equals the final bin index (0-12).
    let pos = 0;
    const path: PathDecision[] = [];

    // 1. Calculate the player's drop column influence on the bias.
    const R = GAME_ROWS;
    const leftBiasAdj = (dropColumn - Math.floor(R / 2)) * 0.01;

    // Iterate through all 12 rows to determine the path.
    for (let r = 0; r < GAME_ROWS; r++) {
        // 2. Determine which specific peg is hit in the current row.
        // The peg index is determined by the number of right movements ('pos') made so far.
        const pegIndex = Math.min(pos, r);
        const peg = pegMap[r][pegIndex];

        // 3. Calculate the final, effective bias by combining the peg's base bias
        // with the player's drop column adjustment.
        const bias = peg.leftBias + leftBiasAdj;

        // 4. Clamp the final bias value to the valid range [0, 1].
        const finalBias = Math.max(0, Math.min(1, bias));

        // 5. Draw the next random number from the PRNG stream for the decision.
        const rnd = prng.rand();

        // 6. Make the deterministic Left/Right decision.
        if (rnd < finalBias) {
            // If random number is less than bias, move LEFT (position counter is unchanged).
            path.push('L');
        } else {
            // If random number is greater than or equal to bias, move RIGHT (position counter increases).
            path.push('R');
            pos += 1;
        }
    }

    // The final bin index is equal to the total number of Right movements made.
    return { binIndex: pos, path };
}

/**
 * Executes the complete deterministic Plinko simulation for a single round.
 * The order of operations is critical: peg map generation first, followed by path calculation,
 * both using the same continuous PRNG stream.
 *
 * @param prng - A newly seeded Xorshift32 instance.
 * @param dropColumn - The player's initial drop column choice.
 * @returns A comprehensive object containing all deterministic outputs for the round.
 */
export function runPlinkoGame(
    prng: Xorshift32,
    dropColumn: number
): {
    pegMap: PegMap;
    pegMapHash: string;
    binIndex: number;
    path: PathDecision[];
} {
    // 1. Generate the peg map using the start of the PRNG stream.
    const pegMap = createPegMap(prng);

    // 2. Calculate the pegMapHash for verifiable integrity.
    const pegMapHash = sha256(JSON.stringify(pegMap));

    // 3. Calculate the ball's path and final bin using the *continuing* PRNG stream.
    const { binIndex, path } = calculatePath(prng, pegMap, dropColumn);

    return { pegMap, pegMapHash, binIndex, path };
}