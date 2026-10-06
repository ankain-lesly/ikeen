import { builtinModules, createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const nodeExternals = require('webpack-node-externals');

export default function (options, rspack) {
  return {
    ...options,
    externals: [
      nodeExternals({
        importType: 'module',
        // Bundle internal monorepo packages directly into main.js
        allowlist: [/^@repo\//],
      }),
      // Externalize Node built-in modules (path, url, buffer, fs, etc.)
      ({ request }, callback) => {
        if (!request) return callback();
        const bare = request.startsWith('node:') ? request.slice(5) : request;
        if (builtinModules.includes(bare)) {
          return callback(null, `module ${request}`);
        }
        callback();
      },
    ],
  };
}
