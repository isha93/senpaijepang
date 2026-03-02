import { useEffect, useState } from 'react';
import {
  AdminOrganizationListItem,
  OrganizationVerificationStatus,
  getAdminOrganizations,
  updateAdminOrganizationVerification
} from '../lib/adminApi';

type OrgTypeFilter = 'ALL' | 'TSK' | 'LPK' | 'EMPLOYER';
type VerificationFilter = 'ALL' | OrganizationVerificationStatus;

function mapStatusChip(status: OrganizationVerificationStatus | null) {
  if (status === 'VERIFIED') {
    return {
      className: 'verified',
      label: 'VERIFIED'
    };
  }
  if (status === 'REJECTED' || status === 'MISMATCH' || status === 'NOT_FOUND') {
    return {
      className: 'rejected',
      label: status
    };
  }
  if (!status) {
    return {
      className: 'neutral',
      label: 'NO_SUBMISSION'
    };
  }
  return {
    className: 'review',
    label: status
  };
}

export function OrganizationsAdminPage() {
  const [rows, setRows] = useState<AdminOrganizationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [orgType, setOrgType] = useState<OrgTypeFilter>('ALL');
  const [verificationStatus, setVerificationStatus] = useState<VerificationFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrgId, setUpdatingOrgId] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  async function loadOrganizations() {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminOrganizations({
        limit: 100,
        orgType: orgType === 'ALL' ? undefined : orgType,
        verificationStatus: verificationStatus === 'ALL' ? undefined : verificationStatus
      });
      setRows(result.items);
      setTotal(result.pageInfo.total);
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load organizations';
      setError(message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrganizations();
  }, [orgType, verificationStatus]);

  async function updateStatus(orgId: string, status: OrganizationVerificationStatus) {
    setUpdatingOrgId(orgId);
    setSubmitMessage(null);
    try {
      await updateAdminOrganizationVerification(orgId, {
        status,
        reasonCodes: status === 'REJECTED' ? ['manual_reject'] : undefined
      });
      setSubmitMessage(`Organization ${status.toLowerCase()} successfully.`);
      await loadOrganizations();
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : `Failed to mark ${status.toLowerCase()}`;
      setSubmitMessage(message);
    } finally {
      setUpdatingOrgId(null);
    }
  }

  return (
    <section className="surface-card page-section">
      <header>
        <div>
          <h3>Organizations Verification</h3>
          <p>{loading ? 'Loading organizations...' : `${rows.length} records loaded (${total} total)`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={orgType} onChange={(event) => setOrgType(event.target.value as OrgTypeFilter)}>
            <option value="ALL">All Types</option>
            <option value="TSK">TSK</option>
            <option value="LPK">LPK</option>
            <option value="EMPLOYER">EMPLOYER</option>
          </select>
          <select
            value={verificationStatus}
            onChange={(event) => setVerificationStatus(event.target.value as VerificationFilter)}
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">PENDING</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="MISMATCH">MISMATCH</option>
            <option value="NOT_FOUND">NOT_FOUND</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <button type="button" className="btn-primary" onClick={() => void loadOrganizations()}>
            Refresh
          </button>
        </div>
      </header>

      {error ? <p className="auth-error">{error}</p> : null}
      {submitMessage ? <p className="inline-note">{submitMessage}</p> : null}

      <div className="simple-table-card">
        <div className="table-wrap">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const status = mapStatusChip(item.verification?.status || null);
                const disabled = !item.verification || updatingOrgId === item.organization.id;

                return (
                  <tr key={item.organization.id}>
                    <td>{item.organization.name}</td>
                    <td>{item.organization.orgType}</td>
                    <td>{item.owner?.email || '-'}</td>
                    <td>
                      <span className={`status-chip ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="action-cell">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => void updateStatus(item.organization.id, 'VERIFIED')}
                      >
                        Mark VERIFIED
                      </button>
                      <button
                        type="button"
                        className="danger"
                        disabled={disabled}
                        onClick={() => void updateStatus(item.organization.id, 'REJECTED')}
                      >
                        Mark REJECTED
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>No organizations found for this filter.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
