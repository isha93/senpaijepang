import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminFeedPost,
  AdminFeedPostUpsertInput,
  FeedPost,
  createAdminFeedPost,
  deleteAdminFeedPost,
  getAdminFeedPosts,
  getPublicFeedPosts,
  updateAdminFeedPost
} from '../lib/adminApi';

const filters = ['All Posts', 'Visa Info', 'Safety', 'Lifestyle', 'Job Opportunities'] as const;

type FilterName = (typeof filters)[number];
type FeedFormState = {
  title: string;
  excerpt: string;
  category: string;
  author: string;
  imageUrl: string;
  publishedAt: string;
};

const DEFAULT_FEED_FORM: FeedFormState = {
  title: '',
  excerpt: '',
  category: 'VISA',
  author: '',
  imageUrl: '',
  publishedAt: ''
};

const PAGE_SIZE = 20;

function normalize(text: string) {
  return text.trim().toLowerCase();
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

function matchesFilter(category: string, filter: FilterName) {
  const value = normalize(category);
  if (filter === 'All Posts') return true;
  if (filter === 'Visa Info') return value.includes('visa');
  if (filter === 'Safety') return value.includes('safety') || value.includes('risk');
  if (filter === 'Lifestyle') return value.includes('lifestyle') || value.includes('life') || value.includes('community');
  return value.includes('job') || value.includes('career') || value.includes('interview');
}

function categoryTone(category: string) {
  const value = normalize(category);
  if (value.includes('visa')) return 'chip blue';
  if (value.includes('safety')) return 'chip red';
  if (value.includes('life') || value.includes('community')) return 'chip purple';
  return 'chip orange';
}

function deriveStatus(publishedAt?: string | null) {
  if (!publishedAt) return 'Draft';
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return 'Draft';

  const now = Date.now();
  const ms = date.getTime();
  if (ms > now + 24 * 60 * 60 * 1000) return 'Draft';
  if (now - ms > 180 * 24 * 60 * 60 * 1000) return 'Archived';
  return 'Published';
}

function statusClass(status: 'Published' | 'Draft' | 'Archived') {
  if (status === 'Published') return 'state published';
  if (status === 'Draft') return 'state draft';
  return 'state archived';
}

function formatDate(iso: string | undefined) {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function toDateTimeLocal(iso: string | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toFeedForm(post: AdminFeedPost): FeedFormState {
  return {
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    author: post.author,
    imageUrl: post.imageUrl || '',
    publishedAt: toDateTimeLocal(post.publishedAt)
  };
}

function toFeedPayload(form: FeedFormState): AdminFeedPostUpsertInput {
  const title = form.title.trim();
  const excerpt = form.excerpt.trim();
  const category = form.category.trim().toUpperCase();
  const author = form.author.trim();
  const imageUrl = form.imageUrl.trim();
  const publishedAtRaw = form.publishedAt.trim();

  if (!title) {
    throw new Error('Title is required');
  }
  if (!excerpt) {
    throw new Error('Excerpt is required');
  }
  if (!category) {
    throw new Error('Category is required');
  }
  if (!author) {
    throw new Error('Author is required');
  }

  let publishedAt: string | undefined;
  if (publishedAtRaw) {
    const parsed = Date.parse(publishedAtRaw);
    if (!Number.isFinite(parsed)) {
      throw new Error('Published date must be valid');
    }
    publishedAt = new Date(parsed).toISOString();
  }

  return {
    title,
    excerpt,
    category,
    author,
    imageUrl: imageUrl || null,
    publishedAt: publishedAt || new Date().toISOString()
  };
}

export function FeedAdminPage() {
  const [activeTab, setActiveTab] = useState<'management' | 'preview'>('management');
  const [activeFilter, setActiveFilter] = useState<FilterName>('All Posts');
  const [adminPosts, setAdminPosts] = useState<AdminFeedPost[]>([]);
  const [publicPosts, setPublicPosts] = useState<FeedPost[]>([]);
  const [adminTotal, setAdminTotal] = useState(0);
  const [publicTotal, setPublicTotal] = useState(0);
  const [adminCursor, setAdminCursor] = useState(0);
  const [adminNextCursor, setAdminNextCursor] = useState<number | null>(null);
  const [adminCursorHistory, setAdminCursorHistory] = useState<number[]>([]);
  const [publicCursor, setPublicCursor] = useState(0);
  const [publicNextCursor, setPublicNextCursor] = useState<number | null>(null);
  const [publicCursorHistory, setPublicCursorHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [form, setForm] = useState<FeedFormState>(DEFAULT_FEED_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async ({ adminCursor: targetAdminCursor, publicCursor: targetPublicCursor }: {
    adminCursor: number;
    publicCursor: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const [adminData, publicData] = await Promise.all([
        getAdminFeedPosts({
          cursor: targetAdminCursor,
          limit: PAGE_SIZE
        }),
        getPublicFeedPosts({
          cursor: targetPublicCursor,
          limit: PAGE_SIZE
        })
      ]);
      setAdminPosts(adminData.items);
      setPublicPosts(publicData.items);
      setAdminTotal(adminData.pageInfo.total);
      setPublicTotal(publicData.pageInfo.total);
      setAdminCursor(parseCursorValue(adminData.pageInfo.cursor) ?? targetAdminCursor);
      setAdminNextCursor(parseCursorValue(adminData.pageInfo.nextCursor));
      setPublicCursor(parseCursorValue(publicData.pageInfo.cursor) ?? targetPublicCursor);
      setPublicNextCursor(parseCursorValue(publicData.pageInfo.nextCursor));
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load feed data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setAdminCursorHistory([]);
    setPublicCursorHistory([]);
    void loadData({
      adminCursor: 0,
      publicCursor: 0
    });
  }, [activeFilter, loadData]);

  const managementRows = useMemo(
    () => adminPosts.filter((item) => matchesFilter(item.category, activeFilter)),
    [activeFilter, adminPosts]
  );
  const previewRowsForTable = useMemo(
    () => publicPosts.filter((item) => matchesFilter(item.category, activeFilter)),
    [activeFilter, publicPosts]
  );
  const activityRows = activeTab === 'management' ? managementRows : previewRowsForTable;

  const previewRows = useMemo(
    () => publicPosts.filter((item) => matchesFilter(item.category, activeFilter)).slice(0, 2),
    [activeFilter, publicPosts]
  );

  function openCreateModal() {
    setModalMode('create');
    setEditingPostId(null);
    setForm(DEFAULT_FEED_FORM);
    setFormError(null);
  }

  function openEditModal(post: AdminFeedPost) {
    setModalMode('edit');
    setEditingPostId(post.id);
    setForm(toFeedForm(post));
    setFormError(null);
  }

  function closeModal() {
    if (isSubmitting) {
      return;
    }
    setModalMode(null);
    setEditingPostId(null);
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
      const payload = toFeedPayload(form);
      if (modalMode === 'create') {
        await createAdminFeedPost(payload);
        setActionMessage('Post created successfully.');
      } else {
        if (!editingPostId) {
          throw new Error('Missing post target');
        }
        await updateAdminFeedPost(editingPostId, payload);
        setActionMessage('Post updated successfully.');
      }
      setModalMode(null);
      setEditingPostId(null);
      await loadData({
        adminCursor,
        publicCursor
      });
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to save post';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(post: AdminFeedPost) {
    if (deletingPostId) {
      return;
    }

    const confirmed = window.confirm(`Delete "${post.title}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeletingPostId(post.id);
    setActionMessage(null);
    setError(null);
    try {
      await deleteAdminFeedPost(post.id);
      setActionMessage('Post deleted successfully.');
      await loadData({
        adminCursor,
        publicCursor
      });
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to delete post';
      setActionMessage(message);
    } finally {
      setDeletingPostId(null);
    }
  }

  function goToPreviousPage() {
    if (loading) {
      return;
    }

    if (activeTab === 'management') {
      if (adminCursorHistory.length === 0) {
        return;
      }
      const targetCursor = adminCursorHistory[adminCursorHistory.length - 1];
      setAdminCursorHistory((prev) => prev.slice(0, -1));
      void loadData({
        adminCursor: targetCursor,
        publicCursor
      });
      return;
    }

    if (publicCursorHistory.length === 0) {
      return;
    }
    const targetCursor = publicCursorHistory[publicCursorHistory.length - 1];
    setPublicCursorHistory((prev) => prev.slice(0, -1));
    void loadData({
      adminCursor,
      publicCursor: targetCursor
    });
  }

  function goToNextPage() {
    if (loading) {
      return;
    }

    if (activeTab === 'management') {
      if (adminNextCursor === null) {
        return;
      }
      setAdminCursorHistory((prev) => [...prev, adminCursor]);
      void loadData({
        adminCursor: adminNextCursor,
        publicCursor
      });
      return;
    }

    if (publicNextCursor === null) {
      return;
    }
    setPublicCursorHistory((prev) => [...prev, publicCursor]);
    void loadData({
      adminCursor,
      publicCursor: publicNextCursor
    });
  }

  const activeCursor = activeTab === 'management' ? adminCursor : publicCursor;
  const activeTotal = activeTab === 'management' ? adminTotal : publicTotal;
  const activeRowsCount = activeTab === 'management' ? managementRows.length : previewRowsForTable.length;
  const hasPreviousPage = activeTab === 'management' ? adminCursorHistory.length > 0 : publicCursorHistory.length > 0;
  const hasNextPage = activeTab === 'management' ? adminNextCursor !== null : publicNextCursor !== null;

  return (
    <section className="surface-card page-section feed-page">
      <div className="feed-page-head">
        <div>
          <h3>Feed Posts</h3>
          <p>Manage content and QA the public feed view.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateModal}>
          Create Post
        </button>
      </div>

      <div className="feed-tabs">
        <button
          type="button"
          className={activeTab === 'management' ? 'is-active' : ''}
          onClick={() => setActiveTab('management')}
        >
          Management List
        </button>
        <button
          type="button"
          className={activeTab === 'preview' ? 'is-active' : ''}
          onClick={() => setActiveTab('preview')}
        >
          Public Preview QA
        </button>
      </div>

      <div className="filter-row">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`filter-pill ${activeFilter === filter ? 'is-active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {error ? <p className="auth-error">{error}</p> : null}
      {actionMessage ? <p className="inline-note">{actionMessage}</p> : null}

      <section className="surface-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Post Title</th>
                <th>Category</th>
                <th>Author</th>
                <th>Published At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'management'
                ? managementRows.map((item) => {
                    const status = deriveStatus(item.publishedAt);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="table-title">
                            <span className="table-avatar" />
                            <span>{item.title}</span>
                          </div>
                        </td>
                        <td>
                          <span className={categoryTone(item.category)}>{item.category}</span>
                        </td>
                        <td>
                          <div className="table-author">
                            <span className="round" />
                            <span>{item.author}</span>
                          </div>
                        </td>
                        <td>{formatDate(item.publishedAt)}</td>
                        <td>
                          <span className={statusClass(status)}>{status}</span>
                        </td>
                        <td className="action-cell">
                          <button type="button" onClick={() => openEditModal(item)} disabled={Boolean(deletingPostId)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => void handleDelete(item)}
                            disabled={deletingPostId === item.id}
                          >
                            {deletingPostId === item.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                : previewRowsForTable.map((item) => {
                    const status = deriveStatus(item.publishedAt);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="table-title">
                            <span className="table-avatar" />
                            <span>{item.title}</span>
                          </div>
                        </td>
                        <td>
                          <span className={categoryTone(item.category)}>{item.category}</span>
                        </td>
                        <td>
                          <div className="table-author">
                            <span className="round" />
                            <span>{item.author}</span>
                          </div>
                        </td>
                        <td>{formatDate(item.publishedAt)}</td>
                        <td>
                          <span className={statusClass(status)}>{status}</span>
                        </td>
                        <td>
                          <button type="button" className="table-action">
                            Preview
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              {!loading && activeTab === 'management' && managementRows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No posts found for this filter.</td>
                </tr>
              ) : null}
              {!loading && activeTab === 'preview' && previewRowsForTable.length === 0 ? (
                <tr>
                  <td colSpan={6}>No posts found for this filter.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="table-pagination">
          <span>
            {loading
              ? 'Loading...'
              : `Showing ${activeRowsCount === 0 ? 0 : activeCursor + 1} to ${activeCursor + activeRowsCount} of ${activeTotal} entries`}
          </span>
          <div className="pagination-buttons">
            <button type="button" onClick={goToPreviousPage} disabled={loading || !hasPreviousPage}>
              Previous
            </button>
            <button type="button" className="is-active">
              {Math.floor(activeCursor / PAGE_SIZE) + 1}
            </button>
            <button type="button" onClick={goToNextPage} disabled={loading || !hasNextPage}>
              Next
            </button>
          </div>
        </div>
      </section>

      <div className="feed-bottom">
        <section className="surface-card activity-mini">
          <div className="section-title-row">
            <h3 className="mini-title">Recent Activity</h3>
            <button type="button">View All</button>
          </div>

          <ul className="mini-list">
            {activityRows.slice(0, 2).map((item) => (
              <li key={item.id}>
                <span className="mini-dot" />
                <div>
                  <strong>{item.author} updated &quot;{item.title}&quot;</strong>
                  <small>{formatDate(item.publishedAt)}</small>
                </div>
              </li>
            ))}
            {activityRows.length === 0 ? (
              <li>
                <span className="mini-dot danger" />
                <div>
                  <strong>No activity yet</strong>
                  <small>Publish or update a post to see events.</small>
                </div>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="surface-card phone-preview-card">
          <div className="section-title-row">
            <h3 className="mini-title">Mobile Preview</h3>
            <span style={{ fontSize: 11, color: '#7b8d83', fontWeight: 600 }}>iOS • iPhone 14</span>
          </div>

          <div className="phone-preview">
            <div className="phone-notch" />
            <div className="phone-head">SenpaiJepang</div>
            <div className="phone-feed">
              {previewRows.map((item) => (
                <article key={item.id} className="phone-feed-item">
                  <div
                    className="phone-img"
                    style={
                      item.imageUrl
                        ? {
                            backgroundImage: `url(${item.imageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }
                        : undefined
                    }
                  />
                  <h5>{item.title}</h5>
                </article>
              ))}
              {previewRows.length === 0 ? (
                <article className="phone-feed-item">
                  <div className="phone-img" />
                  <h5>No posts available</h5>
                </article>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {modalMode ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-head">
              <h4>{modalMode === 'create' ? 'Create Post' : 'Edit Post'}</h4>
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
                    placeholder="Update Visa Kerja 2026"
                    required
                  />
                </label>

                <label>
                  Category
                  <input
                    value={form.category}
                    onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="VISA"
                    required
                  />
                </label>

                <label>
                  Author
                  <input
                    value={form.author}
                    onChange={(event) => setForm((prev) => ({ ...prev, author: event.target.value }))}
                    placeholder="Senpai Ops"
                    required
                  />
                </label>

                <label>
                  Published At
                  <input
                    type="datetime-local"
                    value={form.publishedAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, publishedAt: event.target.value }))}
                  />
                </label>
              </div>

              <label>
                Excerpt
                <textarea
                  value={form.excerpt}
                  onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
                  rows={4}
                  required
                />
              </label>

              <label>
                Image URL (optional)
                <input
                  value={form.imageUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </label>

              {formError ? <p className="auth-error">{formError}</p> : null}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Post' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
