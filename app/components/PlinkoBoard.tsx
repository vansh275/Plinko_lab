'use client';

import { useEffect, useRef, useMemo } from 'react';

/**
 * Defines the props accepted by the PlinkoBoard component.
 */
interface PlinkoBoardProps {
    /** The deterministic path (e.g., ['L', 'R', 'R', ...]) for the ball. */
    path: string[];
    /** Callback function to execute when the animation is complete. */
    onAnimationComplete: () => void;
    /** Callback function to play the "tick" sound on peg collision. */
    playTick: () => void;
    /** Flag to toggle the visibility of the debug grid. */
    isDebug: boolean;
}

/**
 * ========================================================================
 * Constants
 * ========================================================================
 */

/** The fixed number of peg rows on the board. */
const ROWS = 12;
/** The radius of the ball in pixels. */
const BALL_RADIUS = 10;
/** The radius of each peg in pixels. */
const PEG_RADIUS = 5;
/** The internal drawing width of the canvas. */
const CANVAS_WIDTH = 800;
/** The internal drawing height of the canvas. */
const CANVAS_HEIGHT = 960;

/** The top padding (in pixels) before the first row of pegs. */
const Y_START = 50;
/** The horizontal spacing between pegs in a row. */
const X_SPACING = (CANVAS_WIDTH * 0.8) / (ROWS - 1);
/** The vertical spacing between peg rows. */
const Y_SPACING = (CANVAS_HEIGHT - Y_START * 2) / ROWS;

/**
 * ========================================================================
 * PlinkoBoard Component
 * ========================================================================
 *
 * This component renders the main Plinko game animation on an HTML canvas.
 * It is responsible for drawing the pegs, the ball, and moving the ball
 * along the deterministic `path` provided by the parent.
 */
const PlinkoBoard: React.FC<PlinkoBoardProps> = ({
    path,
    onAnimationComplete,
    playTick,
    isDebug,
}) => {
    /** A React ref to access the underlying <canvas> DOM element. */
    const canvasRef = useRef<HTMLCanvasElement>(null);

    /**
     * Calculates and memoizes the x, y coordinates for every peg on the board.
     * This ensures the layout is calculated only once.
     */
    const pegs = useMemo(() => {
        const pegLayout: { x: number; y: number }[] = [];
        for (let r = 0; r < ROWS; r++) {
            const pegsInRow = r + 1;
            const rowY = Y_START + r * Y_SPACING;

            // Calculate the starting X offset to center the triangular row.
            const rowWidth = (pegsInRow - 1) * X_SPACING;
            let x = (CANVAS_WIDTH - rowWidth) / 2;

            for (let p = 0; p < pegsInRow; p++) {
                pegLayout.push({ x: x, y: rowY });
                x += X_SPACING;
            }
        }
        return pegLayout;
    }, []);

    /**
     * A ref to hold the current `isDebug` value.
     * This decouples the debug state from the main animation loop,
     * preventing the animation from restarting every time the 'G' key is pressed.
     */
    const isDebugRef = useRef(isDebug);

    /**
     * This effect syncs the `isDebug` prop with the `isDebugRef`
     * whenever the prop changes.
     */
    useEffect(() => {
        isDebugRef.current = isDebug;
    }, [isDebug]);

    /**
     * The main animation hook.
     * This effect runs whenever the `path` changes (i.e., a new game starts).
     * It sets up and runs the `requestAnimationFrame` loop.
     */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        /**
         * Initial state for the ball animation.
         * The ball always starts at the top center.
         */
        const startX = CANVAS_WIDTH / 2;
        let ball = {
            x: startX,
            y: 20, // Start just above the first peg
            vx: 0, // Initial horizontal velocity
            vy: 0.5, // Initial vertical velocity
        };
        /** Tracks which step of the `path` array we are on. */
        let currentPathIndex = 0;
        /** Stores the ID of the animation frame for cancellation. */
        let animationFrameId: number;

        /**
         * ====================================================================
         * Canvas Drawing Functions
         * ====================================================================
         */

        /** Draws the static grid of pegs. */
        const drawPegs = () => {
            ctx.fillStyle = '#555';
            for (const peg of pegs) {
                ctx.beginPath();
                ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        /** Draws the ball at its current position. */
        const drawBall = () => {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();
        };

        /** Draws the debug overlay if enabled. */
        const drawDebugGrid = () => {
            ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.font = '10px Arial';
            ctx.fillStyle = 'blue';

            for (const peg of pegs) {
                // Draw a bounding box around the peg.
                ctx.strokeRect(peg.x - PEG_RADIUS, peg.y - PEG_RADIUS, PEG_RADIUS * 2, PEG_RADIUS * 2);
                // Draw the peg's coordinates.
                ctx.fillText(`(${Math.round(peg.x)}, ${Math.round(peg.y)})`, peg.x + PEG_RADIUS + 2, peg.y + 3);
            }
        };

        /**
         * ====================================================================
         * Main Animation Loop (executed ~60x/sec)
         * ====================================================================
         */
        const render = () => {
            // 1. Clear the canvas for the new frame.
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 2. Draw all static elements.
            drawPegs();

            // 3. Draw debug grid if the ref is true.
            if (isDebugRef.current) {
                drawDebugGrid();
            }

            /**
             * 4. Update ball physics and position.
             */

            // 4a. Apply vertical gravity (accelerates downward).
            ball.vy += 0.02;
            if (ball.vy > 4) {
                ball.vy = 4; // Cap max fall speed
            }
            ball.y += ball.vy;

            // 4b. Apply horizontal friction (slows horizontal movement).
            ball.vx *= 0.9;
            ball.x += ball.vx;

            // 4c. Check for decision logic.
            // Find the Y-coordinate of the row we're about to hit.
            const currentRowY = Y_START + currentPathIndex * Y_SPACING;

            // Check if the ball has reached the decision row.
            if (currentPathIndex < path.length && ball.y >= currentRowY - BALL_RADIUS) {
                // Get the pre-determined direction from the path array.
                const direction = path[currentPathIndex];

                // Apply a horizontal "impulse" to nudge the ball.
                if (direction === 'L') {
                    ball.vx = -2; // Nudge left
                } else {
                    ball.vx = 2;  // Nudge right
                }

                // Play the "tick" sound effect.
                playTick();

                // Advance to the next step in the path.
                currentPathIndex++;
            }

            // 5. Draw the ball at its newly calculated position.
            drawBall();

            // 6. Check for animation completion.
            // If the path is finished AND the ball is off-screen...
            if (currentPathIndex >= path.length && ball.y > canvas.height + BALL_RADIUS) {
                // ...stop the animation loop and notify the parent component.
                cancelAnimationFrame(animationFrameId);
                onAnimationComplete();
            } else {
                // ...otherwise, request the next frame.
                animationFrameId = requestAnimationFrame(render);
            }
        };

        // Start the animation loop.
        render();

        // Cleanup function: stop the animation if the component unmounts.
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [path, onAnimationComplete, pegs, playTick]); // Dependencies for the animation

    return (
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="plinko-canvas"
        />
    );
};

export default PlinkoBoard;