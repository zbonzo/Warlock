/**
 * @fileoverview Application entry point
 * Renders the main App component to the DOM
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Load global styles
import './styles/global.css';

/**
 * Initialize the React application
 * 
 * Creates a root element and renders the App component
 * wrapped in React.StrictMode for development checks
 */
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

