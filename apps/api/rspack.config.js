import { builtinModules, createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const nodeExternals = require('webpack-node-externals');

export default function (options, rspack) {
  return {
    ...options,
    externals: [
      nodeExternals({
        importType: 'module',
        // Bundle internal monorepo packages and CJS MCP adapter directly into main.js
        allowlist: [/^@repo\//, '@rekog/mcp-nest', /^@rekog\//],
      }),
      // Externalize Node built-in modules (path, url, buffer, fs, etc.)
      ({ request }, callback) => {
        if (!request) return callback();
        if (request.includes('@rekog/mcp-nest')) {
          return callback(); // Tell Rspack to compile it into the bundle
        }
        const bare = request.startsWith('node:') ? request.slice(5) : request;
        if (builtinModules.includes(bare)) {
          return callback(null, `module ${request}`);
        }
        callback();
      },
    ],
  };
}
