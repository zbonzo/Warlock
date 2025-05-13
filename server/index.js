/**
 * @fileoverview Entry point for the server application
 * Registers module aliases before any other code runs
 */

// Register module aliases - THIS MUST BE FIRST
require('module-alias/register');

// Start the server
require('./server');