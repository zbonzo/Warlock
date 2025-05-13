/**
 * @fileoverview Custom hook for responsive design using media queries
 */
import { useState, useEffect } from 'react';

/**
 * Custom hook that returns whether a media query matches
 * 
 * @param {string} query - CSS media query string
 * @returns {boolean} True if the media query matches
 * 
 * @example
 * // Use in a component
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * 
 * // Then conditionally render
 * return isMobile ? <MobileView /> : <DesktopView />;
 */
function useMediaQuery(query) {
  // Initialize state with current match
  const [matches, setMatches] = useState(() => {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    // Default to false on server
    return false;
  });

  useEffect(() => {
    // Safety check for SSR
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    
    // Initial check
    setMatches(mediaQuery.matches);

    // Create handler function
    const handler = (event) => setMatches(event.matches);
    
    // Add event listener using the appropriate method
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler);
    }
    
    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;