import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      client: 'src/client.ts',
    },
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: [
      '@prisma/client',
      '@prisma/adapter-pg',
      'pg',
      'dotenv',
    ],
  },
  {
    entry: {
      index: 'src/index.ts',
      client: 'src/client.ts',
    },
    format: ['cjs'],
    dts: false,
    sourcemap: true,
    banner: {
      js: 'const import_meta_url = typeof document === "undefined" ? new URL("file:" + __filename).href : (document.currentScript && document.currentScript.src || new URL("main.js", document.baseURI).href);',
    },
    define: {
      'import.meta.url': 'import_meta_url',
    },
    external: [
      '@prisma/client',
      '@prisma/adapter-pg',
      'pg',
      'dotenv',
    ],
  },
]);
