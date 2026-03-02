import { useEffect, useMemo, useState } from 'react';
import {
  AdminKycReviewQueueResponse,
  HealthResponse,
  MetricsResponse,
  getAdminKycReviewQueue,
  getHealth,
  getMetrics
} from '../lib/adminApi';

type OverviewState = {
  health: HealthResponse | null;
  metrics: MetricsResponse | null;
  queue: AdminKycReviewQueueResponse | null;
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

export function OverviewPage() {
  const [state, setState] = useState<OverviewState>({
    health: null,
    metrics: null,
    queue: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [health, metrics, queue] = await Promise.all([
          getHealth(),
          getMetrics(),
          getAdminKycReviewQueue({ status: 'ALL', limit: 100 })
        ]);

        if (!active) {
          return;
        }

        setState({
          health,
          metrics,
          queue
        });
      } catch (err) {
        if (!active) {
          return;
        }

        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load dashboard overview';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const statusCounts = useMemo(() => {
    const initial = {
      pending: 0,
      manualReview: 0,
      verified: 0,
      rejected: 0
    };

    for (const item of state.queue?.items || []) {
      if (item.session.status === 'SUBMITTED') {
        initial.pending += 1;
      }
      if (item.session.status === 'MANUAL_REVIEW') {
        initial.manualReview += 1;
      }
      if (item.session.status === 'VERIFIED') {
        initial.verified += 1;
      }
      if (item.session.status === 'REJECTED') {
        initial.rejected += 1;
      }
    }

    return initial;
  }, [state.queue]);

  const activities = useMemo(() => {
    const items = [...(state.queue?.items || [])]
      .filter((item) => item.lastEvent)
      .sort((a, b) => {
        const left = new Date(a.lastEvent?.createdAt || a.session.updatedAt).getTime();
        const right = new Date(b.lastEvent?.createdAt || b.session.updatedAt).getTime();
        return right - left;
      })
      .slice(0, 4)
      .map((item) => {
        const lastEvent = item.lastEvent;
        const status = lastEvent?.toStatus || item.session.status;
        const actor = item.user?.fullName || item.user?.email || `Session ${item.session.id.slice(0, 8)}`;

        return {
          id: item.session.id,
          actor,
          time: formatRelative(lastEvent?.createdAt || item.session.updatedAt),
          detail:
            lastEvent?.reason ||
            `KYC status transitioned to ${status} (${item.riskFlags.length ? item.riskFlags.join(', ') : 'no risk flags'}).`,
          tone:
            status === 'REJECTED'
              ? 'danger'
              : status === 'MANUAL_REVIEW'
                ? 'warn'
                : status === 'VERIFIED'
                  ? ''
                  : 'info'
        };
      });

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
  }, [loading, state.queue]);

  const avgLatency = useMemo(() => {
    if (!state.metrics || state.metrics.routes.length === 0) {
      return 0;
    }
    const total = state.metrics.routes.reduce((sum, route) => sum + route.avgDurationMs, 0);
    return Math.round(total / state.metrics.routes.length);
  }, [state.metrics]);

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
          </div>
          {error ? (
            <button type="button" className="btn-danger" onClick={() => window.location.reload()}>
              Retry
            </button>
          ) : null}
        </div>
      </section>

      <div className="kpi-grid">
        <article className="kpi-card warning">
          <p>Pending KYC</p>
          <strong>{loading ? '...' : String(statusCounts.pending)}</strong>
          <span>{state.queue ? `${state.queue.count} in queue` : 'loading'}</span>
        </article>
        <article className="kpi-card">
          <p>Manual Review</p>
          <strong>{loading ? '...' : String(statusCounts.manualReview)}</strong>
          <span>status MANUAL_REVIEW</span>
        </article>
        <article className="kpi-card success">
          <p>Verified</p>
          <strong>{loading ? '...' : String(statusCounts.verified)}</strong>
          <span>status VERIFIED</span>
        </article>
        <article className="kpi-card danger">
          <p>Rejected</p>
          <strong>{loading ? '...' : String(statusCounts.rejected)}</strong>
          <span>status REJECTED</span>
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
