import { useEffect, useMemo, useState } from 'react';
import { AdminFeedPost, FeedPost, getAdminFeedPosts, getPublicFeedPosts } from '../lib/adminApi';

const filters = ['All Posts', 'Visa Info', 'Safety', 'Lifestyle', 'Job Opportunities'] as const;

type FilterName = (typeof filters)[number];

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function matchesFilter(category: string, filter: FilterName) {
  if (filter === 'All Posts') return true;
  if (filter === 'Job Opportunities') {
    const value = normalize(category);
    return value.includes('job');
  }
  return normalize(category) === normalize(filter);
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

export function FeedAdminPage() {
  const [activeTab, setActiveTab] = useState<'management' | 'preview'>('management');
  const [activeFilter, setActiveFilter] = useState<FilterName>('All Posts');
  const [adminPosts, setAdminPosts] = useState<AdminFeedPost[]>([]);
  const [publicPosts, setPublicPosts] = useState<FeedPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [adminData, publicData] = await Promise.all([
          getAdminFeedPosts({ limit: 50 }),
          getPublicFeedPosts({ limit: 20 })
        ]);

        if (!active) {
          return;
        }

        setAdminPosts(adminData.items);
        setPublicPosts(publicData.items);
        setTotal(adminData.pageInfo.total);
      } catch (err) {
        if (!active) {
          return;
        }

        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load feed data';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const sourceRows = activeTab === 'management' ? adminPosts : publicPosts;

  const visibleRows = useMemo(
    () => sourceRows.filter((item) => matchesFilter(item.category, activeFilter)),
    [activeFilter, sourceRows]
  );

  const previewRows = useMemo(
    () => publicPosts.filter((item) => matchesFilter(item.category, activeFilter)).slice(0, 2),
    [activeFilter, publicPosts]
  );

  return (
    <section className="surface-card page-section feed-page">
      <div className="feed-page-head">
        <div>
          <h3>Feed Posts</h3>
          <p>Manage content and QA the public feed view.</p>
        </div>
        <button type="button" className="btn-primary">
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
              {visibleRows.map((item) => {
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
                        {activeTab === 'management' ? 'Edit' : 'Preview'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && visibleRows.length === 0 ? (
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
              : `Showing 1 to ${visibleRows.length} of ${activeTab === 'management' ? total : publicPosts.length} entries`}
          </span>
          <div className="pagination-buttons">
            <button type="button">Previous</button>
            <button type="button" className="is-active">
              1
            </button>
            <button type="button">2</button>
            <button type="button">Next</button>
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
            {visibleRows.slice(0, 2).map((item) => (
              <li key={item.id}>
                <span className="mini-dot" />
                <div>
                  <strong>{item.author} updated &quot;{item.title}&quot;</strong>
                  <small>{formatDate(item.publishedAt)}</small>
                </div>
              </li>
            ))}
            {visibleRows.length === 0 ? (
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
    </section>
  );
}
