import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminUser,
  HealthResponse,
  MetricsResponse,
  createAdminUser,
  getAdminUsers,
  getHealth,
  getMetrics,
  updateAdminUser
} from '../lib/adminApi';
import { buildMetricSignals } from '../lib/monitoringSignals';

type HealthState = {
  health: HealthResponse | null;
  metrics: MetricsResponse | null;
};

type CreateAdminFormState = {
  fullName: string;
  email: string;
  password: string;
  rolesText: string;
};

const DEFAULT_CREATE_ADMIN_FORM: CreateAdminFormState = {
  fullName: '',
  email: '',
  password: '',
  rolesText: 'super_admin'
};

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

function toErrorMessage(error: unknown, fallback: string) {
  return typeof error === 'object' && error && 'message' in error
    ? String((error as { message: unknown }).message)
    : fallback;
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

function parseRoleCodes(raw: string) {
  return Array.from(
    new Set(
      String(raw || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function formatDateTime(iso: string) {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) {
    return '-';
  }
  return new Date(timestamp).toLocaleString('en-US');
}

export function SystemHealthPage() {
  const [state, setState] = useState<HealthState>({
    health: null,
    metrics: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminTotal, setAdminTotal] = useState(0);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);
  const [createAdminForm, setCreateAdminForm] = useState<CreateAdminFormState>(DEFAULT_CREATE_ADMIN_FORM);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const loadSystemHealth = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const [health, metrics] = await Promise.all([getHealth(), getMetrics()]);
      setState({
        health,
        metrics
      });
      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      const message = toErrorMessage(err, 'Failed to load system metrics');
      setError(message);
      setState({
        health: null,
        metrics: null
      });
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  const loadAdminAccounts = useCallback(async () => {
    setLoadingAdmins(true);
    setAdminError(null);

    try {
      const response = await getAdminUsers({ limit: 100 });
      setAdminUsers(response.items);
      setAdminTotal(response.pageInfo.total);
    } catch (err) {
      setAdminError(toErrorMessage(err, 'Failed to load admin accounts'));
      setAdminUsers([]);
      setAdminTotal(0);
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadSystemHealth(), loadAdminAccounts()]);
  }, [loadAdminAccounts, loadSystemHealth]);

  async function submitCreateAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreatingAdmin) {
      return;
    }

    setIsCreatingAdmin(true);
    setAdminActionMessage(null);
    setAdminError(null);

    try {
      const roles = parseRoleCodes(createAdminForm.rolesText);
      await createAdminUser({
        fullName: createAdminForm.fullName.trim(),
        email: createAdminForm.email.trim().toLowerCase(),
        password: createAdminForm.password,
        roles: roles.length > 0 ? roles : undefined
      });
      setCreateAdminForm(DEFAULT_CREATE_ADMIN_FORM);
      setAdminActionMessage('Admin account created.');
      await loadAdminAccounts();
    } catch (err) {
      setAdminError(toErrorMessage(err, 'Failed to create admin account'));
    } finally {
      setIsCreatingAdmin(false);
    }
  }

  async function resetAdminPassword(user: AdminUser) {
    const nextPassword = window.prompt(`Set new password for ${user.email}`);
    if (!nextPassword) {
      return;
    }
    setAdminActionMessage(null);
    setAdminError(null);
    try {
      await updateAdminUser(user.id, { password: nextPassword });
      setAdminActionMessage(`Password updated for ${user.email}.`);
    } catch (err) {
      setAdminError(toErrorMessage(err, 'Failed to reset password'));
    }
  }

  async function updateAdminRoles(user: AdminUser) {
    const input = window.prompt(`Set roles for ${user.email} (comma separated)`, user.roles.join(','));
    if (input === null) {
      return;
    }
    const roles = parseRoleCodes(input);
    if (roles.length === 0) {
      setAdminError('At least one role is required.');
      return;
    }
    setAdminActionMessage(null);
    setAdminError(null);
    try {
      await updateAdminUser(user.id, { roles });
      setAdminActionMessage(`Roles updated for ${user.email}.`);
      await loadAdminAccounts();
    } catch (err) {
      setAdminError(toErrorMessage(err, 'Failed to update roles'));
    }
  }

  useEffect(() => {
    void refreshAll();

    const timer = window.setInterval(() => {
      void loadSystemHealth(true);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [loadSystemHealth, refreshAll]);

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

  const metricSignals = useMemo(() => buildMetricSignals(state.metrics), [state.metrics]);

  return (
    <div className="page-grid">
      <section className="surface-card page-section">
        <header>
          <div>
            <h3>API Health</h3>
            <p>Runtime status from /health and /metrics</p>
            <small>Updated {formatDateTime(lastUpdatedAt || '')}</small>
          </div>
          <button type="button" className="btn-primary" onClick={() => void refreshAll()}>
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
            <h3>Runtime Alerts</h3>
            <p>Latency and error-rate based health signals for API runtime.</p>
          </div>
        </header>

        <div className="signal-grid">
          {(metricSignals.length > 0 ? metricSignals : [
            {
              id: 'runtime-normal',
              severity: 'info',
              title: 'Runtime Stable',
              description: 'No runtime anomalies detected from metrics.'
            }
          ]).map((signal) => (
            <article key={signal.id} className={`signal-card ${signal.severity}`}>
              <p>{signal.severity.toUpperCase()}</p>
              <strong>{signal.title}</strong>
              <span>{signal.description}</span>
            </article>
          ))}
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

      <section className="surface-card page-section">
        <header>
          <div>
            <h3>Admin Accounts</h3>
            <p>Create and maintain permanent dashboard admins without bootstrap env dependency.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => void loadAdminAccounts()}>
            Reload Admins
          </button>
        </header>

        {adminError ? <p className="auth-error">{adminError}</p> : null}
        {adminActionMessage ? <p className="inline-note">{adminActionMessage}</p> : null}

        <form className="job-form" onSubmit={submitCreateAdmin}>
          <div className="job-form-grid">
            <label>
              Full Name
              <input
                type="text"
                value={createAdminForm.fullName}
                onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, fullName: event.target.value }))}
                placeholder="Admin Senpai"
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={createAdminForm.email}
                onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="admin@senpaijepang.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={createAdminForm.password}
                onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Minimum 8 characters"
                required
              />
            </label>
            <label>
              Roles (comma separated)
              <input
                type="text"
                value={createAdminForm.rolesText}
                onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, rolesText: event.target.value }))}
                placeholder="super_admin,sdm"
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={isCreatingAdmin}>
              {isCreatingAdmin ? 'Creating...' : 'Create Admin Account'}
            </button>
          </div>
        </form>

        <div className="simple-table-card">
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>{user.roles.join(', ') || '-'}</td>
                    <td>{formatDateTime(user.createdAt)}</td>
                    <td className="action-cell">
                      <button type="button" onClick={() => void updateAdminRoles(user)}>
                        Set Roles
                      </button>
                      <button type="button" onClick={() => void resetAdminPassword(user)}>
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
                {!loadingAdmins && adminUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No admin accounts found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <p className="muted">Total admins: {adminTotal}</p>
      </section>
    </div>
  );
}
