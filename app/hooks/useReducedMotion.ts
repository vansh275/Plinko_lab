'use client';

import { useState, useEffect } from 'react';

/**
 * The media query string to detect the user's preference
 * for reduced motion, as per accessibility standards.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * A custom React Hook that detects if the user has enabled
 * the "prefers-reduced-motion" accessibility setting in their
 * operating system or browser.
 *
 * This allows the application to disable complex animations
 * for users who are sensitive to motion.
 *
 * @returns {boolean} `true` if the user prefers reduced motion, `false` otherwise.
 */
export const useReducedMotion = (): boolean => {
    /**
     * State to hold the current status of the media query.
     * Defaults to `false` (no preference for reduced motion).
     */
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        /**
         * 1. Check for browser support.
         * Ensure `window.matchMedia` is available before proceeding.
         */
        if (typeof window.matchMedia !== 'function') {
            return;
        }

        /**
         * 2. Create the media query list.
         */
        const mediaQuery = window.matchMedia(QUERY);

        /**
         * 3. Set the initial state.
         * This checks the preference when the component first mounts.
         */
        setMatches(mediaQuery.matches);

        /**
         * 4. Define a listener to watch for changes.
         * This will update the state if the user changes their
         * system settings while the app is open.
         */
        const listener = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        /**
         * 5. Attach the event listener.
         */
        mediaQuery.addEventListener('change', listener);

        /**
         * 6. Cleanup function.
         * This removes the event listener when the component unmounts
         * to prevent memory leaks.
         */
        return () => {
            mediaQuery.removeEventListener('change', listener);
        };
    }, []); // The empty dependency array ensures this effect runs only once on mount.

    return matches;
};