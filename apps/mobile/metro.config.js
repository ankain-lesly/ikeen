const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Only watch the mobile project and shared packages in the monorepo.
// DO NOT watch monorepoRoot on Windows, as the watcher will attempt to recursively
// traverse root node_modules/.bun and .git, causing "Failed to start watch mode".
config.watchFolders = [
  projectRoot,
  path.resolve(monorepoRoot, "packages"),
];

// 2. Let Metro resolve packages from mobile node_modules and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
