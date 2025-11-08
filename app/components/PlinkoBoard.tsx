'use client';

import { useEffect, useRef, useMemo } from 'react';

interface PlinkoBoardProps {
    path: string[];
    onAnimationComplete: () => void;
    playTick: () => void;
    isDebug: boolean;
}

/** Constants */
const ROWS = 12;
const BALL_RADIUS = 10;
const PEG_RADIUS = 5;
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 600;
const Y_START = 50;
const X_SPACING = (CANVAS_WIDTH * 0.8) / (ROWS - 1);
const Y_SPACING = (CANVAS_HEIGHT - Y_START * 2) / ROWS;

const PlinkoBoard: React.FC<PlinkoBoardProps> = ({
    path,
    onAnimationComplete,
    playTick,
    isDebug,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Precompute peg coordinates
    const pegs = useMemo(() => {
        const pegLayout: { x: number; y: number }[] = [];
        for (let r = 0; r < ROWS; r++) {
            const pegsInRow = r + 1;
            const rowY = Y_START + r * Y_SPACING;
            const rowWidth = (pegsInRow - 1) * X_SPACING;
            let x = (CANVAS_WIDTH - rowWidth) / 2;
            for (let p = 0; p < pegsInRow; p++) {
                pegLayout.push({ x, y: rowY });
                x += X_SPACING;
            }
        }
        return pegLayout;
    }, []);

    const isDebugRef = useRef(isDebug);
    useEffect(() => {
        isDebugRef.current = isDebug;
    }, [isDebug]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const startX = CANVAS_WIDTH / 2;
        let ball = { x: startX, y: 20, vx: 0, vy: 0.5 };
        let currentPathIndex = 0;
        let animationFrameId: number;

        /** Draw pegs */
        const drawPegs = () => {
            ctx.fillStyle = '#555';
            for (const peg of pegs) {
                ctx.beginPath();
                ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        /** Draw ball */
        const drawBall = () => {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();
        };

        /** Debug overlay */
        const drawDebugGrid = () => {
            ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.font = '10px Arial';
            ctx.fillStyle = 'blue';
            for (const peg of pegs) {
                ctx.strokeRect(peg.x - PEG_RADIUS, peg.y - PEG_RADIUS, PEG_RADIUS * 2, PEG_RADIUS * 2);
                ctx.fillText(`(${Math.round(peg.x)}, ${Math.round(peg.y)})`, peg.x + PEG_RADIUS + 2, peg.y + 3);
            }
        };

        /** Animation loop */
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawPegs();
            if (isDebugRef.current) drawDebugGrid();

            ball.vy += 0.02;
            if (ball.vy > 4) ball.vy = 4;
            ball.y += ball.vy;

            ball.vx *= 0.9;
            ball.x += ball.vx;

            const currentRowY = Y_START + currentPathIndex * Y_SPACING;

            if (currentPathIndex < path.length && ball.y >= currentRowY - BALL_RADIUS) {
                const direction = path[currentPathIndex];
                ball.vx = direction === 'L' ? -2 : 2;
                playTick();
                currentPathIndex++;
            }

            drawBall();

            if (currentPathIndex >= path.length && ball.y > canvas.height + BALL_RADIUS) {
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
        <div
            style={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '0 auto',
                border: '2px solid #ccc',
                borderRadius: '12px',
                background: '#fafafa',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
            }}
        >
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                style={{
                    display: 'block',
                    background: '#fff',
                    borderRadius: '8px',
                }}
            />
        </div>
    );
};

export default PlinkoBoard;
