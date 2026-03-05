import { useEffect, useState } from 'react';
import {
  AdminApplicationDocumentListResponse,
  AdminApplicationItem,
  ApplicationDocumentReviewStatus,
  ApplicationStatus,
  getAdminApplicationDocuments,
  getAdminApplicationJourney,
  getAdminApplications,
  issueAdminApplicationDocumentPreviewUrl,
  reviewAdminApplicationDocument,
  updateAdminApplicationStatus
} from '../lib/adminApi';

const PAGE_SIZE = 20;
const STATUS_OPTIONS: ApplicationStatus[] = ['SUBMITTED', 'IN_REVIEW', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED'];
const DOCUMENT_REVIEW_STATUS_OPTIONS: ApplicationDocumentReviewStatus[] = ['PENDING', 'VALID', 'INVALID'];

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

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '-';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [statusDraftById, setStatusDraftById] = useState<Record<string, ApplicationStatus>>({});
  const [currentCursor, setCurrentCursor] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [cursorHistory, setCursorHistory] = useState<number[]>([]);
  const [documentsPanel, setDocumentsPanel] = useState<AdminApplicationDocumentListResponse | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [reviewingDocumentId, setReviewingDocumentId] = useState<string | null>(null);

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
      setStatusDraftById((prev) => {
        const next: Record<string, ApplicationStatus> = {};
        for (const entry of result.items) {
          next[entry.application.id] = prev[entry.application.id] || entry.application.status;
        }
        return next;
      });
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
    setDocumentsPanel(null);
    setDocumentsError(null);
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

    const nextStatus = statusDraftById[item.application.id] || item.application.status;

    const reasonInput = window.prompt('Reason (optional)', item.lastEvent?.description || '');

    setUpdatingId(item.application.id);
    setActionMessage(null);
    setError(null);

    try {
      const response = await updateAdminApplicationStatus(item.application.id, {
        status: nextStatus,
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

  async function refreshDocumentsPanel(applicationId: string) {
    const documents = await getAdminApplicationDocuments(applicationId);
    setDocumentsPanel(documents);
    return documents;
  }

  async function handleViewDocuments(item: AdminApplicationItem) {
    if (documentsLoading) {
      return;
    }
    setDocumentsLoading(true);
    setDocumentsError(null);
    try {
      await refreshDocumentsPanel(item.application.id);
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load application documents';
      setDocumentsError(message);
      setDocumentsPanel(null);
    } finally {
      setDocumentsLoading(false);
    }
  }

  async function handlePreviewDocument(documentId: string) {
    setDocumentsError(null);
    try {
      const preview = await issueAdminApplicationDocumentPreviewUrl(documentId, { expiresSec: 180 });
      window.open(preview.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to issue document preview URL';
      setDocumentsError(message);
    }
  }

  async function handleReviewDocument(applicationId: string, documentId: string) {
    if (reviewingDocumentId) {
      return;
    }
    const nextStatusInput = window.prompt(
      `Review status (${DOCUMENT_REVIEW_STATUS_OPTIONS.join('/')})`,
      'VALID'
    );
    if (!nextStatusInput) {
      return;
    }
    const nextStatus = String(nextStatusInput).trim().toUpperCase() as ApplicationDocumentReviewStatus;
    if (!DOCUMENT_REVIEW_STATUS_OPTIONS.includes(nextStatus)) {
      setDocumentsError(`Invalid review status: ${nextStatusInput}`);
      return;
    }
    const reviewReasonInput = window.prompt('Review reason (optional)', '');

    setReviewingDocumentId(documentId);
    setDocumentsError(null);
    setActionMessage(null);
    try {
      await reviewAdminApplicationDocument(applicationId, documentId, {
        reviewStatus: nextStatus,
        reviewReason: reviewReasonInput ? reviewReasonInput.trim() : undefined
      });
      await refreshDocumentsPanel(applicationId);
      setActionMessage(`Document marked as ${nextStatus}.`);
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to review application document';
      setDocumentsError(message);
    } finally {
      setReviewingDocumentId(null);
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
                    <select
                      value={statusDraftById[item.application.id] || item.application.status}
                      onChange={(event) =>
                        setStatusDraftById((prev) => ({
                          ...prev,
                          [item.application.id]: event.target.value as ApplicationStatus
                        }))
                      }
                      disabled={updatingId === item.application.id}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
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
                    <button
                      type="button"
                      onClick={() => void handleViewDocuments(item)}
                      disabled={documentsLoading}
                    >
                      {documentsLoading && documentsPanel?.application.id === item.application.id
                        ? 'Loading Docs...'
                        : 'Documents'}
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

      {documentsError ? <p className="auth-error">{documentsError}</p> : null}

      {documentsPanel ? (
        <div className="simple-table-card">
          <header style={{ marginBottom: 12 }}>
            <div>
              <h4 style={{ margin: 0 }}>Application Documents</h4>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)' }}>
                {documentsPanel.applicant.fullName || documentsPanel.applicant.email || documentsPanel.applicant.id} -{' '}
                {documentsPanel.application.job.title}
              </p>
            </div>
          </header>
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Review</th>
                  <th>Reviewed At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documentsPanel.items.map((document) => (
                  <tr key={document.id}>
                    <td>{document.fileName}</td>
                    <td>{document.documentType}</td>
                    <td>{formatBytes(document.contentLength)}</td>
                    <td>
                      <span className="status-chip review">{document.reviewStatus}</span>
                      {document.reviewReason ? (
                        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{document.reviewReason}</div>
                      ) : null}
                    </td>
                    <td>{document.reviewedAt ? formatDateTime(document.reviewedAt) : '-'}</td>
                    <td className="action-cell">
                      <button type="button" onClick={() => void handlePreviewDocument(document.id)}>
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReviewDocument(documentsPanel.application.id, document.id)}
                        disabled={reviewingDocumentId === document.id}
                      >
                        {reviewingDocumentId === document.id ? 'Saving...' : 'Review'}
                      </button>
                    </td>
                  </tr>
                ))}
                {documentsPanel.items.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No application documents uploaded yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

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
