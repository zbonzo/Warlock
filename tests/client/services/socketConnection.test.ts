/**
 * Regression test for the duplicate-connection bug: multiple components (and
 * React StrictMode's dev-only double-invoke) calling useSocket() independently
 * used to be able to each open a real socket.io connection before the other's
 * effect had a chance to cache its socket. getSocket() fixes this by being a
 * plain synchronous function — "check cache, else create" can't race the way
 * it could inside a per-component useEffect.
 */

const mockSocketInstances: any[] = [];

jest.mock('socket.io-client', () => ({
  io: jest.fn((url: string, _options: any) => {
    const instance = {
      url,
      connected: false,
      id: undefined,
      io: { on: jest.fn() },
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    mockSocketInstances.push(instance);
    return instance;
  }),
}));

import { getSocket } from '../../../client/src/services/socketConnection';

describe('getSocket singleton', () => {
  beforeEach(() => {
    mockSocketInstances.length = 0;
    jest.clearAllMocks();
  });

  // Each test uses its own URL — the module-level socket cache in
  // socketConnection.ts persists across tests within this file (module
  // caching), so reusing a URL across tests would just hit an earlier
  // test's cached socket rather than exercising a fresh scenario.

  it('returns the same socket instance across repeated calls for the same URL', () => {
    const first = getSocket('http://localhost:4001/test-repeated');
    const second = getSocket('http://localhost:4001/test-repeated');
    const third = getSocket('http://localhost:4001/test-repeated');

    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(mockSocketInstances.length).toBe(1);
  });

  it('simulates multiple components mounting close together without opening extra connections', () => {
    // Each "component" independently calls getSocket() — none of them should
    // trigger a second real io() call, regardless of order or how many there are.
    const url = 'http://localhost:4001/test-multi-mount';
    const fromAppTsx = getSocket(url);
    const fromJoinGamePage = getSocket(url);
    const fromStrictModeRemount = getSocket(url);

    expect(fromJoinGamePage).toBe(fromAppTsx);
    expect(fromStrictModeRemount).toBe(fromAppTsx);
    expect(mockSocketInstances.length).toBe(1);
  });

  it('creates separate sockets for genuinely different URLs', () => {
    const a = getSocket('http://localhost:4001/test-url-a');
    const b = getSocket('http://localhost:5000/test-url-b');

    expect(a).not.toBe(b);
    expect(mockSocketInstances.length).toBe(2);
  });
});
