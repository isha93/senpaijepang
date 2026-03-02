import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useIsDesktop } from './useViewport';

type NavItem = {
  path: string;
  label: string;
  shortLabel: string;
  icon: string;
};

const navItems: NavItem[] = [
  { path: '/overview', label: 'Dashboard', shortLabel: 'Dash', icon: 'DB' },
  { path: '/kyc-review', label: 'KYC Queue', shortLabel: 'KYC', icon: 'KQ' },
  { path: '/jobs', label: 'Jobs', shortLabel: 'Jobs', icon: 'JB' },
  { path: '/feed', label: 'Feed Management', shortLabel: 'Feed', icon: 'FD' },
  { path: '/organizations', label: 'Organizations', shortLabel: 'Orgs', icon: 'OG' },
  { path: '/system', label: 'System Health', shortLabel: 'System', icon: 'SY' }
];

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/overview': {
    title: 'Overview',
    subtitle: 'Operational summary and health'
  },
  '/kyc-review': {
    title: 'KYC Review Queue',
    subtitle: 'Moderation and trust decisions'
  },
  '/jobs': {
    title: 'Jobs Management',
    subtitle: 'Catalog and publishing controls'
  },
  '/feed': {
    title: 'Feed Posts',
    subtitle: 'Manage content and public preview QA'
  },
  '/organizations': {
    title: 'Organizations',
    subtitle: 'Verification and compliance state'
  },
  '/system': {
    title: 'System Health',
    subtitle: 'Runtime metrics and service status'
  }
};

function resolveMeta(pathname: string) {
  const key = Object.keys(pageMeta).find((item) => pathname.startsWith(item));
  if (!key) {
    return pageMeta['/overview'];
  }
  return pageMeta[key];
}

function DesktopSidebar({ onLogout }: { onLogout: () => void }) {
  const auth = useAuth();

  return (
    <aside className="admin-sidebar desktop-only">
      <div className="admin-sidebar-top">
        <div className="brand-block">
          <div className="brand-mark">SJ</div>
          <div>
            <h1>SenpaiJepang</h1>
            <p className="brand-eyebrow">Admin Console</p>
          </div>
        </div>

        <nav className="side-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `side-nav-item ${isActive ? 'is-active' : ''}`}
            >
              <span className="side-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="admin-sidebar-footer">
        <p className="footer-user">{auth.user?.fullName || auth.user?.email || 'Admin user'}</p>
        <button onClick={onLogout}>Sign Out</button>
      </div>
    </aside>
  );
}

function MobileNav() {
  return (
    <nav className="mobile-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `mobile-nav-item ${isActive ? 'is-active' : ''}`}
        >
          <span>{item.icon}</span>
          <small>{item.shortLabel}</small>
        </NavLink>
      ))}
    </nav>
  );
}

export function DashboardLayout() {
  const auth = useAuth();
  const isDesktop = useIsDesktop();
  const location = useLocation();
  const meta = resolveMeta(location.pathname);

  return (
    <div className={`admin-shell ${isDesktop ? 'desktop' : 'mobile'}`}>
      {isDesktop ? <DesktopSidebar onLogout={auth.logout} /> : null}

      <section className="admin-main">
        <header className="main-header">
          <div className="main-header-left">
            <p className="main-header-label">Home / {meta.title}</p>
            <p className="main-header-subtitle">{meta.subtitle}</p>
          </div>
          <div className="main-header-actions">
            <label className="header-search">
              <input type="text" placeholder="Search commands or users" />
            </label>
            <span className="user-chip">{auth.user?.roles?.[0] || 'ADMIN'}</span>
            <button onClick={auth.logout}>Logout</button>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </section>

      {!isDesktop ? <MobileNav /> : null}
    </div>
  );
}
