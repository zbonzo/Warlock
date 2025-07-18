/**
 * @fileoverview Tests for useMediaQuery hook
 * Tests media query matching and responsive behavior
 */

import { renderHook, act } from '@testing-library/react';
import useMediaQuery from '@client/hooks/useMediaQuery';

// Mock matchMedia
const mockMatchMedia = {
  matches: false,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.defineProperty(window, 'matchMedia', {
  value: jest.fn(() => mockMatchMedia),
  writable: true,
});

describe('useMediaQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchMedia.matches = false;
    mockMatchMedia.addListener.mockClear();
    mockMatchMedia.removeListener.mockClear();
    mockMatchMedia.addEventListener.mockClear();
    mockMatchMedia.removeEventListener.mockClear();
  });

  it('should return false by default', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    expect(result.current).toBe(false);
  });

  it('should return true when media query matches', () => {
    mockMatchMedia.matches = true;
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    expect(result.current).toBe(true);
  });

  it('should call matchMedia with correct query', () => {
    const query = '(max-width: 768px)';
    renderHook(() => useMediaQuery(query));

    expect(window.matchMedia).toHaveBeenCalledWith(query);
  });

  it('should add event listener using addEventListener when available', () => {
    renderHook(() => useMediaQuery('(max-width: 768px)'));

    expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(mockMatchMedia.addListener).not.toHaveBeenCalled();
  });

  it('should use addListener fallback when addEventListener is not available', () => {
    mockMatchMedia.addEventListener = undefined;
    renderHook(() => useMediaQuery('(max-width: 768px)'));

    expect(mockMatchMedia.addListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should remove event listener using removeEventListener when available', () => {
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    unmount();

    expect(mockMatchMedia.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(mockMatchMedia.removeListener).not.toHaveBeenCalled();
  });

  it('should use removeListener fallback when removeEventListener is not available', () => {
    mockMatchMedia.removeEventListener = undefined;
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    unmount();

    expect(mockMatchMedia.removeListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should update matches when media query changes', () => {
    let changeHandler;
    mockMatchMedia.addEventListener.mockImplementation((event, handler) => {
      if (event === 'change') {
        changeHandler = handler;
      }
    });

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    expect(result.current).toBe(false);

    // Simulate media query change
    act(() => {
      changeHandler({ matches: true });
    });

    expect(result.current).toBe(true);
  });

  it('should handle multiple media query changes', () => {
    let changeHandler;
    mockMatchMedia.addEventListener.mockImplementation((event, handler) => {
      if (event === 'change') {
        changeHandler = handler;
      }
    });

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    expect(result.current).toBe(false);

    // First change
    act(() => {
      changeHandler({ matches: true });
    });
    expect(result.current).toBe(true);

    // Second change
    act(() => {
      changeHandler({ matches: false });
    });
    expect(result.current).toBe(false);

    // Third change
    act(() => {
      changeHandler({ matches: true });
    });
    expect(result.current).toBe(true);
  });

  it('should handle query changes', () => {
    const { result, rerender } = renderHook(
      ({ query }) => useMediaQuery(query),
      { initialProps: { query: '(max-width: 768px)' } }
    );

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)');

    rerender({ query: '(max-width: 1024px)' });

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 1024px)');
  });

  it('should cleanup event listeners when query changes', () => {
    const { rerender } = renderHook(
      ({ query }) => useMediaQuery(query),
      { initialProps: { query: '(max-width: 768px)' } }
    );

    expect(mockMatchMedia.addEventListener).toHaveBeenCalledTimes(1);

    rerender({ query: '(max-width: 1024px)' });

    expect(mockMatchMedia.removeEventListener).toHaveBeenCalledTimes(1);
    expect(mockMatchMedia.addEventListener).toHaveBeenCalledTimes(2);
  });

  it('should handle common mobile breakpoint', () => {
    mockMatchMedia.matches = true;
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    expect(result.current).toBe(true);
  });

  it('should handle common tablet breakpoint', () => {
    mockMatchMedia.matches = true;
    const { result } = renderHook(() => useMediaQuery('(max-width: 1024px)'));

    expect(result.current).toBe(true);
  });

  it('should handle min-width queries', () => {
    mockMatchMedia.matches = true;
    const { result } = renderHook(() => useMediaQuery('(min-width: 769px)'));

    expect(result.current).toBe(true);
  });

  it('should handle orientation queries', () => {
    mockMatchMedia.matches = true;
    const { result } = renderHook(() => useMediaQuery('(orientation: portrait)'));

    expect(result.current).toBe(true);
  });

  it('should handle complex media queries', () => {
    mockMatchMedia.matches = true;
    const { result } = renderHook(() => 
      useMediaQuery('(max-width: 768px) and (orientation: portrait)')
    );

    expect(result.current).toBe(true);
  });

  it('should handle prefers-color-scheme queries', () => {
    mockMatchMedia.matches = true;
    const { result } = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'));

    expect(result.current).toBe(true);
  });

  it('should handle prefers-reduced-motion queries', () => {
    mockMatchMedia.matches = true;
    const { result } = renderHook(() => useMediaQuery('(prefers-reduced-motion: reduce)'));

    expect(result.current).toBe(true);
  });

  it('should handle hover queries', () => {
    mockMatchMedia.matches = true;
    const { result } = renderHook(() => useMediaQuery('(hover: hover)'));

    expect(result.current).toBe(true);
  });

  it('should handle pointer queries', () => {
    mockMatchMedia.matches = true;
    const { result } = renderHook(() => useMediaQuery('(pointer: fine)'));

    expect(result.current).toBe(true);
  });

  it('should handle SSR environment gracefully', () => {
    // Mock window as undefined to simulate SSR
    const originalWindow = global.window;
    delete global.window;

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    expect(result.current).toBe(false);

    // Restore window
    global.window = originalWindow;
  });

  it('should handle empty query string', () => {
    mockMatchMedia.matches = true;
    const { result } = renderHook(() => useMediaQuery(''));

    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith('');
  });

  it('should handle invalid query string', () => {
    mockMatchMedia.matches = false;
    const { result } = renderHook(() => useMediaQuery('invalid-query'));

    expect(result.current).toBe(false);
    expect(window.matchMedia).toHaveBeenCalledWith('invalid-query');
  });

  it('should set initial matches state correctly', () => {
    mockMatchMedia.matches = true;
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    expect(result.current).toBe(true);
  });

  it('should handle simultaneous multiple media queries', () => {
    const { result: result1 } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    const { result: result2 } = renderHook(() => useMediaQuery('(max-width: 1024px)'));

    expect(result1.current).toBe(false);
    expect(result2.current).toBe(false);
    expect(window.matchMedia).toHaveBeenCalledTimes(2);
  });

  it('should handle window resize simulation', () => {
    let changeHandler;
    mockMatchMedia.addEventListener.mockImplementation((event, handler) => {
      if (event === 'change') {
        changeHandler = handler;
      }
    });

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    // Simulate window resize to below 768px
    act(() => {
      changeHandler({ matches: true });
    });

    expect(result.current).toBe(true);

    // Simulate window resize to above 768px
    act(() => {
      changeHandler({ matches: false });
    });

    expect(result.current).toBe(false);
  });

  it('should maintain state across re-renders', () => {
    const { result, rerender } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    expect(result.current).toBe(false);

    rerender();

    expect(result.current).toBe(false);
  });

  it('should handle browser compatibility edge cases', () => {
    // Test with both modern and legacy browser support
    mockMatchMedia.addEventListener = jest.fn();
    mockMatchMedia.removeEventListener = jest.fn();
    mockMatchMedia.addListener = jest.fn();
    mockMatchMedia.removeListener = jest.fn();

    const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    expect(mockMatchMedia.addEventListener).toHaveBeenCalled();
    expect(mockMatchMedia.addListener).not.toHaveBeenCalled();

    unmount();

    expect(mockMatchMedia.removeEventListener).toHaveBeenCalled();
    expect(mockMatchMedia.removeListener).not.toHaveBeenCalled();
  });
});