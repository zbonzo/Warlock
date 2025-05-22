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
          '@config': './server/config',
          '@controllers': './server/controllers',
          '@middleware': './server/middleware',
          '@models': './server/models',
          '@services': './server/services',
          '@utils': './server/utils',
          '@shared': './server/shared',
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
