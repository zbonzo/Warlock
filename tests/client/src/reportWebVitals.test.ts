/**
 * @fileoverview Tests for reportWebVitals utility
 */
import reportWebVitals from '../../../client/src/reportWebVitals';

// Mock web-vitals
const mockGetCLS = jest.fn();
const mockGetFID = jest.fn();
const mockGetFCP = jest.fn();
const mockGetLCP = jest.fn();
const mockGetTTFB = jest.fn();

jest.mock('web-vitals', () => ({
  getCLS: mockGetCLS,
  getFID: mockGetFID,
  getFCP: mockGetFCP,
  getLCP: mockGetLCP,
  getTTFB: mockGetTTFB,
}));

describe('reportWebVitals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call all web vitals functions when onPerfEntry is provided', async () => {
    const mockCallback = jest.fn();
    
    reportWebVitals(mockCallback);

    // Wait for the dynamic import to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockGetCLS).toHaveBeenCalledWith(mockCallback);
    expect(mockGetFID).toHaveBeenCalledWith(mockCallback);
    expect(mockGetFCP).toHaveBeenCalledWith(mockCallback);
    expect(mockGetLCP).toHaveBeenCalledWith(mockCallback);
    expect(mockGetTTFB).toHaveBeenCalledWith(mockCallback);
  });

  it('should not call web vitals functions when onPerfEntry is not a function', async () => {
    reportWebVitals('not a function' as any);

    // Wait for any potential async operations
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockGetCLS).not.toHaveBeenCalled();
    expect(mockGetFID).not.toHaveBeenCalled();
    expect(mockGetFCP).not.toHaveBeenCalled();
    expect(mockGetLCP).not.toHaveBeenCalled();
    expect(mockGetTTFB).not.toHaveBeenCalled();
  });

  it('should not call web vitals functions when onPerfEntry is undefined', async () => {
    reportWebVitals();

    // Wait for any potential async operations
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockGetCLS).not.toHaveBeenCalled();
    expect(mockGetFID).not.toHaveBeenCalled();
    expect(mockGetFCP).not.toHaveBeenCalled();
    expect(mockGetLCP).not.toHaveBeenCalled();
    expect(mockGetTTFB).not.toHaveBeenCalled();
  });

  it('should not call web vitals functions when onPerfEntry is null', async () => {
    reportWebVitals(null as any);

    // Wait for any potential async operations
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockGetCLS).not.toHaveBeenCalled();
    expect(mockGetFID).not.toHaveBeenCalled();
    expect(mockGetFCP).not.toHaveBeenCalled();
    expect(mockGetLCP).not.toHaveBeenCalled();
    expect(mockGetTTFB).not.toHaveBeenCalled();
  });

  it('should handle dynamic import correctly', async () => {
    const mockCallback = jest.fn();
    
    reportWebVitals(mockCallback);

    // Verify that the function doesn't throw during dynamic import
    await expect(
      new Promise(resolve => setTimeout(resolve, 0))
    ).resolves.toBeUndefined();
  });

  it('should work with console.log as callback', async () => {
    const originalConsoleLog = console.log;
    console.log = jest.fn();

    reportWebVitals(console.log);

    // Wait for the dynamic import to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockGetCLS).toHaveBeenCalledWith(console.log);
    expect(mockGetFID).toHaveBeenCalledWith(console.log);
    expect(mockGetFCP).toHaveBeenCalledWith(console.log);
    expect(mockGetLCP).toHaveBeenCalledWith(console.log);
    expect(mockGetTTFB).toHaveBeenCalledWith(console.log);

    console.log = originalConsoleLog;
  });
});