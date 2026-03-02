import { FormEvent, useEffect, useState } from 'react';
import {
  AdminJob,
  AdminJobUpsertInput,
  createAdminJob,
  deleteAdminJob,
  getAdminJobs,
  updateAdminJob
} from '../lib/adminApi';

type JobFormState = {
  title: string;
  employmentType: AdminJob['employmentType'];
  visaSponsorship: boolean;
  description: string;
  requirementsText: string;
  countryCode: string;
  city: string;
  displayLabel: string;
  latitude: string;
  longitude: string;
  employerId: string;
  employerName: string;
  employerLogoUrl: string;
  employerVerified: boolean;
};

const DEFAULT_FORM: JobFormState = {
  title: '',
  employmentType: 'FULL_TIME',
  visaSponsorship: true,
  description: '',
  requirementsText: '',
  countryCode: 'JP',
  city: 'Tokyo',
  displayLabel: 'Tokyo, JP',
  latitude: '35.6762',
  longitude: '139.6503',
  employerId: '',
  employerName: '',
  employerLogoUrl: '',
  employerVerified: true
};

const PAGE_SIZE = 20;

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

function jobToForm(job: AdminJob): JobFormState {
  return {
    title: job.title,
    employmentType: job.employmentType,
    visaSponsorship: job.visaSponsorship,
    description: job.description,
    requirementsText: job.requirements.join('\n'),
    countryCode: job.location.countryCode,
    city: job.location.city,
    displayLabel: job.location.displayLabel,
    latitude: String(job.location.latitude),
    longitude: String(job.location.longitude),
    employerId: job.employer.id,
    employerName: job.employer.name,
    employerLogoUrl: job.employer.logoUrl || '',
    employerVerified: job.employer.isVerifiedEmployer
  };
}

function parseRequirements(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toPayload(form: JobFormState): AdminJobUpsertInput {
  const title = form.title.trim();
  const description = form.description.trim();
  const requirements = parseRequirements(form.requirementsText);
  const countryCode = form.countryCode.trim().toUpperCase();
  const city = form.city.trim();
  const displayLabel = form.displayLabel.trim();
  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const employerId = form.employerId.trim();
  const employerName = form.employerName.trim();
  const logoUrl = form.employerLogoUrl.trim();

  if (!title) {
    throw new Error('Title is required');
  }
  if (!description) {
    throw new Error('Description is required');
  }
  if (requirements.length === 0) {
    throw new Error('At least one requirement is required');
  }
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error('Country code must be 2 letters, e.g. JP');
  }
  if (!city) {
    throw new Error('City is required');
  }
  if (!displayLabel) {
    throw new Error('Display label is required');
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Latitude and longitude must be valid numbers');
  }
  if (!employerId) {
    throw new Error('Employer ID is required');
  }
  if (!employerName) {
    throw new Error('Employer name is required');
  }

  return {
    title,
    employmentType: form.employmentType,
    visaSponsorship: form.visaSponsorship,
    description,
    requirements,
    location: {
      countryCode,
      city,
      displayLabel,
      latitude,
      longitude
    },
    employer: {
      id: employerId,
      name: employerName,
      logoUrl: logoUrl || null,
      isVerifiedEmployer: form.employerVerified
    }
  };
}

export function JobsAdminPage() {
  const [rows, setRows] = useState<AdminJob[]>([]);
  const [total, setTotal] = useState(0);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [form, setForm] = useState<JobFormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCursor, setCurrentCursor] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [cursorHistory, setCursorHistory] = useState<number[]>([]);

  async function loadJobs(activeQuery: string, cursor = 0) {
    setLoading(true);
    setError(null);

    try {
      const result = await getAdminJobs({
        q: activeQuery || undefined,
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
          : 'Failed to load jobs';
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
    void loadJobs(query, 0);
  }, [query]);

  function goToPreviousPage() {
    if (cursorHistory.length === 0 || loading) {
      return;
    }
    const targetCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((prev) => prev.slice(0, -1));
    void loadJobs(query, targetCursor);
  }

  function goToNextPage() {
    if (nextCursor === null || loading) {
      return;
    }
    setCursorHistory((prev) => [...prev, currentCursor]);
    void loadJobs(query, nextCursor);
  }

  function openCreateModal() {
    setModalMode('create');
    setEditingJobId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
  }

  function openEditModal(job: AdminJob) {
    setModalMode('edit');
    setEditingJobId(job.id);
    setForm(jobToForm(job));
    setFormError(null);
  }

  function closeModal() {
    if (isSubmitting) {
      return;
    }
    setModalMode(null);
    setEditingJobId(null);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modalMode) {
      return;
    }

    setFormError(null);
    setActionMessage(null);
    setIsSubmitting(true);

    try {
      const payload = toPayload(form);
      if (modalMode === 'create') {
        await createAdminJob(payload);
        setActionMessage('Job created successfully.');
      } else {
        if (!editingJobId) {
          throw new Error('Missing target job to update');
        }
        await updateAdminJob(editingJobId, payload);
        setActionMessage('Job updated successfully.');
      }
      setModalMode(null);
      setEditingJobId(null);
      await loadJobs(query, currentCursor);
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to save job';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(job: AdminJob) {
    if (deletingId) {
      return;
    }

    const confirmed = window.confirm(`Delete "${job.title}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeletingId(job.id);
    setActionMessage(null);
    setError(null);

    try {
      await deleteAdminJob(job.id);
      setActionMessage('Job deleted successfully.');
      await loadJobs(query, currentCursor);
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to delete job';
      setActionMessage(message);
    } finally {
      setDeletingId(null);
    }
  }

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
          <button type="button" className="btn-primary" onClick={() => void loadJobs(query, currentCursor)}>
            Refresh
          </button>
          <button type="button" className="btn-primary" onClick={openCreateModal}>
            Create Job
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
                    <button type="button" onClick={() => openEditModal(row)} disabled={Boolean(deletingId)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => void handleDelete(row)}
                      disabled={deletingId === row.id}
                    >
                      {deletingId === row.id ? 'Deleting...' : 'Delete'}
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

      {modalMode ? (
        <div className="modal-backdrop">
          <div className="modal-card jobs-modal">
            <div className="modal-head">
              <h4>{modalMode === 'create' ? 'Create Job' : 'Edit Job'}</h4>
              <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>
                Close
              </button>
            </div>

            <form className="job-form" onSubmit={handleSubmit}>
              <div className="job-form-grid">
                <label>
                  Title
                  <input
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Senior Welder"
                    required
                  />
                </label>

                <label>
                  Employment Type
                  <select
                    value={form.employmentType}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        employmentType: event.target.value as AdminJob['employmentType']
                      }))
                    }
                  >
                    <option value="FULL_TIME">FULL_TIME</option>
                    <option value="PART_TIME">PART_TIME</option>
                    <option value="CONTRACT">CONTRACT</option>
                  </select>
                </label>

                <label>
                  Country Code
                  <input
                    value={form.countryCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, countryCode: event.target.value }))}
                    placeholder="JP"
                    maxLength={2}
                    required
                  />
                </label>

                <label>
                  City
                  <input
                    value={form.city}
                    onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                    placeholder="Tokyo"
                    required
                  />
                </label>

                <label>
                  Display Label
                  <input
                    value={form.displayLabel}
                    onChange={(event) => setForm((prev) => ({ ...prev, displayLabel: event.target.value }))}
                    placeholder="Tokyo, JP"
                    required
                  />
                </label>

                <label>
                  Latitude
                  <input
                    value={form.latitude}
                    onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))}
                    placeholder="35.6762"
                    required
                  />
                </label>

                <label>
                  Longitude
                  <input
                    value={form.longitude}
                    onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))}
                    placeholder="139.6503"
                    required
                  />
                </label>

                <label>
                  Employer ID
                  <input
                    value={form.employerId}
                    onChange={(event) => setForm((prev) => ({ ...prev, employerId: event.target.value }))}
                    placeholder="emp_tokyo_factory"
                    required
                  />
                </label>

                <label>
                  Employer Name
                  <input
                    value={form.employerName}
                    onChange={(event) => setForm((prev) => ({ ...prev, employerName: event.target.value }))}
                    placeholder="Tokyo Factory"
                    required
                  />
                </label>

                <label>
                  Employer Logo URL
                  <input
                    value={form.employerLogoUrl}
                    onChange={(event) => setForm((prev) => ({ ...prev, employerLogoUrl: event.target.value }))}
                    placeholder="https://..."
                  />
                </label>
              </div>

              <div className="job-toggle-row">
                <label>
                  <input
                    type="checkbox"
                    checked={form.visaSponsorship}
                    onChange={(event) => setForm((prev) => ({ ...prev, visaSponsorship: event.target.checked }))}
                  />
                  Visa Sponsorship
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.employerVerified}
                    onChange={(event) => setForm((prev) => ({ ...prev, employerVerified: event.target.checked }))}
                  />
                  Employer Verified
                </label>
              </div>

              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  required
                />
              </label>

              <label>
                Requirements (one per line)
                <textarea
                  value={form.requirementsText}
                  onChange={(event) => setForm((prev) => ({ ...prev, requirementsText: event.target.value }))}
                  rows={4}
                  required
                />
              </label>

              {formError ? <p className="auth-error">{formError}</p> : null}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Job' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
