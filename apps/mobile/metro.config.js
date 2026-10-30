const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const { withUniwindConfig } = require("uniwind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Only watch the mobile project and shared packages in the monorepo.
config.watchFolders = [
  projectRoot,
  path.resolve(monorepoRoot, "packages"),
];

// 2. Let Metro resolve packages from mobile node_modules and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Force Metro to resolve dependencies only from nodeModulesPaths (prevents duplicate React runtimes)
// config.resolver.disableHierarchicalLookup = true;

// 3. Configure SVG transformer for direct .svg file imports
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};
// Accept and Transform SVG Images
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg",
);
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

// Add SQL support for Drizzle 
config.resolver.sourceExts.push("sql");

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
  dtsFile: "./src/uniwind-types.d.ts",
});
