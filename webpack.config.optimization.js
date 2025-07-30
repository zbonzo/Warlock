/**
 * @fileoverview Webpack configuration for tree shaking optimization
 * Part of Phase 7 - Advanced Type Features & Optimization
 * Enables advanced tree shaking for better bundle size
 */

const path = require('path');

module.exports = {
  mode: 'production',
  
  // Enable tree shaking
  optimization: {
    usedExports: true,
    sideEffects: false,
    innerGraph: true,
    
    // Advanced tree shaking settings
    concatenateModules: true,
    providedExports: true,
    
    // Minification with tree shaking
    minimize: true,
    minimizer: [
      new (require('terser-webpack-plugin'))({
        terserOptions: {
          compress: {
            // Remove unused code
            dead_code: true,
            drop_debugger: true,
            drop_console: false, // Keep console for server
            
            // Advanced optimizations
            pure_funcs: [
              'console.debug',
              'console.trace'
            ],
            
            // Remove unused imports
            unused: true,
            
            // Inline single-use functions
            inline: 2
          },
          mangle: {
            // Mangle property names for better compression
            properties: {
              regex: /^_/
            }
          }
        },
        extractComments: false
      })
    ]
  },
  
  // Module resolution for better tree shaking
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'server'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@client': path.resolve(__dirname, 'client/src')
    },
    
    // Enable tree shaking for ES modules
    mainFields: ['es2015', 'module', 'main']
  },
  
  // Module rules for TypeScript
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                // Enable tree shaking for TypeScript
                module: 'esnext',
                moduleResolution: 'node',
                
                // Preserve imports for tree shaking analysis
                importsNotUsedAsValues: 'preserve',
                
                // Generate source maps for debugging
                sourceMap: process.env.NODE_ENV !== 'production'
              }
            }
          }
        ],
        exclude: /node_modules/
      }
    ]
  },
  
  // Package.json sideEffects configuration
  externals: {
    // Mark external dependencies
    'socket.io': 'socket.io',
    'express': 'express',
    'zod': 'zod'
  }
};

// Export configuration for different environments
module.exports.createConfig = (options = {}) => {
  const config = { ...module.exports };
  
  if (options.analyze) {
    const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
    config.plugins = config.plugins || [];
    config.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: 'bundle-analysis.html',
        openAnalyzer: false
      })
    );
  }
  
  if (options.client) {
    // Client-specific optimizations
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true
        }
      }
    };
  }
  
  return config;
};