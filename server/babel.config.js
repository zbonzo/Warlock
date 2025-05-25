/**
 * @fileoverview Babel configuration for the server
 * Configures Babel and module aliases for consistent import paths
 */
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
        root: ['./'],
        alias: {
          '@config': './config',
          '@controllers': './controllers',
          '@middleware': './middleware',
          '@models': './models',
          '@services': './services',
          '@utils': './utils',
          '@shared': './shared',
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
