class FeedApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const POST_SEED_DATA = [
  {
    id: 'post_jp_work_culture_001',
    title: '5 Hal yang Perlu Kamu Tahu Tentang Budaya Kerja di Jepang',
    excerpt: 'Ringkasan etika kerja, komunikasi, dan ekspektasi tim di perusahaan Jepang.',
    category: 'CAREER',
    author: 'Senpai Editorial',
    imageUrl: null,
    publishedAt: '2026-02-10T09:00:00.000Z'
  },
  {
    id: 'post_visa_update_002',
    title: 'Update Visa Kerja 2026: Checklist Dokumen yang Wajib',
    excerpt: 'Perubahan requirement dokumen dan tips supaya proses lebih lancar.',
    category: 'VISA',
    author: 'Senpai Ops',
    imageUrl: null,
    publishedAt: '2026-02-14T09:00:00.000Z'
  },
  {
    id: 'post_interview_tips_003',
    title: 'Interview Kaisha: Pertanyaan yang Sering Muncul',
    excerpt: 'Contoh jawaban dan pola komunikasi yang lebih cocok untuk employer Jepang.',
    category: 'INTERVIEW',
    author: 'Senpai Mentor',
    imageUrl: null,
    publishedAt: '2026-02-18T09:00:00.000Z'
  },
  {
    id: 'post_life_in_tokyo_004',
    title: 'Hidup di Tokyo dengan Budget Awal yang Aman',
    excerpt: 'Perkiraan biaya tinggal, transport, dan kebutuhan dasar bulan pertama.',
    category: 'LIFESTYLE',
    author: 'Senpai Community',
    imageUrl: null,
    publishedAt: '2026-02-22T09:00:00.000Z'
  }
];

function normalizeLimit(limit) {
  if (limit === undefined || limit === null || String(limit).trim() === '') {
    return DEFAULT_LIMIT;
  }
  const normalized = Number(limit);
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > MAX_LIMIT) {
    throw new FeedApiError(400, 'invalid_limit', `limit must be integer between 1 and ${MAX_LIMIT}`);
  }
  return normalized;
}

function normalizeCursor(cursor) {
  if (cursor === undefined || cursor === null || String(cursor).trim() === '') {
    return 0;
  }
  const normalized = Number(cursor);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new FeedApiError(400, 'invalid_cursor', 'cursor must be a non-negative integer');
  }
  return normalized;
}

function normalizeCategory(category) {
  if (category === undefined || category === null || String(category).trim() === '') {
    return null;
  }
  return String(category).trim().toUpperCase();
}

function normalizeQuery(q) {
  return String(q || '')
    .trim()
    .toLowerCase();
}

function toFeedPost(post, { authenticated, saved }) {
  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    author: post.author,
    imageUrl: post.imageUrl,
    publishedAt: post.publishedAt,
    viewerState: {
      authenticated,
      saved
    }
  };
}

export class FeedService {
  constructor({ posts = POST_SEED_DATA } = {}) {
    this.posts = Array.from(posts).sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
    this.postById = new Map(this.posts.map((post) => [post.id, post]));
    this.savedPostMapByUserId = new Map();
  }

  getSavedMapForUser(userId) {
    if (!this.savedPostMapByUserId.has(userId)) {
      this.savedPostMapByUserId.set(userId, new Map());
    }
    return this.savedPostMapByUserId.get(userId);
  }

  isSavedByUser(userId, postId) {
    if (!userId) return false;
    const savedMap = this.savedPostMapByUserId.get(userId);
    return Boolean(savedMap && savedMap.has(postId));
  }

  getPostByIdOrThrow(postId) {
    const normalizedPostId = String(postId || '').trim();
    if (!normalizedPostId) {
      throw new FeedApiError(400, 'invalid_post_id', 'postId is required');
    }

    const post = this.postById.get(normalizedPostId);
    if (!post) {
      throw new FeedApiError(404, 'post_not_found', 'post not found');
    }
    return post;
  }

  listPosts({ q, category, cursor, limit, userId }) {
    const normalizedQuery = normalizeQuery(q);
    const normalizedCategory = normalizeCategory(category);
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const authenticated = Boolean(userId);

    const filtered = this.posts.filter((post) => {
      if (normalizedCategory && post.category !== normalizedCategory) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      const haystack = [post.title, post.excerpt, post.author, post.category].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    const paged = filtered.slice(normalizedCursor, normalizedCursor + normalizedLimit);
    const nextOffset = normalizedCursor + paged.length;
    const nextCursor = nextOffset < filtered.length ? String(nextOffset) : null;

    return {
      items: paged.map((post) =>
        toFeedPost(post, {
          authenticated,
          saved: this.isSavedByUser(userId, post.id)
        })
      ),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total: filtered.length
      }
    };
  }

  listSavedPosts({ userId, cursor, limit }) {
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const savedMap = this.getSavedMapForUser(userId);
    const ids = Array.from(savedMap.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([postId]) => postId)
      .filter((postId) => this.postById.has(postId));

    const pagedIds = ids.slice(normalizedCursor, normalizedCursor + normalizedLimit);
    const nextOffset = normalizedCursor + pagedIds.length;
    const nextCursor = nextOffset < ids.length ? String(nextOffset) : null;

    return {
      items: pagedIds.map((postId) =>
        toFeedPost(this.postById.get(postId), {
          authenticated: true,
          saved: true
        })
      ),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total: ids.length
      }
    };
  }

  savePost({ userId, postId }) {
    const post = this.getPostByIdOrThrow(postId);
    const savedMap = this.getSavedMapForUser(userId);
    const created = !savedMap.has(post.id);
    if (created) {
      savedMap.set(post.id, Date.now());
    }
    return {
      saved: true,
      created,
      postId: post.id
    };
  }

  unsavePost({ userId, postId }) {
    const post = this.getPostByIdOrThrow(postId);
    const savedMap = this.getSavedMapForUser(userId);
    const removed = savedMap.delete(post.id);
    return {
      saved: false,
      removed,
      postId: post.id
    };
  }
}

export function createFeedService(options = {}) {
  return new FeedService(options);
}

export function isFeedApiError(error) {
  return error instanceof FeedApiError;
}
