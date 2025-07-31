/**
 * @fileoverview Tests for useMediaQuery hook
 */
import { renderHook, act } from '@testing-library/react';
import useMediaQuery from '../../../client/src/hooks/useMediaQuery';

// Mock window.matchMedia
const mockMatchMedia = jest.fn();

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  });
});

beforeEach(() => {
  mockMatchMedia.mockClear();
});

describe('useMediaQuery', () => {
  describe('initialization', () => {
    it('should return false by default when matchMedia is not available', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(result.current).toBe(false);
    });

    it('should return initial match state from matchMedia', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(result.current).toBe(true);
    });

    it('should handle SSR environment gracefully', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
      expect(result.current).toBe(false);

      global.window = originalWindow;
    });
  });

  describe('media query listening', () => {
    it('should update when media query changes using addEventListener', () => {
      const addEventListenerSpy = jest.fn();
      const removeEventListenerSpy = jest.fn();

      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
      });

      const { result, unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));

      // Simulate media query change
      const changeHandler = addEventListenerSpy.mock.calls[0][1];
      act(() => {
        changeHandler({ matches: true });
      });

      expect(result.current).toBe(true);

      // Test cleanup
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('change', changeHandler);
    });

    it('should fallback to addListener/removeListener for older browsers', () => {
      const addListenerSpy = jest.fn();
      const removeListenerSpy = jest.fn();

      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: undefined,
        removeEventListener: undefined,
        addListener: addListenerSpy,
        removeListener: removeListenerSpy,
      });

      const { result, unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      expect(addListenerSpy).toHaveBeenCalledWith(expect.any(Function));

      // Simulate media query change
      const changeHandler = addListenerSpy.mock.calls[0][0];
      act(() => {
        changeHandler({ matches: true });
      });

      expect(result.current).toBe(true);

      // Test cleanup
      unmount();
      expect(removeListenerSpy).toHaveBeenCalledWith(changeHandler);
    });
  });

  describe('query variations', () => {
    it('should work with different media queries', () => {
      const queries = [
        '(max-width: 768px)',
        '(min-width: 1024px)',
        '(orientation: landscape)',
        'print'
      ];

      queries.forEach(query => {
        mockMatchMedia.mockReturnValue({
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        });

        const { result } = renderHook(() => useMediaQuery(query));
        expect(result.current).toBe(true);
        expect(mockMatchMedia).toHaveBeenCalledWith(query);
      });
    });

    it('should re-run effect when query changes', () => {
      const addEventListenerSpy = jest.fn();
      const removeEventListenerSpy = jest.fn();

      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
      });

      const { rerender } = renderHook(
        ({ query }) => useMediaQuery(query),
        { initialProps: { query: '(max-width: 768px)' } }
      );

      expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 768px)');

      // Change the query
      rerender({ query: '(max-width: 1024px)' });

      expect(mockMatchMedia).toHaveBeenCalledWith('(max-width: 1024px)');
      expect(removeEventListenerSpy).toHaveBeenCalled();
      expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle window being undefined during effect', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

      // Temporarily remove window during effect execution
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      // The hook should still work with the previous state
      expect(result.current).toBe(false);

      global.window = originalWindow;
    });

    it('should handle empty query string', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() => useMediaQuery(''));
      expect(result.current).toBe(false);
      expect(mockMatchMedia).toHaveBeenCalledWith('');
    });
  });
});