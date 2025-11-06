import { sha256 } from '../utils/crypto'; // Or your preferred sha256 function
import { Xorshift32 } from '../utils/prng'; // Import your working Xorshift32

// Define the types for clarity
export type Peg = { leftBias: number };
export type PegMap = Peg[][];
export type PathDecision = 'L' | 'R';

// The fixed number of rows for this game
const GAME_ROWS = 12;

/**
 * Generates the entire peg map (board) deterministically from the PRNG.
 */
function createPegMap(prng: Xorshift32): PegMap {
    const pegMap: PegMap = [];

    for (let r = 0; r < GAME_ROWS; r++) {
        const row: Peg[] = [];
        const pegsInRow = r + 1; // Row 0 has 1 peg, Row 1 has 2, etc.

        for (let p = 0; p < pegsInRow; p++) {
            // Use the formula from the PDF [cite: 41]
            // leftBias = 0.5 + (rand() - 0.5) * 0.2
            const rand = prng.rand();
            let leftBias = 0.5 + (rand - 0.5) * 0.2;

            // Round to 6 decimals for stable hashing [cite: 41]
            leftBias = parseFloat(leftBias.toFixed(6));

            row.push({ leftBias });
        }
        pegMap.push(row);
    }
    return pegMap;
}

/**
 * Calculates the final bin index by simulating the ball's path.
 */
function calculatePath(
    prng: Xorshift32,
    pegMap: PegMap,
    dropColumn: number
): { binIndex: number, path: PathDecision[] } {

    // --- FIX: 'pos' is the count of RIGHT moves, must start at 0 ---
    let pos = 0;
    const path: PathDecision[] = [];

    // 1. Calculate the drop column bias adjustment 
    const R = GAME_ROWS; // R = 12
    const leftBiasAdj = (dropColumn - Math.floor(R / 2)) * 0.01;

    for (let r = 0; r < GAME_ROWS; r++) { // 12 rows (0-11)

        // 2. Find the peg the ball will hit on this row [cite: 45]
        // (the peg under the current path)
        const pegIndex = Math.min(pos, r);
        const peg = pegMap[r][pegIndex];

        // 3. Calculate the final bias
        const bias = peg.leftBias + leftBiasAdj;

        // 4. Clamp the bias to [0, 1] 
        const finalBias = Math.max(0, Math.min(1, bias));

        // 5. Draw a new random number for the decision [cite: 47]
        const rnd = prng.rand();

        // 6. Make the decision [cite: 45]
        if (rnd < finalBias) {
            // Go LEFT: pos (num of Right moves) does not change
            path.push('L');
        } else {
            // Go RIGHT: pos (num of Right moves) increases by 1
            path.push('R');
            pos += 1;
        }
    }

    // 7. Final binIndex is the final position (total # of Right moves) 
    return { binIndex: pos, path };
}

/**
 * Main engine function: runs the full deterministic simulation.
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
    // IMPORTANT: The PRNG stream order MUST be correct [cite: 47]

    // 1. First, generate the peg map
    const pegMap = createPegMap(prng);

    // 2. Then, calculate the pegMapHash [cite: 42]
    const pegMapHash = sha256(JSON.stringify(pegMap));

    // 3. Second, use the *continuing* PRNG stream for row decisions
    const { binIndex, path } = calculatePath(prng, pegMap, dropColumn);

    return { pegMap, pegMapHash, binIndex, path };
}