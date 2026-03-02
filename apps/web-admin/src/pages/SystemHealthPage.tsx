import { useEffect, useMemo, useState } from 'react';
import { HealthResponse, MetricsResponse, getHealth, getMetrics } from '../lib/adminApi';

type HealthState = {
  health: HealthResponse | null;
  metrics: MetricsResponse | null;
};

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

function formatUptime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function SystemHealthPage() {
  const [state, setState] = useState<HealthState>({
    health: null,
    metrics: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [health, metrics] = await Promise.all([getHealth(), getMetrics()]);
      setState({
        health,
        metrics
      });
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load system metrics';
      setError(message);
      setState({
        health: null,
        metrics: null
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const errorRate = useMemo(() => {
    if (!state.metrics || state.metrics.totalRequests <= 0) {
      return 0;
    }
    return Number(((state.metrics.totalErrors / state.metrics.totalRequests) * 100).toFixed(2));
  }, [state.metrics]);

  const slowestRoutes = useMemo(
    () =>
      [...(state.metrics?.routes || [])]
        .sort((left, right) => right.avgDurationMs - left.avgDurationMs)
        .slice(0, 10),
    [state.metrics]
  );

  return (
    <div className="page-grid">
      <section className="surface-card page-section">
        <header>
          <div>
            <h3>API Health</h3>
            <p>Runtime status from /health and /metrics</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            Refresh
          </button>
        </header>

        {error ? <p className="auth-error">{error}</p> : null}

        <div className="kpi-grid">
          <article className="kpi-card success">
            <p>Service</p>
            <strong>{state.health?.service || 'api'}</strong>
            <span>status: {state.health?.status || (loading ? 'loading' : 'unknown')}</span>
          </article>
          <article className="kpi-card">
            <p>Total Requests</p>
            <strong>{state.metrics ? formatCompact(state.metrics.totalRequests) : '...'}</strong>
            <span>all routes</span>
          </article>
          <article className="kpi-card warning">
            <p>Total Errors</p>
            <strong>{state.metrics ? formatCompact(state.metrics.totalErrors) : '...'}</strong>
            <span>{loading ? 'calculating...' : `${errorRate}%`}</span>
          </article>
          <article className="kpi-card success">
            <p>Uptime</p>
            <strong>{state.metrics ? formatUptime(state.metrics.uptimeSec) : '...'}</strong>
            <span>{state.health?.version ? `v${state.health.version}` : 'runtime'}</span>
          </article>
        </div>
      </section>

      <section className="surface-card page-section">
        <header>
          <div>
            <h3>Slowest Routes</h3>
            <p>avg/min/max duration milliseconds</p>
          </div>
        </header>

        <div className="simple-table-card">
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Requests</th>
                  <th>Avg</th>
                  <th>Min</th>
                  <th>Max</th>
                </tr>
              </thead>
              <tbody>
                {slowestRoutes.map((row) => (
                  <tr key={`${row.method}-${row.route}`}>
                    <td>{`${row.method} ${row.route}`}</td>
                    <td>{row.count}</td>
                    <td>{row.avgDurationMs} ms</td>
                    <td>{row.minDurationMs} ms</td>
                    <td>{row.maxDurationMs} ms</td>
                  </tr>
                ))}
                {!loading && slowestRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No route metrics recorded yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
