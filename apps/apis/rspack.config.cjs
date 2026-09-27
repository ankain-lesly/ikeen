module.exports = function (options) {
  return {
    ...options,
    target: 'node',
    externalsType: 'commonjs',
    externals: [
      function ({ request }, callback) {
        // Inline both internal packages AND pure ESM dependencies
        const shouldBundle =
          request?.startsWith('@repo/') || request === 'ai' || request?.startsWith('@openrouter/');

        if (shouldBundle) {
          return callback(); // Bundle into the artifact
        }

        // Keep standard node_modules external
        if (request && !request.startsWith('.') && !request.startsWith('/')) {
          return callback(null, `commonjs ${request}`);
        }

        callback();
      },
    ],
    output: {
      ...options.output,
      filename: 'main.js',
      chunkFormat: 'commonjs',
    },
  };
};
