import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiBaseUrl } from '../lib/api';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await auth.login({ identifier, password });
      const target = (location.state as { from?: string } | null)?.from || '/overview';
      navigate(target, { replace: true });
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Login failed';
      setError(message);
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-brand">
          <span className="auth-brand-mark">SJ</span>
          <span>SenpaiJepang Admin</span>
        </div>
        <button type="button" className="auth-help" aria-label="help">
          ?
        </button>
      </header>

      <div>
        <div className="auth-card">
          <div className="auth-accent" />
          <div className="auth-body">
            <h1>Welcome Back</h1>
            <p className="auth-subtitle">
              Sign in to access the Operations Console
              {apiBaseUrl ? ` (${apiBaseUrl})` : ''}
            </p>

            <form onSubmit={onSubmit} className="auth-form">
              <label>
                Email Address
                <div className="auth-field">
                  <span>@</span>
                  <input
                    type="email"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="admin@senpaijepang.com"
                    required
                  />
                </div>
              </label>

              <label>
                <div className="auth-inline">
                  <span>Password</span>
                  <a href="#">Forgot password?</a>
                </div>
                <div className="auth-field">
                  <span>*</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                    required
                  />
                </div>
              </label>

              {error ? <p className="auth-error">{error}</p> : null}

              <button type="submit" disabled={auth.isLoading} className="auth-submit">
                {auth.isLoading ? 'Authenticating...' : 'Authenticate'}
              </button>
            </form>
          </div>
          <div className="auth-footer">Protected by SenpaiJepang IAM</div>
        </div>

        <div className="auth-status">
          <span className="auth-dot" />
          All Systems Operational
        </div>
      </div>

      <footer className="auth-page-footer">© 2026 SenpaiJepang Inc. Internal use only.</footer>

      <aside className="auth-toaster">
        <strong>Session Expired</strong>
        <p>Your security token has expired. Please re-authenticate to continue.</p>
        <div className="auth-toaster-actions">
          <button type="button" className="danger">
            Re-authenticate
          </button>
          <button type="button" className="muted">
            Dismiss
          </button>
        </div>
      </aside>
    </div>
  );
}
