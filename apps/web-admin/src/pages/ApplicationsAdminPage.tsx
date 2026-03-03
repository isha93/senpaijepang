import { useEffect, useState } from 'react';
import {
  AdminApplicationItem,
  ApplicationStatus,
  getAdminApplicationJourney,
  getAdminApplications,
  updateAdminApplicationStatus
} from '../lib/adminApi';

const PAGE_SIZE = 20;
const STATUS_OPTIONS: ApplicationStatus[] = ['SUBMITTED', 'IN_REVIEW', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED'];

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

function formatDateTime(iso: string) {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) {
    return '-';
  }
  return new Date(timestamp).toLocaleString('en-US');
}

function resolveApplicantLabel(item: AdminApplicationItem) {
  return item.applicant.fullName || item.applicant.email || item.applicant.id;
}

export function ApplicationsAdminPage() {
  const [rows, setRows] = useState<AdminApplicationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApplicationStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewingJourneyId, setViewingJourneyId] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [cursorHistory, setCursorHistory] = useState<number[]>([]);

  async function loadApplications(activeQuery: string, activeStatus: 'ALL' | ApplicationStatus, cursor = 0) {
    setLoading(true);
    setError(null);

    try {
      const result = await getAdminApplications({
        q: activeQuery || undefined,
        status: activeStatus === 'ALL' ? undefined : activeStatus,
        cursor,
        limit: PAGE_SIZE
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
          : 'Failed to load applications';
      setError(message);
      setRows([]);
      setTotal(0);
      setCurrentCursor(cursor);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCursorHistory([]);
    void loadApplications(query, statusFilter, 0);
  }, [query, statusFilter]);

  function goToPreviousPage() {
    if (cursorHistory.length === 0 || loading) {
      return;
    }
    const targetCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((prev) => prev.slice(0, -1));
    void loadApplications(query, statusFilter, targetCursor);
  }

  function goToNextPage() {
    if (nextCursor === null || loading) {
      return;
    }
    setCursorHistory((prev) => [...prev, currentCursor]);
    void loadApplications(query, statusFilter, nextCursor);
  }

  async function handleUpdateStatus(item: AdminApplicationItem) {
    if (updatingId) {
      return;
    }

    const statusInput = window.prompt(
      `Set status for ${resolveApplicantLabel(item)} (${item.application.job.title})`,
      item.application.status
    );
    if (statusInput === null) {
      return;
    }

    const nextStatus = String(statusInput || '').trim().toUpperCase();
    if (!STATUS_OPTIONS.includes(nextStatus as ApplicationStatus)) {
      setError(`Invalid status. Allowed: ${STATUS_OPTIONS.join(', ')}`);
      return;
    }

    const reasonInput = window.prompt('Reason (optional)', item.lastEvent?.description || '');

    setUpdatingId(item.application.id);
    setActionMessage(null);
    setError(null);

    try {
      const response = await updateAdminApplicationStatus(item.application.id, {
        status: nextStatus as ApplicationStatus,
        reason: reasonInput ? reasonInput.trim() : undefined
      });

      setActionMessage(
        response.updated
          ? `Application moved to ${response.application.status}.`
          : `Application already at ${response.application.status}.`
      );
      await loadApplications(query, statusFilter, currentCursor);
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to update application status';
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleViewJourney(item: AdminApplicationItem) {
    if (viewingJourneyId) {
      return;
    }

    setViewingJourneyId(item.application.id);
    setError(null);

    try {
      const journey = await getAdminApplicationJourney(item.application.id);
      const lines = journey.journey.map((event, index) => {
        const order = String(index + 1).padStart(2, '0');
        return `${order}. [${event.status}] ${formatDateTime(event.createdAt)}\\n   ${event.description}`;
      });
      window.alert(lines.length > 0 ? lines.join('\\n') : 'No journey events yet.');
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load journey timeline';
      setError(message);
    } finally {
      setViewingJourneyId(null);
    }
  }

  return (
    <section className="surface-card page-section">
      <header>
        <div>
          <h3>Applications</h3>
          <p>{loading ? 'Loading applications...' : `${rows.length} applications loaded (${total} total)`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Search applicant email/name or job title"
            style={{
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '9px 12px',
              minWidth: 260
            }}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | ApplicationStatus)}
            style={{
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '9px 12px'
            }}
          >
            <option value="ALL">ALL</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button type="button" className="btn-secondary" onClick={() => setQuery(queryInput.trim())}>
            Search
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void loadApplications(query, statusFilter, currentCursor)}
          >
            Refresh
          </button>
        </div>
      </header>

      {error ? <p className="auth-error">{error}</p> : null}
      {actionMessage ? <p className="inline-note">{actionMessage}</p> : null}

      <div className="simple-table-card">
        <div className="table-wrap">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Job</th>
                <th>Status</th>
                <th>Last Event</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.application.id}>
                  <td>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <strong>{resolveApplicantLabel(item)}</strong>
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>{item.applicant.email || item.applicant.id}</span>
                    </div>
                  </td>
                  <td>{item.application.job.title}</td>
                  <td>
                    <span className="status-chip review">{item.application.status}</span>
                  </td>
                  <td>{item.lastEvent?.title || '-'}</td>
                  <td>{formatDateTime(item.application.updatedAt)}</td>
                  <td className="action-cell">
                    <button
                      type="button"
                      onClick={() => void handleUpdateStatus(item)}
                      disabled={updatingId === item.application.id}
                    >
                      {updatingId === item.application.id ? 'Updating...' : 'Update Status'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleViewJourney(item)}
                      disabled={viewingJourneyId === item.application.id}
                    >
                      {viewingJourneyId === item.application.id ? 'Loading...' : 'View Journey'}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No applications found.</td>
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
