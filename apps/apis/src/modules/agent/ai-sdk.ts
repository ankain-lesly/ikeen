import type { Tool, ToolExecuteFunction } from 'ai';

/**
 * Universal Context definition for tools.
 */
export type ToolContext = Record<string, unknown>;

/**
 * Type-level identity tool definition helper.
 * Mirrors Vercel AI SDK's tool() helper without triggering synchronous CommonJS require('ai') at startup.
 */
export function tool<INPUT, OUTPUT, CONTEXT extends ToolContext>(
  toolDef: Tool<INPUT, OUTPUT, CONTEXT> & {
    execute: ToolExecuteFunction<INPUT, OUTPUT, CONTEXT>;
  },
): Tool<INPUT, OUTPUT, CONTEXT> & {
  execute: ToolExecuteFunction<INPUT, OUTPUT, CONTEXT>;
};
export function tool<INPUT, OUTPUT, CONTEXT extends ToolContext>(
  toolDef: Tool<INPUT, OUTPUT, CONTEXT>,
): Tool<INPUT, OUTPUT, CONTEXT>;
export function tool<INPUT, CONTEXT extends ToolContext>(
  toolDef: Tool<INPUT, never, CONTEXT>,
): Tool<INPUT, never, CONTEXT>;
export function tool<OUTPUT, CONTEXT extends ToolContext>(
  toolDef: Tool<never, OUTPUT, CONTEXT>,
): Tool<never, OUTPUT, CONTEXT>;
export function tool<CONTEXT extends ToolContext>(
  toolDef: Tool<never, never, CONTEXT>,
): Tool<never, never, CONTEXT>;
export function tool<T>(toolDef: T): T {
  return toolDef;
}

/**
 * Dynamic ESM importer that prevents Webpack/Babel from transforming import()
 * into a synchronous CommonJS require() in the compiled bundle.
 */
const dynamicImport = new Function(
  'modulePath',
  'return import(modulePath)',
) as <T>(modulePath: string) => Promise<T>;

/**
 * Cached dynamic loader for the pure ESM 'ai' package.
 * Guarantees zero ERR_REQUIRE_ESM crashes when loaded by CommonJS runtimes (e.g. Node/Lambda/Prisma Compute).
 */
let aiSdkPromise: Promise<typeof import('ai')> | null = null;
export async function loadAiSdk(): Promise<typeof import('ai')> {
  if (!aiSdkPromise) {
    aiSdkPromise = dynamicImport<typeof import('ai')>('ai');
  }
  return aiSdkPromise;
}
