// hooks/usePageLeaveWarning.js
import { useEffect, useCallback } from 'react';

/**
 * Custom hook to warn users before leaving the page during active gameplay
 * @param {boolean} shouldWarn - Whether to show the warning (e.g., during active game)
 * @param {string} message - Custom warning message (optional)
 */
const usePageLeaveWarning = (shouldWarn, message) => {
  const defaultMessage = "Are you sure you want to leave? You're in the middle of a game and other players are counting on you!";
  
  const warningMessage = message || defaultMessage;

  // Handle beforeunload event (page refresh, close, navigate away)
  const handleBeforeUnload = useCallback((event) => {
    if (shouldWarn) {
      // Standard way to show browser warning dialog
      event.preventDefault();
      event.returnValue = warningMessage;
      return warningMessage;
    }
  }, [shouldWarn, warningMessage]);

  // Handle navigation within the app (if using React Router)
  const handlePopState = useCallback((event) => {
    if (shouldWarn) {
      const confirmed = window.confirm(warningMessage);
      if (!confirmed) {
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.pathname);
      }
    }
  }, [shouldWarn, warningMessage]);

  useEffect(() => {
    if (shouldWarn) {
      // Add event listeners
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      
      // Prevent back/forward navigation by pushing current state
      window.history.pushState(null, '', window.location.pathname);
    }

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [shouldWarn, handleBeforeUnload, handlePopState]);

  // Return a function to manually trigger the warning (useful for custom navigation)
  const confirmLeave = useCallback(() => {
    if (shouldWarn) {
      return window.confirm(warningMessage);
    }
    return true;
  }, [shouldWarn, warningMessage]);

  return { confirmLeave };
};

export default usePageLeaveWarning;