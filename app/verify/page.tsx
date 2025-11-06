'use client'; // This is a client component

import { useState } from 'react';
import Link from 'next/link';

// Type for the API response from /api/verify
type VerificationResult = {
    commitHex: string;
    combinedSeed: string;
    pegMapHash: string;
    binIndex: number;
    path: string[];
};

export default function VerifyPage() {
    // --- Form State ---
    const [serverSeed, setServerSeed] = useState('');
    const [clientSeed, setClientSeed] = useState('');
    const [nonce, setNonce] = useState('');
    const [dropColumn, setDropColumn] = useState('6');

    // --- UI State ---
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Handle the "Verify" button click
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submission
        setIsLoading(true);
        setResult(null);
        setError(null);

        // 1. Build the query parameters
        const params = new URLSearchParams({
            serverSeed,
            clientSeed,
            nonce,
            dropColumn,
        });

        try {
            // 2. Call the GET /api/verify endpoint
            const response = await fetch(`/api/verify?${params.toString()}`);
            const data = await response.json();

            if (response.ok) {
                // 3. Show the re-computed results
                setResult(data);
            } else {
                // Show an error if the API call failed
                setError(data.error || 'Failed to verify.');
            }
        } catch (err) {
            setError('An unknown error occurred.');
        }
        setIsLoading(false);
    };

    // --- Render (JSX) ---
    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px' }}>
            <h1>Plinko Verifier</h1>
            <p>
                This page re-computes a game result using the same deterministic logic
                as the server.
            </p>
            <Link href="/">&larr; Back to Game</Link>

            <hr />

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
                    <pre style={{ background: '#f4f4f4', padding: '1rem', overflowX: 'auto' }}>
                        {JSON.stringify(result, null, 2)}
                    </pre>
                    <h4>Simple Path Replay:</h4>
                    <p style={{ wordBreak: 'break-all' }}>{result.path.join(' \u2192 ')}</p>
                </div>
            )}
        </main>
    );
}