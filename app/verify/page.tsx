'use client'; // This is a client component, handling user interaction and state.

import { useState } from 'react';
import Link from 'next/link';

/**
 * Defines the structure for the re-computed data returned by the /api/verify endpoint.
 */
type VerificationResult = {
    commitHex: string;
    combinedSeed: string;
    pegMapHash: string;
    binIndex: number;
    path: string[];
};

/**
 * The Plinko Verifier Page component.
 * It provides a form for users to input game parameters and re-compute
 * the deterministic outcome to prove the game's fairness.
 */
export default function VerifyPage() {
    // State variables for capturing user input (the game seeds/inputs).
    const [serverSeed, setServerSeed] = useState('');
    const [clientSeed, setClientSeed] = useState('');
    const [nonce, setNonce] = useState('');
    const [dropColumn, setDropColumn] = useState('6');

    // State variables for managing the UI status.
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Handles the form submission event.
     * Calls the GET /api/verify route for deterministic re-computation.
     *
     * @param e - The React form submission event.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default browser form submission.
        setIsLoading(true);
        setResult(null);
        setError(null);

        // 1. Construct the query string using URLSearchParams.
        const params = new URLSearchParams({
            serverSeed,
            clientSeed,
            nonce,
            dropColumn,
        });

        try {
            // 2. Execute the fetch request to the verification API endpoint.
            const response = await fetch(`/api/verify?${params.toString()}`);
            const data = await response.json();

            if (response.ok) {
                // 3. Store the successful re-computed results.
                setResult(data);
            } else {
                // Handle server-side validation or computation errors.
                setError(data.error || 'Failed to verify.');
            }
        } catch (err) {
            // Handle network or unknown client-side fetch errors.
            setError('An unknown error occurred.');
        }
        setIsLoading(false);
    };

    /**
     * Renders the verification form and displays the re-computed results.
     */
    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px' }}>
            <h1>Plinko Verifier</h1>
            <p>
                This page re-computes a game result using the same deterministic logic
                as the server.
            </p>
            <Link href="/">&larr; Back to Game</Link>

            <hr />
            <div style={{ padding: '1rem', background: '#2c2c2c', borderRadius: '8px', margin: '1rem 0' }}>
                <strong>How to find your inputs:</strong>
                <ol style={{ paddingLeft: '20px', margin: '0.5rem 0 0 0' }}>
                    <li>Play a full game on the main page.</li>
                    <li>Open your browser's Developer Console (F12).</li>
                    <li>After the ball lands, look for the log: <strong>"Round Revealed! Server Seed: ... Nonce: ..."</strong></li>
                    <li>Copy your `clientSeed` (from the input) and the `serverSeed` and `nonce` (from the console) into the form below.</li>
                </ol>
            </div>

            {/* --- Verification Form --- */}
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <label htmlFor="serverSeed">Server Seed:</label>
                <input
                    id="serverSeed"
                    type="text"
                    value={serverSeed}
                    onChange={(e) => setServerSeed(e.target.value)}
                    required
                    style={{ width: '100%' }}
                />

                <label htmlFor="clientSeed">Client Seed:</label>
                <input
                    id="clientSeed"
                    type="text"
                    value={clientSeed}
                    onChange={(e) => setClientSeed(e.target.value)}
                    required
                    style={{ width: '100%' }}
                />

                <label htmlFor="nonce">Nonce:</label>
                <input
                    id="nonce"
                    type="text"
                    value={nonce}
                    onChange={(e) => setNonce(e.target.value)}
                    required
                    style={{ width: '100%' }}
                />

                <label htmlFor="dropColumn">Drop Column:</label>
                <input
                    id="dropColumn"
                    type="number"
                    min="0"
                    max="12"
                    value={dropColumn}
                    onChange={(e) => setDropColumn(e.target.value)}
                    required
                    style={{ width: '100px' }}
                />

                <div />
                <button type="submit" disabled={isLoading} style={{ padding: '0.5rem' }}>
                    {isLoading ? 'Verifying...' : 'Verify Result'}
                </button>
            </form>

            <hr />

            {/* --- Results Display --- */}
            {error && (
                <div style={{ color: 'red' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {result && (
                <div>
                    <h3>Verification Passed</h3>
                    <p>
                        Compare these re-computed values to the ones logged in the game.
                    </p>
                    {/* Display the core hash values and results in a readable JSON format. */}
                    <pre style={{ background: '#0000', padding: '1rem', overflowX: 'auto' }}>
                        {JSON.stringify(result, null, 2)}
                    </pre>
                    <h4>Simple Path Replay:</h4>
                    {/* Displays the sequence of L (Left) and R (Right) decisions for traceability. */}
                    <p style={{ wordBreak: 'break-all' }}>{result.path.join(' \u2192 ')}</p>
                </div>
            )}
        </main>
    );
}