import { CoreEngine, makeEvent } from '../../skeleton-core/index.js';

/** Gives reviewers one stable shape for every OpenAPI contract defect. */
export type SpecIssue = { path: string; rule: string; message: string };

/** Shows whether the event flow ended in validation or rejection. */
export type SpecSentinelResult = {
  stage: 'validated' | 'rejected';
  issues: SpecIssue[];
  events: number;
};

type SpecState = {
  stage: 'idle' | 'received' | 'validated' | 'rejected';
  document: unknown;
  issues: SpecIssue[];
};

const METHODS = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const declaredParameters = (value: unknown): Set<string> => {
  const names = new Set<string>();
  if (!Array.isArray(value)) return names;
  for (const parameter of value) {
    if (isRecord(parameter) && typeof parameter.name === 'string') {
      if (parameter.in === 'path') names.add(parameter.name);
    }
  }
  return names;
};

const pathParameterNames = (path: string): string[] =>
  Array.from(path.matchAll(/\{([^}]+)\}/g), (match) => match[1] ?? '');

/** Extracts deterministic OpenAPI defects without network access or a schema package. */
export function inspectSpec(document: unknown): SpecIssue[] {
  const issues: SpecIssue[] = [];
  if (!isRecord(document)) {
    return [{ path: '$', rule: 'RULE_INVALID_DOCUMENT', message: 'spec must be a JSON object' }];
  }
  if (typeof document.openapi !== 'string' || document.openapi.trim() === '') {
    issues.push({
      path: '$',
      rule: 'RULE_MISSING_OPENAPI_VERSION',
      message: 'openapi version field is required',
    });
  }
  if (!isRecord(document.paths) || Object.keys(document.paths).length === 0) {
    issues.push({
      path: '$',
      rule: 'RULE_EMPTY_PATHS',
      message: 'paths must be a non-empty object',
    });
    return issues;
  }

  for (const [path, pathItem] of Object.entries(document.paths)) {
    if (!isRecord(pathItem)) continue;
    const inherited = declaredParameters(pathItem.parameters);
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!METHODS.has(method) || !isRecord(operation)) continue;
      if (!isRecord(operation.responses) || Object.keys(operation.responses).length === 0) {
        issues.push({
          path,
          rule: 'RULE_MISSING_RESPONSES',
          message: `operation "${method}" has no responses`,
        });
      }
      const declared = new Set([...inherited, ...declaredParameters(operation.parameters)]);
      for (const name of pathParameterNames(path)) {
        if (!declared.has(name)) {
          issues.push({
            path,
            rule: 'RULE_MISSING_PARAM_DECL',
            message: `path parameter "${name}" not declared`,
          });
        }
      }
    }
  }
  return issues;
}

const initialState: SpecState = {
  stage: 'idle',
  document: null,
  issues: [],
};

/** Runs the OpenAPI gate through the shared event engine and reports its outcome. */
export function runSpecSentinel(document: unknown): SpecSentinelResult {
  const engine = new CoreEngine<SpecState>(initialState);
  let eventCount = 0;
  engine.on('spec.received', (state, event) => ({
    ...state,
    stage: 'received',
    document: event.payload,
  }));
  engine.on('spec.validated', (state) => ({
    ...state,
    stage: 'validated',
    issues: inspectSpec(state.document),
  }));
  engine.on('spec.rejected', (state) => ({ ...state, stage: 'rejected' }));

  const send = (event: ReturnType<typeof makeEvent>): void => {
    engine.dispatch(event);
    eventCount += 1;
  };
  send(makeEvent('spec.received', document, 0));
  send(makeEvent('spec.validated', { source: 'openapi' }, 1));
  if (engine.getState().issues.length > 0) {
    send(makeEvent('spec.rejected', { reason: 'contract-violations' }, 2));
  }
  const state = engine.getState();
  return {
    stage: state.stage === 'rejected' ? 'rejected' : 'validated',
    issues: state.issues,
    events: eventCount,
  };
}
