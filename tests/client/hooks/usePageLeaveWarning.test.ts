/**
 * @fileoverview Tests for usePageLeaveWarning hook
 */
import { renderHook, act } from '@testing-library/react';
import usePageLeaveWarning from '../../../client/src/hooks/usePageLeaveWarning';

// Mock window methods
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
const mockPushState = jest.fn();
const mockConfirm = jest.fn();

const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;
const originalPushState = window.history.pushState;
const originalConfirm = window.confirm;

beforeEach(() => {
  jest.clearAllMocks();
  window.addEventListener = mockAddEventListener;
  window.removeEventListener = mockRemoveEventListener;
  window.history.pushState = mockPushState;
  window.confirm = mockConfirm;
});

afterAll(() => {
  window.addEventListener = originalAddEventListener;
  window.removeEventListener = originalRemoveEventListener;
  window.history.pushState = originalPushState;
  window.confirm = originalConfirm;
});

describe('usePageLeaveWarning', () => {
  const defaultMessage = "Are you sure you want to leave? You're in the middle of a game and other players are counting on you!";

  describe('initialization', () => {
    it('should not add event listeners when shouldWarn is false', () => {
      renderHook(() => usePageLeaveWarning(false));

      expect(mockAddEventListener).not.toHaveBeenCalled();
      expect(mockPushState).not.toHaveBeenCalled();
    });

    it('should add event listeners when shouldWarn is true', () => {
      renderHook(() => usePageLeaveWarning(true));

      expect(mockAddEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
      expect(mockPushState).toHaveBeenCalledWith(null, '', window.location.pathname);
    });

    it('should use custom message when provided', () => {
      const customMessage = 'Custom warning message';
      const { result } = renderHook(() => usePageLeaveWarning(true, customMessage));

      mockConfirm.mockReturnValue(true);
      const confirmed = result.current.confirmLeave();

      expect(mockConfirm).toHaveBeenCalledWith(customMessage);
      expect(confirmed).toBe(true);
    });

    it('should use default message when no custom message provided', () => {
      const { result } = renderHook(() => usePageLeaveWarning(true));

      mockConfirm.mockReturnValue(false);
      const confirmed = result.current.confirmLeave();

      expect(mockConfirm).toHaveBeenCalledWith(defaultMessage);
      expect(confirmed).toBe(false);
    });
  });

  describe('beforeunload event handling', () => {
    it('should prevent default and set returnValue when shouldWarn is true', () => {
      renderHook(() => usePageLeaveWarning(true));

      const beforeUnloadHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeunload'
      )?.[1];

      expect(beforeUnloadHandler).toBeDefined();

      const mockEvent = {
        preventDefault: jest.fn(),
        returnValue: ''
      };

      const result = beforeUnloadHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.returnValue).toBe(defaultMessage);
      expect(result).toBe(defaultMessage);
    });

    it('should not prevent default when shouldWarn is false', () => {
      const { rerender } = renderHook(
        ({ shouldWarn }) => usePageLeaveWarning(shouldWarn),
        { initialProps: { shouldWarn: true } }
      );

      const beforeUnloadHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeunload'
      )?.[1];

      // Update to shouldWarn = false
      rerender({ shouldWarn: false });

      const mockEvent = {
        preventDefault: jest.fn(),
        returnValue: ''
      };

      const result = beforeUnloadHandler(mockEvent);

      expect(result).toBeUndefined();
    });
  });

  describe('popstate event handling', () => {
    it('should show confirmation dialog and prevent navigation when user cancels', () => {
      renderHook(() => usePageLeaveWarning(true));

      const popStateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'popstate'
      )?.[1];

      expect(popStateHandler).toBeDefined();

      mockConfirm.mockReturnValue(false); // User cancels

      const mockEvent = {};
      popStateHandler(mockEvent);

      expect(mockConfirm).toHaveBeenCalledWith(defaultMessage);
      expect(mockPushState).toHaveBeenCalledWith(null, '', window.location.pathname);
    });

    it('should allow navigation when user confirms', () => {
      renderHook(() => usePageLeaveWarning(true));

      const popStateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'popstate'
      )?.[1];

      mockConfirm.mockReturnValue(true); // User confirms
      mockPushState.mockClear(); // Clear initial pushState call

      const mockEvent = {};
      popStateHandler(mockEvent);

      expect(mockConfirm).toHaveBeenCalledWith(defaultMessage);
      // Should not push state again when user confirms
      expect(mockPushState).not.toHaveBeenCalled();
    });

    it('should not show dialog when shouldWarn is false', () => {
      const { rerender } = renderHook(
        ({ shouldWarn }) => usePageLeaveWarning(shouldWarn),
        { initialProps: { shouldWarn: true } }
      );

      const popStateHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'popstate'
      )?.[1];

      // Update to shouldWarn = false
      rerender({ shouldWarn: false });

      const mockEvent = {};
      popStateHandler(mockEvent);

      expect(mockConfirm).not.toHaveBeenCalled();
    });
  });

  describe('confirmLeave function', () => {
    it('should return true without confirmation when shouldWarn is false', () => {
      const { result } = renderHook(() => usePageLeaveWarning(false));

      const confirmed = result.current.confirmLeave();

      expect(confirmed).toBe(true);
      expect(mockConfirm).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog when shouldWarn is true', () => {
      const { result } = renderHook(() => usePageLeaveWarning(true));

      mockConfirm.mockReturnValue(true);
      const confirmed = result.current.confirmLeave();

      expect(mockConfirm).toHaveBeenCalledWith(defaultMessage);
      expect(confirmed).toBe(true);
    });

    it('should return false when user cancels confirmation', () => {
      const { result } = renderHook(() => usePageLeaveWarning(true));

      mockConfirm.mockReturnValue(false);
      const confirmed = result.current.confirmLeave();

      expect(confirmed).toBe(false);
    });

    it('should use custom message in confirmation', () => {
      const customMessage = 'Custom leave message';
      const { result } = renderHook(() => usePageLeaveWarning(true, customMessage));

      mockConfirm.mockReturnValue(true);
      result.current.confirmLeave();

      expect(mockConfirm).toHaveBeenCalledWith(customMessage);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => usePageLeaveWarning(true));

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('should remove event listeners when shouldWarn changes to false', () => {
      const { rerender } = renderHook(
        ({ shouldWarn }) => usePageLeaveWarning(shouldWarn),
        { initialProps: { shouldWarn: true } }
      );

      mockRemoveEventListener.mockClear();

      rerender({ shouldWarn: false });

      expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    });
  });

  describe('hook updates', () => {
    it('should update handlers when message changes', () => {
      const { result, rerender } = renderHook(
        ({ message }) => usePageLeaveWarning(true, message),
        { initialProps: { message: 'Initial message' } }
      );

      mockConfirm.mockReturnValue(true);
      result.current.confirmLeave();
      expect(mockConfirm).toHaveBeenCalledWith('Initial message');

      mockConfirm.mockClear();
      rerender({ message: 'Updated message' });

      result.current.confirmLeave();
      expect(mockConfirm).toHaveBeenCalledWith('Updated message');
    });

    it('should update handlers when shouldWarn changes', () => {
      const { result, rerender } = renderHook(
        ({ shouldWarn }) => usePageLeaveWarning(shouldWarn),
        { initialProps: { shouldWarn: false } }
      );

      let confirmed = result.current.confirmLeave();
      expect(confirmed).toBe(true);
      expect(mockConfirm).not.toHaveBeenCalled();

      rerender({ shouldWarn: true });

      mockConfirm.mockReturnValue(false);
      confirmed = result.current.confirmLeave();
      expect(confirmed).toBe(false);
      expect(mockConfirm).toHaveBeenCalled();
    });
  });
});
