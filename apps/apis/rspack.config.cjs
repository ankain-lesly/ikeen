const path = require('node:path');
const { builtinModules } = require('node:module');
const rspack = require('@rspack/core');
const nodeExternals = require('webpack-node-externals');

/** @type {import('@rspack/core').Configuration} */
module.exports = {
  entry: './src/main.ts',
  target: 'node',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  decorators: true,
                },
                transform: {
                  legacyDecorator: true,
                  decoratorMetadata: true,
                },
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  externals: [
    nodeExternals({
      // Inlines monorepo packages and pure ESM dependencies
      allowlist: [/^@repo\//, 'ai', /^@openrouter\//],
    }),
    ({ request }, callback) => {
      if (!request) return callback();
      const bare = request.startsWith('node:') ? request.slice(5) : request;
      if (builtinModules.includes(bare)) {
        return callback(null, `commonjs ${request}`);
      }
      callback();
    },
  ],
  plugins: [
    new rspack.IgnorePlugin({
      resourceRegExp: /^pg-native$/,
    }),
  ],
};
