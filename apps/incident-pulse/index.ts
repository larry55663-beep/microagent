import { CoreEngine, makeEvent } from '../../skeleton-core/index.js';

/** Determines the urgency tier assigned to a production alert. */
export type Severity = 'P0' | 'P1' | 'P2';

/** Describes the normalized alert fields required for deterministic triage. */
export type AlertPayload = {
  id: string;
  source: string;
  service: string;
  metric: string;
  value: number;
  threshold: number;
  durationMinutes: number;
  severity: string;
  affectedUsers: number;
  region: string;
};

/** Gives reviewers the decision, narrative, and executable response steps. */
export type IncidentResult = {
  severity: Severity;
  summary: string;
  playbook: string[];
  events: number;
};

type IncidentState = {
  stage: 'idle' | 'received' | 'triaged' | 'drafted';
  alert: AlertPayload | null;
  severity: Severity | null;
  summary: string;
  playbook: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];
  if (typeof value !== 'string' || value === '') throw new TypeError(`${key} is required`);
  return value;
};

const readNumber = (record: Record<string, unknown>, key: string): number => {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${key} must be a finite number`);
  }
  return value;
};

/** Parses a webhook-shaped alert before classification begins. */
export function parseAlert(document: unknown): AlertPayload {
  if (!isRecord(document)) throw new TypeError('alert must be an object');
  const threshold = readNumber(document, 'threshold');
  if (threshold <= 0) throw new TypeError('threshold must be positive');
  return {
    id: readString(document, 'id'),
    source: readString(document, 'source'),
    service: readString(document, 'service'),
    metric: readString(document, 'metric'),
    value: readNumber(document, 'value'),
    threshold,
    durationMinutes: readNumber(document, 'duration_minutes'),
    severity: readString(document, 'severity'),
    affectedUsers: readNumber(document, 'affected_users'),
    region: readString(document, 'region'),
  };
}

/** Applies severity, metric, and impact rules in a stable priority order. */
export function classifyAlert(alert: AlertPayload): Severity {
  const severity = alert.severity.toLowerCase();
  if (severity === 'critical' && alert.affectedUsers >= 10_000) return 'P0';
  if (severity === 'critical' || alert.affectedUsers >= 1_000) return 'P1';
  if (alert.value >= alert.threshold) return 'P1';
  return 'P2';
}

const summarize = (alert: AlertPayload): string => {
  const metric = alert.metric.includes('p99_latency') ? 'p99' : alert.metric;
  const unit = alert.metric.endsWith('_ms') ? 'ms' : '';
  const subject = metric === 'p99' ? 'Latency' : alert.metric;
  return `${subject} spike on ${alert.service} (${metric} > ${alert.threshold}${unit} for ${alert.durationMinutes}m)`;
};

const draftPlaybook = (alert: AlertPayload, severity: Severity): string[] => {
  if (severity === 'P0') {
    return [
      'Declare a major incident and page on-call SRE',
      'Roll back the last deploy',
      `Scale ${alert.service} to absorb traffic`,
      'Check upstream dependency health',
    ];
  }
  if (severity === 'P1') {
    return [
      'Check upstream dependency health',
      `Scale ${alert.service} to +2 replicas`,
      'Page on-call SRE',
    ];
  }
  return [
    'Inspect the latest deployment and dashboards',
    `Monitor ${alert.service} for 30 minutes`,
    'Open a non-urgent incident ticket',
  ];
};

const initialState: IncidentState = {
  stage: 'idle',
  alert: null,
  severity: null,
  summary: '',
  playbook: [],
};

/** Runs alert intake, triage, and playbook drafting as three engine events. */
export function runIncidentPulse(document: unknown): IncidentResult {
  const engine = new CoreEngine<IncidentState>(initialState);
  engine.on('alert.received', (state, event) => ({
    ...state,
    stage: 'received',
    alert: parseAlert(event.payload),
  }));
  engine.on('alert.triaged', (state) => {
    if (state.alert === null) throw new Error('alert must be received before triage');
    const severity = classifyAlert(state.alert);
    return { ...state, stage: 'triaged', severity, summary: summarize(state.alert) };
  });
  engine.on('playbook.drafted', (state) => {
    if (state.alert === null || state.severity === null) {
      throw new Error('alert must be triaged before drafting');
    }
    return {
      ...state,
      stage: 'drafted',
      playbook: draftPlaybook(state.alert, state.severity),
    };
  });

  engine.dispatch(makeEvent('alert.received', document, 0));
  engine.dispatch(makeEvent('alert.triaged', { rules: 'severity-metric-impact' }, 1));
  engine.dispatch(makeEvent('playbook.drafted', { format: 'ordered-steps' }, 2));
  const state = engine.getState();
  if (state.severity === null) throw new Error('triage produced no severity');
  return {
    severity: state.severity,
    summary: state.summary,
    playbook: state.playbook,
    events: engine.snapshot().events.length,
  };
}
