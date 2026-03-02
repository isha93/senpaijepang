import { useEffect, useState } from 'react';
import { AdminJob, getAdminJobs } from '../lib/adminApi';

function resolveLocation(job: AdminJob) {
  if (job.location.displayLabel) {
    return job.location.displayLabel;
  }
  if (job.location.city && job.location.countryCode) {
    return `${job.location.city}, ${job.location.countryCode}`;
  }
  return job.location.city || job.location.countryCode || '-';
}

function employmentChip(type: AdminJob['employmentType']) {
  if (type === 'FULL_TIME') return 'Full Time';
  if (type === 'PART_TIME') return 'Part Time';
  return 'Contract';
}

export function JobsAdminPage() {
  const [rows, setRows] = useState<AdminJob[]>([]);
  const [total, setTotal] = useState(0);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadJobs(activeQuery: string) {
    setLoading(true);
    setError(null);

    try {
      const result = await getAdminJobs({
        q: activeQuery || undefined,
        limit: 100
      });
      setRows(result.items);
      setTotal(result.pageInfo.total);
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load jobs';
      setError(message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadJobs(query);
  }, [query]);

  return (
    <section className="surface-card page-section">
      <header>
        <div>
          <h3>Jobs Management</h3>
          <p>{loading ? 'Loading jobs...' : `${rows.length} jobs loaded (${total} total)`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Search title, employer, location"
            style={{
              border: '1px solid var(--line)',
              borderRadius: 10,
              padding: '9px 12px',
              minWidth: 240
            }}
          />
          <button type="button" className="btn-secondary" onClick={() => setQuery(queryInput.trim())}>
            Search
          </button>
          <button type="button" className="btn-primary" onClick={() => void loadJobs(query)}>
            Refresh
          </button>
        </div>
      </header>

      {error ? <p className="auth-error">{error}</p> : null}

      <div className="simple-table-card">
        <div className="table-wrap">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Employer</th>
                <th>Type</th>
                <th>Location</th>
                <th>Visa</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>{row.employer.name}</td>
                  <td>
                    <span className="status-chip review">{employmentChip(row.employmentType)}</span>
                  </td>
                  <td>{resolveLocation(row)}</td>
                  <td>
                    <span className={`status-chip ${row.visaSponsorship ? 'verified' : 'review'}`}>
                      {row.visaSponsorship ? 'Sponsored' : 'No'}
                    </span>
                  </td>
                  <td className="action-cell">
                    <button type="button" disabled>
                      Edit
                    </button>
                    <button type="button" className="danger" disabled>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No jobs found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
