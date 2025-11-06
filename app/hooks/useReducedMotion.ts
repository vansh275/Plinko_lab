'use client';

import { useState, useEffect } from 'react';

// A query to check for the user's system preference
const QUERY = '(prefers-reduced-motion: reduce)';

export const useReducedMotion = () => {
    const [matches, setMatches] = useState(false); // Default to false

    useEffect(() => {
        // Check if window.matchMedia is supported
        if (typeof window.matchMedia !== 'function') {
            return;
        }

        const mediaQuery = window.matchMedia(QUERY);

        // Set the initial value
        setMatches(mediaQuery.matches);

        // Listen for changes
        const listener = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        mediaQuery.addEventListener('change', listener);

        // Cleanup
        return () => {
            mediaQuery.removeEventListener('change', listener);
        };
    }, []); // Empty array means this runs once on mount

    return matches;
};