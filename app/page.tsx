'use client'; // This line is required for all React client components in Next.js

import { useState, useEffect, useCallback, useRef } from 'react';
import PlinkoBoard from '@/app/components/PlinkoBoard';
import { useReducedMotion } from '@/app/hooks/useReducedMotion';

const PAYOUT_MAP = [
  10, 5, 2, 1.5, 1, 0.5, 0.2, 0.5, 1, 1.5, 2, 5, 10
];

function PayoutTable() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', background: '#333' }}>
      {PAYOUT_MAP.map((payout, index) => (
        <div
          key={index}
          style={{
            padding: '8px 4px',
            background: '#f4f4f4',
            textAlign: 'center',
            minWidth: '30px'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#666' }}>Bin {index}</div>
          <div style={{ fontWeight: 'bold' }}>{payout}x</div>
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
  // Sound State
  const [isMuted, setIsMuted] = useState(false);

  // --- ADD: Easter Egg State ---
  const [isTilted, setIsTilted] = useState(false);
  // --- ADD: Debug Grid State ---
  const [isDebug, setIsDebug] = useState(false);

  const prefersReducedMotion = useReducedMotion();

  // Create refs for the audio elements
  // We use refs so they persist across renders
  const audioWin = useRef<HTMLAudioElement | null>(null);
  const audioTick = useRef<HTMLAudioElement | null>(null);

  // Initialize audio on component mount
  useEffect(() => {
    audioWin.current = new Audio('/win.mp3');
    audioTick.current = new Audio('/tick.mp3');
  }, []);
  // Helper function to play tick sound
  useEffect(() => {
    if (audioWin.current) {
      audioWin.current.muted = isMuted;
    }
    if (audioTick.current) {
      audioTick.current.muted = isMuted;
    }
  }, [isMuted]);
  const playTick = useCallback(() => {
    if (!isMuted && audioTick.current) {
      audioTick.current.currentTime = 0; // Rewind
      audioTick.current.play();
    }
  }, []);
  // Helper function to play win sound
  const playWin = useCallback(() => {
    if (!isMuted && audioWin.current) {
      audioWin.current.currentTime = 0;
      audioWin.current.play();
    }
  }, []);

  // --- API Functions ---


  // 1. (Auto) Commit on page load
  useEffect(() => {
    async function commitNewRound() {
      setIsLoading(true);
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
      setIsLoading(false);
    }
    commitNewRound();
  }, []); // Empty dependency array means this runs once on mount



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

    setIsLoading(false);
  }, [setIsLoading]);
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
          // We can't call handleReveal directly, as it causes
          // a state update while this one is still processing.
          // We use a tiny timeout to call it on the next "tick".
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
  // 3. Wrap handleAnimationComplete in useCallback
  const handleAnimationComplete = useCallback(() => {
    console.log('Animation finished!');
    playWin(); // <-- Play win sound
    if (roundId) {
      handleReveal(roundId);
    }
  }, [roundId, handleReveal, playWin]);

  // --- ADD: Keyboard Controls Logic ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't do anything if the game is loading/animating
      const key = e.key.toLowerCase();
      if (key.toLowerCase() === 't') {
        setIsTilted((prev) => !prev); // Toggle the tilt state
      }
      if (key === 'g') {
        setIsDebug((prev) => !prev);
      }
      if (isLoading) {
        return;
      }

      // Check which key was pressed
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault(); // Stop window from scrolling
          // Use a state updater function to get the previous value
          setDropColumn((prevCol) => Math.max(0, prevCol - 1)); // Go left, clamp at 0
          break;
        case 'ArrowRight':
          e.preventDefault(); // Stop window from scrolling
          setDropColumn((prevCol) => Math.min(12, prevCol + 1)); // Go right, clamp at 12
          break;
        case ' ': // Spacebar
          e.preventDefault(); // Stop window from scrolling
          handleDrop(); // Trigger the drop
          break;
      }
    };

    // Add the event listener to the window
    window.addEventListener('keydown', handleKeyDown);
    // Cleanup: Remove the listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoading, handleDrop]);

  // --- Render (JSX) ---
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Plinko Lab (Provably-Fair)</h1>
      <button
        onClick={() => setIsMuted(!isMuted)}
        style={{ float: 'right', padding: '0.5rem' }}
      >
        {isMuted ? 'Unmute' : 'Mute'}
      </button>
      <p>Status: {isLoading ? 'Loading...' : 'Ready'}</p>

      <hr />

      {/* --- Controls --- */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label>Bet Amount (cents): </label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
            disabled={isLoading}
          />
        </div>
        <div>
          <label>Client Seed: </label>
          <input
            type="text"
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div>
          <label>Drop Column (0-12): </label>
          <input
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

      <hr />

      {/* --- Game Area (Placeholders) --- */}
      <div style={{ position: 'relative', border: '1px solid #ccc', transition: 'transform 0.3s ease-out', transform: isTilted ? 'rotate(5deg)' : 'rotate(0deg)', }}>
        {/* The PlinkoBoard only renders when we have a result to animate */}
        {gameResult && !prefersReducedMotion ? (
          <PlinkoBoard
            path={gameResult.path}
            onAnimationComplete={handleAnimationComplete}
            playTick={playTick}
            isDebug={isDebug}
          />
        ) : (
          <div style={{ height: '600px', background: '#f0f0f0', padding: '1rem' }}>
            [Plinko Board Area]
          </div>
        )}

        {gameResult && (
          <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
            <strong>Last Result:</strong> Landed in Bin {gameResult.binIndex} (
            {gameResult.payoutMultiplier}x Payout)
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        {/* TODO: Add Payout Table component here */}
        <p>[Payout Table Placeholder]</p>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <PayoutTable />
      </div>
      <hr />

      {/* --- Fairness Info --- */}
      <div>
        <p>
          <strong>Current Round ID:</strong> {roundId || '...'}
        </p>
        <p>
          <strong>Commit Hex:</strong> {commitHex || '...'}
        </p>
        <p>
          <a href="/verify" target="_blank" rel="noopener noreferrer">
            Go to Verifier Page
          </a>
        </p>
      </div>
    </main>
  );
}