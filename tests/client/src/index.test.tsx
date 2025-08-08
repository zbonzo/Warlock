/**
 * @fileoverview Tests for application entry point
 */
import React from 'react';
import { render } from '@testing-library/react';
import reportWebVitals from '../../../client/src/reportWebVitals';

// Mock ReactDOM
jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(() => ({
    render: jest.fn(),
  })),
}));

// Mock App component
jest.mock('../../../client/src/App', () => {
  return function MockApp() {
    return <div data-testid="app">Mock App</div>;
  };
});

// Mock reportWebVitals
jest.mock('../../../client/src/reportWebVitals');
const mockReportWebVitals = reportWebVitals as jest.MockedFunction<typeof reportWebVitals>;

// Mock global CSS import
jest.mock('../../../client/src/styles/global.css', () => ({}));

describe('index.tsx', () => {
  const originalGetElementById = document.getElementById;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock document.getElementById to return a root element
    document.getElementById = jest.fn().mockReturnValue(
      document.createElement('div')
    );
  });

  afterEach(() => {
    document.getElementById = originalGetElementById;
  });

  it('should render the app without crashing', () => {
    // Import the index file to trigger the initialization
    require('../../../client/src/index');

    // Verify that document.getElementById was called with 'root'
    expect(document.getElementById).toHaveBeenCalledWith('root');

    // Verify that reportWebVitals was called
    expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
  });

  it('should throw error when root element is not found', () => {
    // Mock getElementById to return null
    document.getElementById = jest.fn().mockReturnValue(null);

    // Clear the module cache so we can re-import
    jest.resetModules();

    // Expect the import to throw an error
    expect(() => {
      require('../../../client/src/index');
    }).toThrow('Failed to find the root element');
  });

  it('should call reportWebVitals on initialization', () => {
    // Clear modules and re-import to test fresh initialization
    jest.resetModules();
    require('../../../client/src/index');

    expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
    expect(mockReportWebVitals).toHaveBeenCalledWith();
  });
});
