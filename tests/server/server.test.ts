/**
 * @fileoverview Tests for server.ts main entry point
 */

import * as http from 'http';

// Mock all dependencies
jest.mock('express', () => {
  const mockApp = {
    use: jest.fn(),
    get: jest.fn()
  };
  return jest.fn(() => mockApp);
});

jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    engine: {
      on: jest.fn()
    },
    on: jest.fn()
  }))
}));

jest.mock('cors', () => jest.fn());

jest.mock('./config', () => ({
  port: 3001,
  corsOrigins: ['http://localhost:3000']
}));

jest.mock('./utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

// Mock controllers and routes
jest.mock('./routes/configRoutes', () => ({}));
jest.mock('./controllers/GameController', () => ({}));
jest.mock('./controllers/PlayerController', () => ({}));
jest.mock('./utils/errorHandler', () => ({
  withSocketErrorHandling: jest.fn()
}));
jest.mock('./middleware/socketValidation', () => ({
  SocketValidators: {},
  socketValidator: jest.fn()
}));
jest.mock('./services/gameService', () => ({
  games: new Map()
}));

// Mock http.createServer
const mockListen = jest.fn();
jest.mock('http', () => ({
  createServer: jest.fn(() => ({
    listen: mockListen
  }))
}));

describe('server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the require cache to ensure fresh imports
    jest.resetModules();
  });

  it('should create Express app and HTTP server', () => {
    require('../../server/server');

    expect(http.createServer).toHaveBeenCalled();
  });

  it('should start listening on configured port', () => {
    require('../../server/server');

    expect(mockListen).toHaveBeenCalledWith(3001, '0.0.0.0', expect.any(Function));
  });

  it('should handle process uncaught exceptions', () => {
    const mockProcessOn = jest.spyOn(process, 'on').mockImplementation();

    require('../../server/server');

    expect(mockProcessOn).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    expect(mockProcessOn).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));

    mockProcessOn.mockRestore();
  });
});
