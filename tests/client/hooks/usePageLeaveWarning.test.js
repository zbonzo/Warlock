/**
 * @fileoverview Tests for usePageLeaveWarning hook
 * Tests page leave warning functionality and event handling
 */

import { renderHook, act } from '@testing-library/react';
import usePageLeaveWarning from '@client/hooks/usePageLeaveWarning';

// Mock window methods
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
const mockConfirm = jest.fn();
const mockPushState = jest.fn();

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true,
});

Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
});

Object.defineProperty(window.history, 'pushState', {
  value: mockPushState,
  writable: true,
});

Object.defineProperty(window, 'location', {
  value: { pathname: '/game' },
  writable: true,
});

describe('usePageLeaveWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not add event listeners when shouldWarn is false', () => {
    renderHook(() => usePageLeaveWarning(false));

    expect(mockAddEventListener).not.toHaveBeenCalled();
    expect(mockPushState).not.toHaveBeenCalled();
  });

  it('should add event listeners when shouldWarn is true', () => {
    renderHook(() => usePageLeaveWarning(true));

    expect(mockAddEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    expect(mockPushState).toHaveBeenCalledWith(null, '', '/game');
  });

  it('should remove event listeners on unmount', () => {
    const { unmount } = renderHook(() => usePageLeaveWarning(true));

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
  });

  it('should update event listeners when shouldWarn changes', () => {
    const { rerender } = renderHook(
      ({ shouldWarn }) => usePageLeaveWarning(shouldWarn),
      { initialProps: { shouldWarn: false } }
    );

    expect(mockAddEventListener).not.toHaveBeenCalled();

    rerender({ shouldWarn: true });

    expect(mockAddEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
  });

  it('should handle beforeunload event when shouldWarn is true', () => {
    let beforeUnloadHandler;
    mockAddEventListener.mockImplementation((event, handler) => {
      if (event === 'beforeunload') {
        beforeUnloadHandler = handler;
      }
    });

    renderHook(() => usePageLeaveWarning(true));

    const mockEvent = {
      preventDefault: jest.fn(),
      returnValue: null,
    };

    const result = beforeUnloadHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.returnValue).toBe("Are you sure you want to leave? You're in the middle of a game and other players are counting on you!");
    expect(result).toBe("Are you sure you want to leave? You're in the middle of a game and other players are counting on you!");
  });

  it('should use custom message in beforeunload event', () => {
    let beforeUnloadHandler;
    mockAddEventListener.mockImplementation((event, handler) => {
      if (event === 'beforeunload') {
        beforeUnloadHandler = handler;
      }
    });

    const customMessage = "Custom warning message";
    renderHook(() => usePageLeaveWarning(true, customMessage));

    const mockEvent = {
      preventDefault: jest.fn(),
      returnValue: null,
    };

    const result = beforeUnloadHandler(mockEvent);

    expect(mockEvent.returnValue).toBe(customMessage);
    expect(result).toBe(customMessage);
  });

  it('should not prevent beforeunload when shouldWarn is false', () => {
    let beforeUnloadHandler;
    mockAddEventListener.mockImplementation((event, handler) => {
      if (event === 'beforeunload') {
        beforeUnloadHandler = handler;
      }
    });

    const { rerender } = renderHook(
      ({ shouldWarn }) => usePageLeaveWarning(shouldWarn),
      { initialProps: { shouldWarn: true } }
    );

    rerender({ shouldWarn: false });

    const mockEvent = {
      preventDefault: jest.fn(),
      returnValue: null,
    };

    const result = beforeUnloadHandler(mockEvent);

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('should handle popstate event when shouldWarn is true and user confirms', () => {
    let popstateHandler;
    mockAddEventListener.mockImplementation((event, handler) => {
      if (event === 'popstate') {
        popstateHandler = handler;
      }
    });

    mockConfirm.mockReturnValue(true);

    renderHook(() => usePageLeaveWarning(true));

    const mockEvent = {};
    popstateHandler(mockEvent);

    expect(mockConfirm).toHaveBeenCalledWith("Are you sure you want to leave? You're in the middle of a game and other players are counting on you!");
    expect(mockPushState).toHaveBeenCalledTimes(1); // Only initial call
  });

  it('should handle popstate event when shouldWarn is true and user cancels', () => {
    let popstateHandler;
    mockAddEventListener.mockImplementation((event, handler) => {
      if (event === 'popstate') {
        popstateHandler = handler;
      }
    });

    mockConfirm.mockReturnValue(false);

    renderHook(() => usePageLeaveWarning(true));

    const mockEvent = {};
    popstateHandler(mockEvent);

    expect(mockConfirm).toHaveBeenCalledWith("Are you sure you want to leave? You're in the middle of a game and other players are counting on you!");
    expect(mockPushState).toHaveBeenCalledTimes(2); // Initial call + preventing navigation
  });

  it('should use custom message in popstate event', () => {
    let popstateHandler;
    mockAddEventListener.mockImplementation((event, handler) => {
      if (event === 'popstate') {
        popstateHandler = handler;
      }
    });

    const customMessage = "Custom warning message";
    mockConfirm.mockReturnValue(true);

    renderHook(() => usePageLeaveWarning(true, customMessage));

    const mockEvent = {};
    popstateHandler(mockEvent);

    expect(mockConfirm).toHaveBeenCalledWith(customMessage);
  });

  it('should not show confirm dialog in popstate when shouldWarn is false', () => {
    let popstateHandler;
    mockAddEventListener.mockImplementation((event, handler) => {
      if (event === 'popstate') {
        popstateHandler = handler;
      }
    });

    const { rerender } = renderHook(
      ({ shouldWarn }) => usePageLeaveWarning(shouldWarn),
      { initialProps: { shouldWarn: true } }
    );

    rerender({ shouldWarn: false });

    const mockEvent = {};
    popstateHandler(mockEvent);

    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('should return confirmLeave function', () => {
    const { result } = renderHook(() => usePageLeaveWarning(true));

    expect(result.current).toHaveProperty('confirmLeave');
    expect(typeof result.current.confirmLeave).toBe('function');
  });

  it('should return true from confirmLeave when shouldWarn is false', () => {
    const { result } = renderHook(() => usePageLeaveWarning(false));

    const confirmed = result.current.confirmLeave();

    expect(confirmed).toBe(true);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('should return confirm result from confirmLeave when shouldWarn is true', () => {
    mockConfirm.mockReturnValue(true);
    const { result } = renderHook(() => usePageLeaveWarning(true));

    const confirmed = result.current.confirmLeave();

    expect(confirmed).toBe(true);
    expect(mockConfirm).toHaveBeenCalledWith("Are you sure you want to leave? You're in the middle of a game and other players are counting on you!");
  });

  it('should return false from confirmLeave when user cancels', () => {
    mockConfirm.mockReturnValue(false);
    const { result } = renderHook(() => usePageLeaveWarning(true));

    const confirmed = result.current.confirmLeave();

    expect(confirmed).toBe(false);
    expect(mockConfirm).toHaveBeenCalledWith("Are you sure you want to leave? You're in the middle of a game and other players are counting on you!");
  });

  it('should use custom message in confirmLeave', () => {
    const customMessage = "Custom warning message";
    mockConfirm.mockReturnValue(true);
    const { result } = renderHook(() => usePageLeaveWarning(true, customMessage));

    result.current.confirmLeave();

    expect(mockConfirm).toHaveBeenCalledWith(customMessage);
  });

  it('should update confirmLeave when message changes', () => {
    const initialMessage = "Initial message";
    const updatedMessage = "Updated message";
    mockConfirm.mockReturnValue(true);
    
    const { result, rerender } = renderHook(
      ({ message }) => usePageLeaveWarning(true, message),
      { initialProps: { message: initialMessage } }
    );

    result.current.confirmLeave();
    expect(mockConfirm).toHaveBeenCalledWith(initialMessage);

    rerender({ message: updatedMessage });
    result.current.confirmLeave();
    expect(mockConfirm).toHaveBeenCalledWith(updatedMessage);
  });

  it('should handle undefined message gracefully', () => {
    mockConfirm.mockReturnValue(true);
    const { result } = renderHook(() => usePageLeaveWarning(true, undefined));

    result.current.confirmLeave();

    expect(mockConfirm).toHaveBeenCalledWith("Are you sure you want to leave? You're in the middle of a game and other players are counting on you!");
  });

  it('should handle empty message gracefully', () => {
    mockConfirm.mockReturnValue(true);
    const { result } = renderHook(() => usePageLeaveWarning(true, ""));

    result.current.confirmLeave();

    expect(mockConfirm).toHaveBeenCalledWith("Are you sure you want to leave? You're in the middle of a game and other players are counting on you!");
  });

  it('should clean up properly when message changes', () => {
    const { rerender } = renderHook(
      ({ message }) => usePageLeaveWarning(true, message),
      { initialProps: { message: "Initial message" } }
    );

    rerender({ message: "Updated message" });

    expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
  });
});