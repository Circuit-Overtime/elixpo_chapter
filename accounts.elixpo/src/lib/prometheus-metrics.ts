/**
 * Prometheus Metrics Service
 * Edge-compatible implementation that outputs Prometheus text format
 */

type Labels = Record<string, string>;

function labelString(labels: Labels): string {
  const pairs = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
  return pairs.length ? `{${pairs.join(',')}}` : '';
}

// --- Counter ---
class EdgeCounter {
  private counts = new Map<string, number>();
  constructor(private name: string, private help: string) {}

  inc(labels: Labels = {}, value = 1) {
    const key = JSON.stringify(labels);
    this.counts.set(key, (this.counts.get(key) ?? 0) + value);
  }

  labels(..._: string[]) {
    return { inc: (v = 1) => this.inc({}, v) };
  }

  text(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    for (const [key, val] of this.counts) {
      const labels = JSON.parse(key) as Labels;
      lines.push(`${this.name}${labelString(labels)} ${val}`);
    }
    return lines.join('\n');
  }
}

// --- Gauge ---
class EdgeGauge {
  private values = new Map<string, number>();
  constructor(private name: string, private help: string) {}

  set(value: number, labels: Labels = {}) {
    this.values.set(JSON.stringify(labels), value);
  }

  inc(labels: Labels = {}, value = 1) {
    const key = JSON.stringify(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + value);
  }

  labels(..._: string[]) {
    return { set: (v: number) => this.set(v), inc: (v = 1) => this.inc({}, v) };
  }

  text(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`];
    for (const [key, val] of this.values) {
      const labels = JSON.parse(key) as Labels;
      lines.push(`${this.name}${labelString(labels)} ${val}`);
    }
    return lines.join('\n');
  }
}

// --- Histogram ---
class EdgeHistogram {
  private observations: { labels: Labels; value: number }[] = [];
  constructor(private name: string, private help: string, private buckets: number[]) {}

  observe(value: number, labels: Labels = {}) {
    this.observations.push({ labels, value });
  }

  labels(..._: string[]) {
    return { observe: (v: number) => this.observe(v) };
  }

  text(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`];
    const grouped = new Map<string, number[]>();
    for (const { labels, value } of this.observations) {
      const key = JSON.stringify(labels);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(value);
    }
    for (const [key, values] of grouped) {
      const labels = JSON.parse(key) as Labels;
      const sum = values.reduce((a, b) => a + b, 0);
      const count = values.length;
      for (const le of [...this.buckets, Infinity]) {
        const leLabel = le === Infinity ? '+Inf' : String(le);
        const cnt = values.filter(v => v <= le).length;
        lines.push(`${this.name}_bucket${labelString({ ...labels, le: leLabel })} ${cnt}`);
      }
      lines.push(`${this.name}_sum${labelString(labels)} ${sum}`);
      lines.push(`${this.name}_count${labelString(labels)} ${count}`);
    }
    return lines.join('\n');
  }
}

// --- Registry ---
const metrics: Array<EdgeCounter | EdgeGauge | EdgeHistogram> = [];

function register<T extends EdgeCounter | EdgeGauge | EdgeHistogram>(m: T): T {
  metrics.push(m);
  return m;
}

// HTTP Request Metrics
export const httpRequestDuration = register(new EdgeHistogram(
  'http_request_duration_seconds',
  'Duration of HTTP requests in seconds',
  [0.1, 0.5, 1, 2, 5]
));

export const httpRequestCounter = register(new EdgeCounter(
  'http_requests_total',
  'Total number of HTTP requests'
));

// Authentication Metrics
export const authAttempts = register(new EdgeCounter(
  'auth_attempts_total',
  'Total authentication attempts'
));

export const activeUsers = register(new EdgeGauge(
  'active_users_total',
  'Total number of active users'
));

export const emailVerifications = register(new EdgeCounter(
  'email_verifications_total',
  'Total email verifications'
));

// OAuth Metrics
export const oauthRequestsCounter = register(new EdgeCounter(
  'oauth_requests_total',
  'Total OAuth requests'
));

export const oauthTokensIssued = register(new EdgeCounter(
  'oauth_tokens_issued_total',
  'Total OAuth tokens issued'
));

// API Key Metrics
export const apiKeyRequestsCounter = register(new EdgeCounter(
  'api_key_requests_total',
  'Total API key requests'
));

export const apiKeyRequestDuration = register(new EdgeHistogram(
  'api_key_request_duration_seconds',
  'API key request duration in seconds',
  [0.01, 0.05, 0.1, 0.5, 1]
));

// Database Metrics
export const dbQueryDuration = register(new EdgeHistogram(
  'db_query_duration_seconds',
  'Database query duration in seconds',
  [0.01, 0.05, 0.1, 0.5, 1]
));

export const dbConnections = register(new EdgeGauge(
  'db_connections_active',
  'Active database connections'
));

// Error Metrics
export const errorCounter = register(new EdgeCounter(
  'errors_total',
  'Total errors'
));

export const rateLimitExceeded = register(new EdgeCounter(
  'rate_limit_exceeded_total',
  'Rate limit exceeded count'
));

// Admin Metrics
export const adminActions = register(new EdgeCounter(
  'admin_actions_total',
  'Total admin actions performed'
));

export const adminActivityGauge = register(new EdgeGauge(
  'admin_activity_current',
  'Current admin activity level'
));

// Application Metrics
export const appRegistrations = register(new EdgeCounter(
  'app_registrations_total',
  'Total OAuth app registrations'
));

export const userRegistrations = register(new EdgeCounter(
  'user_registrations_total',
  'Total user registrations'
));

// System Metrics
export const uptime = register(new EdgeGauge(
  'system_uptime_seconds',
  'Application uptime in seconds'
));

export const systemMemoryUsage = register(new EdgeGauge(
  'system_memory_usage_bytes',
  'System memory usage in bytes'
));

// Webhook Metrics
export const webhookDispatchDuration = register(new EdgeHistogram(
  'webhook_dispatch_duration_seconds',
  'Webhook dispatch duration in seconds',
  [0.1, 0.5, 1, 2, 5]
));

export const webhookFailures = register(new EdgeCounter(
  'webhook_failures_total',
  'Total webhook failures'
));

// --- Helper functions ---
export async function getMetricsText(): Promise<string> {
  return metrics.map(m => m.text()).join('\n\n') + '\n';
}

export function recordHttpRequest(method: string, route: string, status: number, duration: number) {
  httpRequestDuration.observe(duration, { method, route, status: String(status) });
  httpRequestCounter.inc({ method, route, status: String(status) });
}

export function recordDbQuery(queryType: string, duration: number) {
  dbQueryDuration.observe(duration, { query_type: queryType });
}

export function recordError(errorType: string, endpoint: string) {
  errorCounter.inc({ error_type: errorType, endpoint });
}

export function recordAdminAction(action: string, resource: string, status: string) {
  adminActions.inc({ action, resource, status });
}

export function updateSystemMetrics() {
  // process is not available in edge runtime — omit
}
