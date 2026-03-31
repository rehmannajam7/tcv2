interface CustomMatchers<R = unknown> {
  toPointTo(renderNode: any): R;
  toHaveExitThatPointsTo(renderNode: any): R;
  toHaveInboundFrom(exit: any): R;
  toHaveExitWithDestination(): R;
  toHaveInboundConnections(): R;
  toHavePayload(action: string, payload: any): R;
  toHaveReduxActions(actions: string[]): R;
  toMatchSnapshot(snapshotName?: string): R;
  toBeUnique(): R;
}

// TODO: This was the only way that extending and using vitest globally worked, try to find a better way to do this in the future
declare module 'vitest' {
  const suite: typeof import('vitest')['suite'];
  const test: typeof import('vitest')['test'];
  const describe: typeof import('vitest')['describe'];
  const it: typeof import('vitest')['it'];
  const expectTypeOf: typeof import('vitest')['expectTypeOf'];
  const assertType: typeof import('vitest')['assertType'];
  const expect: typeof import('vitest')['expect'];
  const assert: typeof import('vitest')['assert'];
  const vitest: typeof import('vitest')['vitest'];
  const vi: typeof import('vitest')['vitest'];
  const beforeAll: typeof import('vitest')['beforeAll'];
  const afterAll: typeof import('vitest')['afterAll'];
  const beforeEach: typeof import('vitest')['beforeEach'];
  const afterEach: typeof import('vitest')['afterEach'];
  const onTestFailed: typeof import('vitest')['onTestFailed'];
  const onTestFinished: typeof import('vitest')['onTestFinished'];
  type Assertion<T = any> = CustomMatchers<T>;
  type AsymmetricMatchersContaining = CustomMatchers;
}

export {};
