/**
 * @fileoverview Babel configuration for the server
 * Configures Babel and module aliases for consistent import paths
 */
import * as path from 'path';

interface BabelConfig {
  presets: Array<string | [string, Record<string, any>]>;
  plugins: Array<[string, Record<string, any>]>;
  env?: Record<string, Partial<BabelConfig>>;
}

const config: BabelConfig = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
    '@babel/preset-typescript',
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
        '@babel/preset-typescript',
      ],
    },
  },
};

export default config;
