import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminActivityEventListResponse,
  AdminOverviewSummaryResponse,
  HealthResponse,
  MetricsResponse,
  getAdminActivityEvents,
  getAdminOverviewSummary,
  getHealth,
  getMetrics
} from '../lib/adminApi';
import { buildOperationalSignals } from '../lib/monitoringSignals';

type OverviewState = {
  health: HealthResponse | null;
  metrics: MetricsResponse | null;
  summary: AdminOverviewSummaryResponse | null;
  activity: AdminActivityEventListResponse | null;
};

function formatRelative(iso: string | null | undefined) {
  if (!iso) return '-';
  const deltaSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHour = Math.floor(deltaMin / 60);
  if (deltaHour < 24) return `${deltaHour}h ago`;
  const deltaDay = Math.floor(deltaHour / 24);
  return `${deltaDay}d ago`;
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

function resolveActivityTone(statusTo: string | null) {
  if (!statusTo) {
    return 'info';
  }
  if (statusTo === 'REJECTED') {
    return 'danger';
  }
  if (statusTo === 'MANUAL_REVIEW' || statusTo === 'IN_REVIEW' || statusTo === 'INTERVIEW') {
    return 'warn';
  }
  if (statusTo === 'VERIFIED' || statusTo === 'HIRED') {
    return '';
  }
  return 'info';
}

function resolveActivityActor(item: {
  type: string;
  applicant?: { fullName: string | null; email: string | null };
  actorId?: string | null;
}) {
  if (item.type === 'APPLICATION') {
    return item.applicant?.fullName || item.applicant?.email || item.actorId || 'Applicant';
  }
  return item.actorId || 'System';
}

export function OverviewPage() {
  const [state, setState] = useState<OverviewState>({
    health: null,
    metrics: null,
    summary: null,
    activity: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const [health, metrics, summary, activity] = await Promise.all([
        getHealth(),
        getMetrics(),
        getAdminOverviewSummary(),
        getAdminActivityEvents({ type: 'ALL', limit: 50 })
      ]);

      setState({
        health,
        metrics,
        summary,
        activity
      });
      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load dashboard overview';
      setError(message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    const timer = window.setInterval(() => {
      void loadOverview(true);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [loadOverview]);

  const statusCounts = useMemo(() => {
    return {
      pending: Number(state.summary?.pendingKyc || 0),
      manualReview: Number(state.summary?.manualReviewKyc || 0),
      verified: Number(state.summary?.verifiedToday || 0),
      rejected: Number(state.summary?.rejectedToday || 0)
    };
  }, [state.summary]);

  const activities = useMemo(() => {
    const items = (state.activity?.items || []).slice(0, 6).map((item) => ({
      id: item.id,
      actor: resolveActivityActor(item),
      time: formatRelative(item.createdAt),
      detail: item.description,
      tone: resolveActivityTone(item.statusTo)
    }));

    if (items.length > 0) {
      return items;
    }

    return [
      {
        id: 'fallback',
        actor: 'System',
        time: '-',
        detail: loading ? 'Loading activity timeline...' : 'No activity found yet.',
        tone: 'info'
      }
    ];
  }, [loading, state.activity]);

  const avgLatency = useMemo(() => {
    if (!state.metrics || state.metrics.routes.length === 0) {
      return 0;
    }
    const total = state.metrics.routes.reduce((sum, route) => sum + route.avgDurationMs, 0);
    return Math.round(total / state.metrics.routes.length);
  }, [state.metrics]);

  const operationalSignals = useMemo(
    () =>
      buildOperationalSignals({
        metrics: state.metrics,
        summary: state.summary,
        activity: state.activity
      }),
    [state.activity, state.metrics, state.summary]
  );

  const databaseLoad = useMemo(() => {
    if (!state.metrics || state.metrics.totalRequests === 0) {
      return 0;
    }

    const ratio = state.metrics.totalErrors / state.metrics.totalRequests;
    return Math.min(100, Math.max(1, Math.round(ratio * 8000)));
  }, [state.metrics]);

  return (
    <div className="page-grid">
      <section className="surface-card page-section">
        <div className="feed-page-head">
          <div>
            <h3>Overview</h3>
            <p>Operational clarity across trust, moderation, and system state.</p>
            <small>Updated {formatRelative(lastUpdatedAt)}</small>
          </div>
          <div className="feed-actions">
            <button type="button" className="btn-secondary" onClick={() => void loadOverview(true)}>
              Refresh
            </button>
            {error ? (
              <button type="button" className="btn-danger" onClick={() => void loadOverview()}>
                Retry
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="surface-card page-section">
        <header>
          <div>
            <h3>Operational Alerts</h3>
            <p>Actionable health signals from API, queue pressure, and moderation activity.</p>
          </div>
        </header>
        <div className="signal-grid">
          {operationalSignals.map((signal) => (
            <article key={signal.id} className={`signal-card ${signal.severity}`}>
              <p>{signal.severity.toUpperCase()}</p>
              <strong>{signal.title}</strong>
              <span>{signal.description}</span>
            </article>
          ))}
        </div>
      </section>

      <div className="kpi-grid">
        <article className="kpi-card warning">
          <p>Pending KYC</p>
          <strong>{loading ? '...' : String(statusCounts.pending)}</strong>
          <span>status SUBMITTED</span>
        </article>
        <article className="kpi-card">
          <p>Manual Review</p>
          <strong>{loading ? '...' : String(statusCounts.manualReview)}</strong>
          <span>status MANUAL_REVIEW</span>
        </article>
        <article className="kpi-card success">
          <p>Verified Today</p>
          <strong>{loading ? '...' : String(statusCounts.verified)}</strong>
          <span>today (UTC)</span>
        </article>
        <article className="kpi-card danger">
          <p>Rejected Today</p>
          <strong>{loading ? '...' : String(statusCounts.rejected)}</strong>
          <span>today (UTC)</span>
        </article>
      </div>

      <div className="overview-grid">
        <section className="surface-card activity-panel">
          <div className="activity-panel-head">
            <h3>Activity Timeline</h3>
            <button type="button">View all</button>
          </div>

          <ul className="activity-timeline">
            {activities.map((item) => (
              <li key={item.id} className="activity-item">
                <span className={`activity-dot ${item.tone}`.trim()} />
                <div className="activity-meta">
                  <strong>{item.actor}</strong>
                  <span>{item.time}</span>
                </div>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="side-stack">
          <section className="surface-card health-card">
            <div className="card-head">
              <h3>System Health</h3>
              <span className="health-pill">{state.health?.status || 'Unknown'}</span>
            </div>

            <div className="metric-line">
              <div className="metric-line-head">
                <span>API Response Time</span>
                <strong>{loading ? '...' : `${avgLatency}ms`}</strong>
              </div>
              <div className="metric-track">
                <span style={{ width: `${Math.min(100, Math.max(5, Math.round((avgLatency / 200) * 100)))}%` }} />
              </div>
            </div>

            <div className="metric-line">
              <div className="metric-line-head">
                <span>Estimated Error Load</span>
                <strong>{loading ? '...' : `${databaseLoad}%`}</strong>
              </div>
              <div className="metric-track">
                <span style={{ width: `${databaseLoad}%`, background: '#4f8df5' }} />
              </div>
            </div>

            <div className="metric-line">
              <div className="metric-line-head">
                <span>Total Requests</span>
                <strong>{state.metrics ? formatCompact(state.metrics.totalRequests) : '...'}</strong>
              </div>
            </div>

            <div className="metric-line">
              <div className="metric-line-head">
                <span>Applications</span>
                <strong>{state.summary ? formatCompact(state.summary.activeApplications) : '...'}</strong>
              </div>
            </div>

            <div className="sparkline" />
          </section>

          <section className="surface-card quick-card">
            <div className="card-head">
              <h3>Quick Actions</h3>
            </div>
            <div className="quick-grid">
              <button type="button">Create Job</button>
              <button type="button">Create Post</button>
              <button type="button">Open Queue</button>
              <button type="button">Metrics</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
