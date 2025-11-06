'use client';

import { useEffect, useRef, useMemo } from 'react';

// --- Component Props ---
interface PlinkoBoardProps {
    path: string[]; // e.g., ['L', 'R', 'R', ...]
    onAnimationComplete: () => void;
    playTick: () => void;
    isDebug: boolean;
}

// --- Constants ---
const ROWS = 12;
const BALL_RADIUS = 10;
const PEG_RADIUS = 5;
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 600;

// Calculate horizontal and vertical spacing
const Y_START = 50; // Where the first row of pegs starts
const X_SPACING = (CANVAS_WIDTH * 0.8) / (ROWS - 1);
const Y_SPACING = (CANVAS_HEIGHT - Y_START * 2) / ROWS;

const PlinkoBoard: React.FC<PlinkoBoardProps> = ({
    path,
    onAnimationComplete,
    playTick,
    isDebug,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // useMemo will cache the peg layout
    const pegs = useMemo(() => {
        const pegLayout: { x: number; y: number }[] = [];
        for (let r = 0; r < ROWS; r++) {
            const pegsInRow = r + 1;
            const rowY = Y_START + r * Y_SPACING;
            // Calculate the starting X for this row to center it
            const rowWidth = (pegsInRow - 1) * X_SPACING;
            let x = (CANVAS_WIDTH - rowWidth) / 2;

            for (let p = 0; p < pegsInRow; p++) {
                pegLayout.push({ x: x, y: rowY });
                x += X_SPACING;
            }
        }
        return pegLayout;
    }, []);
    // 1. Create a ref to hold the current 'isDebug' value
    const isDebugRef = useRef(isDebug);

    // 2. This separate, small useEffect will *only* run when
    // 'isDebug' changes, keeping the ref in sync.
    useEffect(() => {
        isDebugRef.current = isDebug;
    }, [isDebug]);

    // This useEffect handles the animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // --- Animation State ---
        // --- FIX 1: Correct startX calculation ---
        const startX = CANVAS_WIDTH / 2;

        let ball = {
            x: startX,
            y: 20, // Start above the pegs
            vx: 0, // velocity x
            vy: 0.5, // velocity y
        };
        let currentPathIndex = 0;

        let animationFrameId: number;

        // --- Drawing Functions ---
        const drawPegs = () => {
            ctx.fillStyle = '#555';
            for (const peg of pegs) {
                ctx.beginPath();
                ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const drawBall = () => {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();
        };

        const drawDebugGrid = () => {
            ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'; // Blue, semi-transparent
            ctx.lineWidth = 1;
            ctx.font = '10px Arial';
            ctx.fillStyle = 'blue';

            for (const peg of pegs) {
                // Draw a box around the peg
                ctx.strokeRect(peg.x - PEG_RADIUS, peg.y - PEG_RADIUS, PEG_RADIUS * 2, PEG_RADIUS * 2);

                // Show row/column index (this is simplified)
                // For simplicity, let's just show coordinates
                ctx.fillText(`(${Math.round(peg.x)}, ${Math.round(peg.y)})`, peg.x + PEG_RADIUS + 2, peg.y + 3);
            }
        };

        // --- Animation Loop ---
        const render = () => {
            // 1. Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 2. Draw static pegs
            drawPegs();

            if (isDebugRef.current) {
                drawDebugGrid();
            }

            // --- FIX 2: Improved Physics Logic ---

            // 3. Apply "gravity"
            ball.vy += 0.02;
            if (ball.vy > 4) {
                ball.vy = 4;
            }
            ball.y += ball.vy;

            // 4. Apply "friction" and move horizontally
            ball.vx *= 0.9; // Horizontal velocity decays (friction)
            ball.x += ball.vx;

            // 5. Find the next "decision row" (the row we are about to hit)
            const currentRowY = Y_START + currentPathIndex * Y_SPACING;

            if (currentPathIndex < path.length && ball.y >= currentRowY - BALL_RADIUS) {
                // We've reached the decision row. Apply the "nudge" from the path.
                const direction = path[currentPathIndex];

                // This is an "impulse" - a sudden, stronger change in velocity
                if (direction === 'L') {
                    ball.vx = -2; // Apply a stronger nudge left
                } else {
                    ball.vx = 2;  // Apply a stronger nudge right
                }
                playTick();

                // Move to the next path decision
                currentPathIndex++;
            }
            // --- END FIX 2 ---

            // 6. Draw the ball in its new position
            drawBall();

            // 7. Check if animation is done
            if (currentPathIndex >= path.length && ball.y > canvas.height + BALL_RADIUS) {
                // Path is done AND ball is off-screen
                cancelAnimationFrame(animationFrameId);
                onAnimationComplete();
            } else {
                animationFrameId = requestAnimationFrame(render);
            }
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [path, onAnimationComplete, pegs, playTick]);

    return (
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ background: '#f0f0f0', border: '1px solid #ccc' }}
        />
    );
};

export default PlinkoBoard;