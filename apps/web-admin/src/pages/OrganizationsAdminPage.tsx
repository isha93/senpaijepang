import { useCallback, useEffect, useState } from 'react';
import {
  AdminOrganizationListItem,
  OrganizationVerificationStatus,
  getAdminOrganizations,
  updateAdminOrganizationVerification
} from '../lib/adminApi';

type OrgTypeFilter = 'ALL' | 'TSK' | 'LPK' | 'EMPLOYER';
type VerificationFilter = 'ALL' | OrganizationVerificationStatus;
const PAGE_SIZE = 20;

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

function parseCursorValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const cursor = Number(value);
  if (!Number.isInteger(cursor) || cursor < 0) {
    return null;
  }
  return cursor;
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
  const [currentCursor, setCurrentCursor] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [cursorHistory, setCursorHistory] = useState<number[]>([]);

  const loadOrganizations = useCallback(async (cursor = 0) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminOrganizations({
        cursor,
        limit: PAGE_SIZE,
        orgType: orgType === 'ALL' ? undefined : orgType,
        verificationStatus: verificationStatus === 'ALL' ? undefined : verificationStatus
      });
      setRows(result.items);
      setTotal(result.pageInfo.total);
      const resolvedCursor = parseCursorValue(result.pageInfo.cursor) ?? cursor;
      setCurrentCursor(resolvedCursor);
      setNextCursor(parseCursorValue(result.pageInfo.nextCursor));
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load organizations';
      setError(message);
      setRows([]);
      setTotal(0);
      setCurrentCursor(cursor);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, [orgType, verificationStatus]);

  useEffect(() => {
    setCursorHistory([]);
    void loadOrganizations(0);
  }, [loadOrganizations]);

  function goToPreviousPage() {
    if (cursorHistory.length === 0 || loading) {
      return;
    }
    const targetCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((prev) => prev.slice(0, -1));
    void loadOrganizations(targetCursor);
  }

  function goToNextPage() {
    if (nextCursor === null || loading) {
      return;
    }
    setCursorHistory((prev) => [...prev, currentCursor]);
    void loadOrganizations(nextCursor);
  }

  async function updateStatus(orgId: string, status: OrganizationVerificationStatus) {
    setUpdatingOrgId(orgId);
    setSubmitMessage(null);
    try {
      await updateAdminOrganizationVerification(orgId, {
        status,
        reasonCodes: status === 'REJECTED' ? ['manual_reject'] : undefined
      });
      setSubmitMessage(`Organization ${status.toLowerCase()} successfully.`);
      await loadOrganizations(currentCursor);
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
          <button type="button" className="btn-primary" onClick={() => void loadOrganizations(currentCursor)}>
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

      <div className="table-pagination">
        <span>
          {loading
            ? 'Loading...'
            : `Showing ${rows.length === 0 ? 0 : currentCursor + 1} to ${currentCursor + rows.length} of ${total} entries`}
        </span>
        <div className="pagination-buttons">
          <button type="button" onClick={goToPreviousPage} disabled={loading || cursorHistory.length === 0}>
            Previous
          </button>
          <button type="button" className="is-active">
            {Math.floor(currentCursor / PAGE_SIZE) + 1}
          </button>
          <button type="button" onClick={goToNextPage} disabled={loading || nextCursor === null}>
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
