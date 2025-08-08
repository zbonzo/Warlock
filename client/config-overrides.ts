import { addWebpackAlias, override } from 'customize-cra';
import * as path from 'path';

module.exports = override(
  addWebpackAlias({
    '@components': path.resolve(__dirname, 'src/components'),
    '@pages': path.resolve(__dirname, 'src/pages'),
    '@hooks': path.resolve(__dirname, 'src/hooks'),
    '@contexts': path.resolve(__dirname, 'src/contexts'),
    '@utils': path.resolve(__dirname, 'src/utils'),
    '@services': path.resolve(__dirname, 'src/services'),
    '@config': path.resolve(__dirname, 'src/config'),
    '@styles': path.resolve(__dirname, 'src/styles'),
  }),
  (config: any) => {
    // Ensure TypeScript entry point is resolved correctly
    config.entry = path.resolve(__dirname, 'src/index.tsx');
    return config;
  }
);