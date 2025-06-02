/**
 * @fileoverview Babel configuration for the server
 * Configures Babel and module aliases for consistent import paths
 */
const path = require('path');

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
  plugins: [
    [
      'module-resolver',
      {
        root: [path.resolve(__dirname)],
        alias: {
          '@config': path.resolve(__dirname, 'config'),
          '@controllers': path.resolve(__dirname, 'controllers'),
          '@middleware': path.resolve(__dirname, 'middleware'),
          '@models': path.resolve(__dirname, 'models'),
          '@services': path.resolve(__dirname, 'services'),
          '@utils': path.resolve(__dirname, 'utils'),
          '@shared': path.resolve(__dirname, 'shared'),
          '@messages': path.resolve(__dirname, 'config/messages/index.js'),
        },
      },
    ],
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
          },
        ],
      ],
    },
  },
};


