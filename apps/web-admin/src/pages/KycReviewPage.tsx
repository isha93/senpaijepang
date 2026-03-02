import { useEffect, useMemo, useState } from 'react';
import {
  AdminKycReviewQueueItem,
  KycRawStatus,
  getAdminKycReviewQueue,
  submitAdminKycReview
} from '../lib/adminApi';

type FilterKey = 'all' | 'pending' | 'verifying' | 'on-hold' | 'verified' | 'rejected';

type DecisionState = 'reject' | 'manual' | 'verify';

const filterOrder: FilterKey[] = ['all', 'pending', 'verifying', 'on-hold', 'verified', 'rejected'];

function filterToStatus(filter: FilterKey): 'ALL' | KycRawStatus {
  if (filter === 'all') return 'ALL';
  if (filter === 'pending') return 'SUBMITTED';
  if (filter === 'verifying') return 'MANUAL_REVIEW';
  if (filter === 'on-hold') return 'CREATED';
  if (filter === 'verified') return 'VERIFIED';
  return 'REJECTED';
}

function statusLabel(filter: FilterKey) {
  if (filter === 'all') return 'All';
  if (filter === 'pending') return 'Pending';
  if (filter === 'verifying') return 'Verifying';
  if (filter === 'on-hold') return 'On Hold';
  if (filter === 'verified') return 'Verified';
  return 'Rejected';
}

function formatRelative(iso: string | null | undefined) {
  if (!iso) return '-';
  const deltaSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return `${deltaMin} mins ago`;
  const deltaHour = Math.floor(deltaMin / 60);
  if (deltaHour < 24) return `${deltaHour}h ago`;
  return `${Math.floor(deltaHour / 24)}d ago`;
}

function statusTag(rawStatus: KycRawStatus) {
  if (rawStatus === 'SUBMITTED') return { label: 'Pending', className: 'pending' };
  if (rawStatus === 'MANUAL_REVIEW') return { label: 'Verifying', className: 'verifying' };
  if (rawStatus === 'VERIFIED') return { label: 'Verified', className: 'verified' };
  if (rawStatus === 'REJECTED') return { label: 'Rejected', className: 'rejected' };
  return { label: 'On Hold', className: 'on-hold' };
}

function riskTag(flags: string[]) {
  const normalized = flags.map((item) => item.toLowerCase());
  if (normalized.some((item) => item.includes('fraud'))) return { label: 'Potential Fraud', className: 'fraud' };
  if (normalized.some((item) => item.includes('high'))) return { label: 'High Risk', className: 'high-risk' };
  if (normalized.some((item) => item.includes('medium'))) return { label: 'Medium Risk', className: 'medium-risk' };
  if (flags.length > 0) return { label: 'Low Risk', className: 'low-risk' };
  return { label: 'None', className: 'none' };
}

function decisionToApi(decision: DecisionState): 'REJECTED' | 'MANUAL_REVIEW' | 'VERIFIED' {
  if (decision === 'reject') return 'REJECTED';
  if (decision === 'manual') return 'MANUAL_REVIEW';
  return 'VERIFIED';
}

export function KycReviewPage() {
  const [statusFilter, setStatusFilter] = useState<FilterKey>('all');
  const [rows, setRows] = useState<AdminKycReviewQueueItem[]>([]);
  const [activeId, setActiveId] = useState('');
  const [decision, setDecision] = useState<DecisionState>('manual');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  async function loadQueue(filter: FilterKey) {
    setLoading(true);
    setError(null);
    try {
      const response = await getAdminKycReviewQueue({
        status: filterToStatus(filter),
        limit: 100
      });
      setRows(response.items);
      setActiveId((prev) => {
        if (prev && response.items.some((item) => item.session.id === prev)) {
          return prev;
        }
        return response.items[0]?.session.id || '';
      });
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load KYC queue';
      setError(message);
      setRows([]);
      setActiveId('');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue(statusFilter);
  }, [statusFilter]);

  const active = useMemo(
    () => rows.find((item) => item.session.id === activeId) || rows[0] || null,
    [activeId, rows]
  );

  const currentRisk = active ? riskTag(active.riskFlags) : { label: 'None', className: 'none' };

  function cycleFilter() {
    const index = filterOrder.indexOf(statusFilter);
    const next = filterOrder[(index + 1) % filterOrder.length];
    setStatusFilter(next);
  }

  async function submitDecision() {
    if (!active || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      await submitAdminKycReview({
        sessionId: active.session.id,
        decision: decisionToApi(decision),
        reason: reason.trim() || undefined
      });
      setSubmitMessage('Decision submitted. Queue refreshed.');
      setReason('');
      await loadQueue(statusFilter);
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to submit decision';
      setSubmitMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="kyc-page">
      <section className="surface-card page-section">
        <div className="kyc-header">
          <div>
            <h3>KYC Review Queue</h3>
            <p>{loading ? 'Loading queue...' : `${rows.length} requests in current filter`}</p>
          </div>

          <div className="kyc-actions">
            <button type="button" onClick={cycleFilter}>
              Filter: {statusLabel(statusFilter)}
            </button>
            <button type="button" className="btn-primary" onClick={() => void loadQueue(statusFilter)}>
              Refresh
            </button>
          </div>
        </div>

        {error ? <p className="auth-error">{error}</p> : null}

        <div className="kyc-workspace">
          <section className="surface-card kyc-table-card">
            <div className="table-wrap">
              <table className="kyc-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Trust Status</th>
                    <th>Docs</th>
                    <th>Risk Flags</th>
                    <th>Last Event</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => {
                    const status = statusTag(item.session.status);
                    const risk = riskTag(item.riskFlags);

                    return (
                      <tr
                        key={item.session.id}
                        className={item.session.id === active?.session.id ? 'active' : ''}
                        onClick={() => setActiveId(item.session.id)}
                      >
                        <td>
                          <div className="user-col">
                            <span className="avatar" />
                            <div>
                              <strong>{item.user?.fullName || `User ${item.session.id.slice(0, 6)}`}</strong>
                              <small>{item.user?.email || '-'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`tag ${status.className}`}>{status.label}</span>
                        </td>
                        <td>{item.documentCount}</td>
                        <td>
                          <span className={`tag ${risk.className}`}>{risk.label}</span>
                        </td>
                        <td>{formatRelative(item.lastEvent?.createdAt || item.session.updatedAt)}</td>
                        <td>{'>'}</td>
                      </tr>
                    );
                  })}
                  {!loading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No queue items for this filter.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="table-pagination">
              <span>Showing {rows.length} items</span>
              <div className="pagination-buttons">
                <button type="button">Prev</button>
                <button type="button">Next</button>
              </div>
            </div>
          </section>

          {active ? (
            <aside className="surface-card kyc-drawer">
              <header className="kyc-drawer-head">
                <h4>Session Review</h4>
                <p>ID: #{active.session.id.slice(0, 8)}</p>
              </header>

              <div className="kyc-drawer-body">
                <div className="profile-summary">
                  <span className="avatar" />
                  <div>
                    <h5>{active.user?.fullName || `User ${active.session.id.slice(0, 6)}`}</h5>
                    <p>{active.user?.email || 'No email available'}</p>
                    <div className="badges">
                      <span className="pill red">{currentRisk.label}</span>
                      <span className="pill gray">{active.trustStatus}</span>
                    </div>
                  </div>
                </div>

                <section>
                  <div className="section-title-row">
                    <h6>Documents Submitted</h6>
                    <button type="button">View All</button>
                  </div>

                  {active.documents.slice(0, 2).map((doc) => (
                    <article key={doc.id} className="doc-card" style={{ marginBottom: 10 }}>
                      <div
                        className="doc-preview"
                        style={
                          doc.fileUrl
                            ? {
                                backgroundImage: `url(${doc.fileUrl})`,
                                backgroundPosition: 'center',
                                backgroundSize: 'cover'
                              }
                            : undefined
                        }
                      />
                      <div className="doc-meta">
                        <strong>{doc.documentType}</strong>
                        <small>Uploaded {formatRelative(doc.createdAt)}</small>
                      </div>
                    </article>
                  ))}

                  {active.documents.length === 0 ? <p className="muted">No documents uploaded yet.</p> : null}
                </section>

                <section className="extract-card">
                  <div className="section-title-row">
                    <h6>Extracted Data</h6>
                  </div>

                  <div className="extract-row">
                    <span>Session Status</span>
                    <strong>{active.session.status}</strong>
                  </div>
                  <div className="extract-row">
                    <span>Provider</span>
                    <strong>{active.session.provider}</strong>
                  </div>
                  <div className="extract-row">
                    <span>Submitted At</span>
                    <strong>{formatRelative(active.session.submittedAt)}</strong>
                  </div>
                  <div className="extract-row">
                    <span>Risk Flags</span>
                    <strong>{active.riskFlags.length ? active.riskFlags.join(', ') : 'None'}</strong>
                  </div>
                </section>
              </div>

              <footer className="kyc-decision">
                <div className="section-title-row">
                  <h6>Review Decision</h6>
                </div>

                <div className="kyc-segment">
                  <button
                    type="button"
                    className={decision === 'reject' ? 'is-active' : ''}
                    onClick={() => setDecision('reject')}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className={decision === 'manual' ? 'is-active' : ''}
                    onClick={() => setDecision('manual')}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    className={decision === 'verify' ? 'is-active' : ''}
                    onClick={() => setDecision('verify')}
                  >
                    Verify
                  </button>
                </div>

                <textarea
                  placeholder="Enter notes about this review decision..."
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />

                {submitMessage ? <p className="muted">{submitMessage}</p> : null}

                <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={submitDecision}>
                  {isSubmitting ? 'Submitting...' : 'Submit Decision'}
                </button>
              </footer>
            </aside>
          ) : null}
        </div>
      </section>
    </div>
  );
}
