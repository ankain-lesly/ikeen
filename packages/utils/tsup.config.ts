import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    logger: 'src/logger.ts',
    string: 'src/string.ts',
    date: 'src/date.ts',
    constants: 'src/constants.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
