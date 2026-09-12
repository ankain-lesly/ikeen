import typescriptParser from "@typescript-eslint/parser";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: "./tsconfig.json", // Point to your tsconfig.json
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
    },
    rules: {
      // Start with the recommended rules
      ...typescriptPlugin.configs["recommended"].rules,
      // ...typescriptPlugin.configs["recommended-requiring-type-checking"].rules,
      // --- Less Strict DX Customizations ---

      // Often too strict for DX, consider disabling or making warnings:
      "@typescript-eslint/no-explicit-any": "off", // Allows 'any' type
      "@typescript-eslint/explicit-module-boundary-types": "off", // Doesn't require explicit return types for exported functions
      "@typescript-eslint/no-non-null-assertion": "off", // Allows non-null assertions (!)
      "@typescript-eslint/no-unsafe-assignment": "off", // Allows unsafe assignments (from 'recommended-requiring-type-checking')
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unsafe-call": "off", // Allows unsafe calls (from 'recommended-requiring-type-checking')
      "@typescript-eslint/no-unsafe-member-access": "off", // Allows unsafe member access (from 'recommended-requiring-type-checking')
      "@typescript-eslint/no-unsafe-return": "off", // Allows unsafe returns (from 'recommended-requiring-type-checking')

      // Example of changing a rule to 'warn' instead of 'error':
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ], // Warns about unused vars, allows _ prefixed

      // Add or override specific rules here to further relax them.
      // For example, if you find specific recommended rules too annoying:
      // '@typescript-eslint/no-inferrable-types': 'off', // Allows explicit type annotations even when TypeScript can infer
      // '@typescript-eslint/prefer-as-const': 'off', // Doesn't enforce 'as const' for literal types
    },

    ignores: ["**/node_modules/*", "**/dist/*", "**/prisma/*"],
    // ignorePatterns: ["node_modules", "dist", "prisma"],
  },
];
