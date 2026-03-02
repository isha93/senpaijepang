import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../auth/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardLayout } from '../layout/DashboardLayout';
import { OverviewPage } from '../pages/OverviewPage';
import { KycReviewPage } from '../pages/KycReviewPage';
import { JobsAdminPage } from '../pages/JobsAdminPage';
import { FeedAdminPage } from '../pages/FeedAdminPage';
import { OrganizationsAdminPage } from '../pages/OrganizationsAdminPage';
import { SystemHealthPage } from '../pages/SystemHealthPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="kyc-review" element={<KycReviewPage />} />
        <Route path="jobs" element={<JobsAdminPage />} />
        <Route path="feed" element={<FeedAdminPage />} />
        <Route path="organizations" element={<OrganizationsAdminPage />} />
        <Route path="system" element={<SystemHealthPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}
