declare module "bun:test" {
  export interface Matchers<T = unknown> {
    toBe(expected: T): void;
    toEqual(expected: unknown): void;
    toMatchObject(expected: Record<string, unknown>): void;
    toHaveLength(expected: number): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeDefined(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toContain(expected: unknown): void;
    toThrow(expected?: string | RegExp | Error): void;
    not: Matchers<T>;
  }

  export function describe(label: string, fn: () => void): void;
  export function test(label: string, fn: () => void | Promise<void>): void;
  export function it(label: string, fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function expect<T>(actual: T): Matchers<T>;
}
