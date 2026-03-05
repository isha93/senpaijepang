import type {
  AdminActivityEventListResponse,
  AdminOverviewSummaryResponse,
  MetricsResponse,
  MetricsRoute
} from './adminApi';

export type SignalSeverity = 'info' | 'warning' | 'critical';

export type OperationalSignal = {
  id: string;
  severity: SignalSeverity;
  title: string;
  description: string;
};

export function calculateErrorRate(metrics: MetricsResponse | null): number {
  if (!metrics || metrics.totalRequests <= 0) {
    return 0;
  }
  return Number(((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(2));
}

export function pickSlowestRoute(metrics: MetricsResponse | null): MetricsRoute | null {
  if (!metrics || !Array.isArray(metrics.routes) || metrics.routes.length === 0) {
    return null;
  }

  const sorted = [...metrics.routes].sort((left, right) => right.avgDurationMs - left.avgDurationMs);
  return sorted[0] || null;
}

export function buildMetricSignals(metrics: MetricsResponse | null): OperationalSignal[] {
  if (!metrics) {
    return [];
  }

  const signals: OperationalSignal[] = [];
  const errorRate = calculateErrorRate(metrics);

  if (metrics.totalRequests > 0 && errorRate >= 5) {
    signals.push({
      id: 'error-rate-critical',
      severity: 'critical',
      title: 'High API Error Rate',
      description: `Error rate is ${errorRate}% from ${metrics.totalRequests} requests.`
    });
  } else if (metrics.totalRequests > 0 && errorRate >= 2) {
    signals.push({
      id: 'error-rate-warning',
      severity: 'warning',
      title: 'Rising API Error Rate',
      description: `Error rate is ${errorRate}% from ${metrics.totalRequests} requests.`
    });
  }

  const slowest = pickSlowestRoute(metrics);
  if (slowest && slowest.avgDurationMs >= 1200) {
    signals.push({
      id: 'latency-critical',
      severity: 'critical',
      title: 'Critical Route Latency',
      description: `${slowest.method} ${slowest.route} averages ${slowest.avgDurationMs}ms.`
    });
  } else if (slowest && slowest.avgDurationMs >= 700) {
    signals.push({
      id: 'latency-warning',
      severity: 'warning',
      title: 'Slow API Route',
      description: `${slowest.method} ${slowest.route} averages ${slowest.avgDurationMs}ms.`
    });
  }

  return signals;
}

export function buildQueueSignals(summary: AdminOverviewSummaryResponse | null): OperationalSignal[] {
  if (!summary) {
    return [];
  }

  const signals: OperationalSignal[] = [];

  if (summary.pendingKyc >= 40) {
    signals.push({
      id: 'kyc-backlog-critical',
      severity: 'critical',
      title: 'KYC Queue Backlog',
      description: `${summary.pendingKyc} profiles are waiting in SUBMITTED status.`
    });
  } else if (summary.pendingKyc >= 20) {
    signals.push({
      id: 'kyc-backlog-warning',
      severity: 'warning',
      title: 'KYC Queue Growing',
      description: `${summary.pendingKyc} profiles are waiting in SUBMITTED status.`
    });
  }

  if (summary.manualReviewKyc >= 20) {
    signals.push({
      id: 'manual-review-warning',
      severity: 'warning',
      title: 'Manual Review Pile-up',
      description: `${summary.manualReviewKyc} profiles are stuck in MANUAL_REVIEW.`
    });
  }

  if (summary.pendingOrganizationVerification >= 15) {
    signals.push({
      id: 'org-verification-warning',
      severity: 'warning',
      title: 'Organization Verification Delays',
      description: `${summary.pendingOrganizationVerification} organizations are pending verification.`
    });
  }

  return signals;
}

export function buildActivitySignals(
  activity: AdminActivityEventListResponse | null,
  nowMs = Date.now()
): OperationalSignal[] {
  if (!activity || !Array.isArray(activity.items) || activity.items.length === 0) {
    return [
      {
        id: 'activity-empty',
        severity: 'warning',
        title: 'No Recent Activity',
        description: 'No admin activity has been recorded yet.'
      }
    ];
  }

  const latest = Date.parse(activity.items[0]?.createdAt || '');
  if (!Number.isFinite(latest)) {
    return [
      {
        id: 'activity-invalid-timestamp',
        severity: 'warning',
        title: 'Activity Timestamp Issue',
        description: 'Latest activity timestamp could not be parsed.'
      }
    ];
  }

  const ageSec = Math.max(0, Math.floor((nowMs - latest) / 1000));
  if (ageSec > 3600) {
    return [
      {
        id: 'activity-stale',
        severity: 'warning',
        title: 'Stale Operations Timeline',
        description: `No new activity in the last ${Math.floor(ageSec / 60)} minutes.`
      }
    ];
  }

  return [];
}

export function buildOperationalSignals(args: {
  metrics: MetricsResponse | null;
  summary: AdminOverviewSummaryResponse | null;
  activity: AdminActivityEventListResponse | null;
  nowMs?: number;
}): OperationalSignal[] {
  const all = [
    ...buildMetricSignals(args.metrics),
    ...buildQueueSignals(args.summary),
    ...buildActivitySignals(args.activity, args.nowMs)
  ];

  if (all.length === 0) {
    return [
      {
        id: 'ops-normal',
        severity: 'info',
        title: 'Operations Stable',
        description: 'No active operational risks detected.'
      }
    ];
  }

  return all.sort((left, right) => rank(right.severity) - rank(left.severity));
}

function rank(severity: SignalSeverity): number {
  switch (severity) {
    case 'critical':
      return 3;
    case 'warning':
      return 2;
    case 'info':
    default:
      return 1;
  }
}
