'use client'; // This line is required for all React client components in Next.js

import { useState, useEffect, useCallback, useRef } from 'react';
import PlinkoBoard from '@/app/components/PlinkoBoard';
import { useReducedMotion } from '@/app/hooks/useReducedMotion';

const PAYOUT_MAP = [
  10, 5, 2, 1.5, 1, 0.5, 0.2, 0.5, 1, 1.5, 2, 5, 10
];

// --- PayoutTable Component (using CSS classes) ---
function PayoutTable() {
  return (
    <div className="payout-table">
      {PAYOUT_MAP.map((payout, index) => (
        <div key={index} className="payout-bin">
          <div className="payout-bin-index">Bin {index}</div>
          <div className="payout-bin-value">{payout}x</div>
        </div>
      ))}
    </div>
  );
}

// Define the types for our game state and API responses
type GameResult = {
  binIndex: number;
  path: string[];
  payoutMultiplier: number;
};

export default function GamePage() {
  // --- Game State ---
  const [roundId, setRoundId] = useState<string | null>(null);
  const [commitHex, setCommitHex] = useState<string | null>(null);
  const [clientSeed, setClientSeed] = useState<string>('candidate-hello');
  const [betAmount, setBetAmount] = useState<number>(100); // in cents
  const [dropColumn, setDropColumn] = useState<number>(6); // 0-12

  // --- UI State ---
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isTilted, setIsTilted] = useState(false);
  const [isDebug, setIsDebug] = useState(false);

  const prefersReducedMotion = useReducedMotion();
  const audioWin = useRef<HTMLAudioElement | null>(null);
  const audioTick = useRef<HTMLAudioElement | null>(null);

  // Initialize audio on component mount
  useEffect(() => {
    audioWin.current = new Audio('/win.mp3');
    audioTick.current = new Audio('/tick.mp3');
  }, []);

  // --- FIX: This useEffect syncs the 'muted' property ---
  useEffect(() => {
    if (audioWin.current) {
      audioWin.current.muted = isMuted;
    }
    if (audioTick.current) {
      audioTick.current.muted = isMuted;
    }
  }, [isMuted]); // This runs ONLY when isMuted changes

  // --- FIX: playTick no longer depends on isMuted ---
  const playTick = useCallback(() => {
    if (audioTick.current) {
      audioTick.current.currentTime = 0; // Rewind
      audioTick.current.play();
    }
  }, []); // <-- Empty dependency array is stable

  // --- FIX: playWin no longer depends on isMuted ---
  const playWin = useCallback(() => {
    if (audioWin.current) {
      audioWin.current.currentTime = 0;
      audioWin.current.play();
    }
  }, []); // <-- Empty dependency array is stable

  // 1. (Auto) Commit on page load
  const commitNewRound = useCallback(async () => {
    setGameResult(null);
    setIsLoading(true); // Set loading while we get the new round
    try {
      const response = await fetch('/api/rounds/commit', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setRoundId(data.roundId);
        setCommitHex(data.commitHex);
      } else {
        console.error('Failed to commit:', data.error);
      }
    } catch (error) {
      console.error('Commit request failed:', error);
    }
    setIsLoading(false); // We are ready to play
  }, [setIsLoading]); // Add setIsLoading

  // --- 2. Call the new function on initial page load ---
  useEffect(() => {
    commitNewRound();
  }, [commitNewRound]);

  // 3. (Auto) Reveal seed after game finishes
  const handleReveal = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/rounds/${id}/reveal`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        console.log('Round Revealed! Server Seed:', data.serverSeed);
      } else {
        console.error('Failed to reveal round:', data.error);
      }
    } catch (error) {
      console.error('Reveal request failed:', error);
    }
    commitNewRound();
  }, [commitNewRound]);

  // 2. Handle the "Drop" button click
  const handleDrop = useCallback(async () => {
    if (!roundId) return;

    setIsLoading(true);
    setGameResult(null);

    try {
      const response = await fetch(`/api/rounds/${roundId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSeed: clientSeed,
          betCents: betAmount,
          dropColumn: dropColumn,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGameResult(data);
        console.log('Game Result:', data);

        if (prefersReducedMotion) {
          console.log('Reduced motion: Skipping animation.');
          setTimeout(() => handleReveal(roundId), 0);
        }
      } else {
        console.error('Failed to start round:', data.error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Start request failed:', error);
      setIsLoading(false);
    }
  }, [roundId, clientSeed, betAmount, dropColumn, setIsLoading, prefersReducedMotion, handleReveal]);

  // This function will be called by the PlinkoBoard when it's done
  const handleAnimationComplete = useCallback(() => {
    console.log('Animation finished!');
    playWin(); // <-- Play win sound
    if (roundId) {
      handleReveal(roundId);
    }
  }, [roundId, handleReveal, playWin]);

  // --- Keyboard Controls Logic ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 't') {
        setIsTilted((prev) => !prev); // Toggle the tilt state
      }
      if (key === 'g') {
        setIsDebug((prev) => !prev);
      }
      if (isLoading) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setDropColumn((prevCol) => Math.max(0, prevCol - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setDropColumn((prevCol) => Math.min(12, prevCol + 1));
          break;
        case ' ':
          e.preventDefault();
          handleDrop();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoading, handleDrop]);

  // --- Render (JSX) ---
  return (
    <main className="container">
      <button
        onClick={() => setIsMuted(!isMuted)}
        style={{ float: 'right' }} // Kept float for positioning
      >
        {isMuted ? 'Unmute' : 'Mute'}
      </button>

      <h1>Plinko Lab (Provably-Fair)</h1>
      <p>Status: {isLoading ? 'Loading...' : 'Ready'}</p>

      {/* --- Controls --- */}
      <div className="controls-grid">
        <div className="control-group">
          <label htmlFor="betAmount">Bet Amount (cents):</label>
          <input
            id="betAmount"
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
            disabled={isLoading}
          />
        </div>
        <div className="control-group">
          <label htmlFor="clientSeed">Client Seed:</label>
          <input
            id="clientSeed"
            type="text"
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="control-group">
          <label htmlFor="dropColumn">Drop Column (0-12):</label>
          <input
            id="dropColumn"
            type="number"
            min="0"
            max="12"
            value={dropColumn}
            onChange={(e) => setDropColumn(parseInt(e.target.value) || 0)}
            disabled={isLoading}
          />
        </div>
        <button onClick={handleDrop} disabled={isLoading}>
          {isLoading ? 'Dropping...' : 'Drop Ball'}
        </button>
      </div>

      {/* --- Game Area --- */}
      <div
        className="plinko-area"
        style={{
          transition: 'transform 0.3s ease-out',
          transform: isTilted ? 'rotate(5deg)' : 'rotate(0deg)',
        }}
      >
        {gameResult && !prefersReducedMotion ? (
          <PlinkoBoard
            path={gameResult.path}
            onAnimationComplete={handleAnimationComplete}
            playTick={playTick}
            isDebug={isDebug}
          />
        ) : (
          <div className="plinko-placeholder">
            [Plinko Board Area]
            {gameResult && prefersReducedMotion && (
              <h3>Result: Landed in Bin {gameResult.binIndex}</h3>
            )}
          </div>
        )}

        {gameResult && (
          <div className="plinko-result-overlay">
            <strong>Last Result:</strong> Landed in Bin {gameResult.binIndex} (
            {gameResult.payoutMultiplier}x Payout)
          </div>
        )}
      </div>

      {/* --- FIX: Removed placeholder, just show the table --- */}
      <div style={{ marginTop: '1rem' }}>
        <PayoutTable />
      </div>

      {/* --- Fairness Info --- */}
      <div className="fairness-info">
        <p>
          <strong>Current Round ID:</strong> <code>{roundId || '...'}</code>
        </p>
        <p>
          <strong>Commit Hex:</strong> <code>{commitHex || '...'}</code>
        </p>
        <p>
          <a href="/verify" target="_blank" rel="noopener noreferrer">
            Go to Verifier Page
          </a>
        </p>
        <p style={{ color: '#888' }}>
          Press 'T' for Tilt Mode, 'G' for Debug Grid.
        </p>
      </div>
    </main>
  );
}