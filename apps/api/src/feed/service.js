import { randomUUID } from 'node:crypto';

export class FeedApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_BULK_ITEMS = 100;
const MAX_TITLE_LENGTH = 180;
const MAX_EXCERPT_LENGTH = 600;
const MAX_CATEGORY_LENGTH = 64;
const MAX_AUTHOR_LENGTH = 120;
const FEED_LIFECYCLE_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'SCHEDULED']);
const FEED_BULK_ACTIONS = new Set(['PUBLISH', 'UNPUBLISH', 'SCHEDULE', 'DELETE']);

export const POST_SEED_DATA = [
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
].map((post) => ({
  ...post,
  lifecycleStatus: 'PUBLISHED',
  scheduledAt: null
}));

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

function normalizeRequiredCategory(category) {
  const normalized = normalizeCategory(category);
  if (!normalized) {
    throw new FeedApiError(400, 'invalid_category', 'category is required');
  }
  if (normalized.length > MAX_CATEGORY_LENGTH) {
    throw new FeedApiError(400, 'invalid_category', `category must be <= ${MAX_CATEGORY_LENGTH} characters`);
  }
  return normalized;
}

function normalizeOptionalCategory(category) {
  if (category === undefined) {
    return undefined;
  }
  return normalizeRequiredCategory(category);
}

function normalizeQuery(q) {
  return String(q || '')
    .trim()
    .toLowerCase();
}

function normalizeRequiredTitle(title) {
  const normalized = String(title || '').trim();
  if (normalized.length < 2 || normalized.length > MAX_TITLE_LENGTH) {
    throw new FeedApiError(400, 'invalid_title', `title must be between 2 and ${MAX_TITLE_LENGTH} characters`);
  }
  return normalized;
}

function normalizeOptionalTitle(title) {
  if (title === undefined) {
    return undefined;
  }
  return normalizeRequiredTitle(title);
}

function normalizeRequiredExcerpt(excerpt) {
  const normalized = String(excerpt || '').trim();
  if (normalized.length < 2 || normalized.length > MAX_EXCERPT_LENGTH) {
    throw new FeedApiError(
      400,
      'invalid_excerpt',
      `excerpt must be between 2 and ${MAX_EXCERPT_LENGTH} characters`
    );
  }
  return normalized;
}

function normalizeOptionalExcerpt(excerpt) {
  if (excerpt === undefined) {
    return undefined;
  }
  return normalizeRequiredExcerpt(excerpt);
}

function normalizeRequiredAuthor(author) {
  const normalized = String(author || '').trim();
  if (normalized.length < 2 || normalized.length > MAX_AUTHOR_LENGTH) {
    throw new FeedApiError(400, 'invalid_author', `author must be between 2 and ${MAX_AUTHOR_LENGTH} characters`);
  }
  return normalized;
}

function normalizeOptionalAuthor(author) {
  if (author === undefined) {
    return undefined;
  }
  return normalizeRequiredAuthor(author);
}

function normalizeOptionalImageUrl(imageUrl) {
  if (imageUrl === undefined) {
    return undefined;
  }
  if (imageUrl === null) {
    return null;
  }
  const normalized = String(imageUrl || '').trim();
  if (!normalized) {
    return null;
  }
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('invalid');
    }
  } catch {
    throw new FeedApiError(400, 'invalid_image_url', 'imageUrl must be a valid http(s) URL');
  }
  return normalized;
}

function normalizePublishedAt(publishedAt) {
  if (publishedAt === undefined || publishedAt === null || String(publishedAt).trim() === '') {
    return new Date().toISOString();
  }
  const normalized = String(publishedAt).trim();
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) {
    throw new FeedApiError(400, 'invalid_published_at', 'publishedAt must be valid ISO date-time');
  }
  return new Date(parsed).toISOString();
}

function normalizeRequiredLifecycleStatus(status, fieldName = 'status') {
  const normalized = String(status || '')
    .trim()
    .toUpperCase();
  if (!FEED_LIFECYCLE_STATUSES.has(normalized)) {
    throw new FeedApiError(
      400,
      'invalid_lifecycle_status',
      `${fieldName} must be one of ${Array.from(FEED_LIFECYCLE_STATUSES).join(', ')}`
    );
  }
  return normalized;
}

function normalizeOptionalLifecycleStatus(status, fieldName = 'status') {
  if (status === undefined) {
    return undefined;
  }
  return normalizeRequiredLifecycleStatus(status, fieldName);
}

function normalizeRequiredLifecycleDate(value, fieldName) {
  const normalized = String(value || '').trim();
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) {
    throw new FeedApiError(400, 'invalid_lifecycle_date', `${fieldName} must be valid ISO date-time`);
  }
  return new Date(timestamp).toISOString();
}

function normalizeOptionalLifecycleDate(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || String(value).trim() === '') {
    return null;
  }
  return normalizeRequiredLifecycleDate(value, fieldName);
}

function normalizeBulkAction(action) {
  const normalized = String(action || '')
    .trim()
    .toUpperCase();
  if (!FEED_BULK_ACTIONS.has(normalized)) {
    throw new FeedApiError(
      400,
      'invalid_bulk_action',
      `action must be one of ${Array.from(FEED_BULK_ACTIONS).join(', ')}`
    );
  }
  return normalized;
}

function normalizeBulkPostIds(postIds) {
  if (!Array.isArray(postIds) || postIds.length === 0) {
    throw new FeedApiError(400, 'invalid_post_ids', 'postIds must be a non-empty array');
  }
  if (postIds.length > MAX_BULK_ITEMS) {
    throw new FeedApiError(400, 'invalid_post_ids', `postIds must not exceed ${MAX_BULK_ITEMS} items`);
  }
  const normalized = [];
  const seen = new Set();
  for (const value of postIds) {
    const id = String(value || '').trim();
    if (!id) {
      throw new FeedApiError(400, 'invalid_post_ids', 'postIds must contain non-empty ids');
    }
    if (!seen.has(id)) {
      seen.add(id);
      normalized.push(id);
    }
  }
  return normalized;
}

function resolveEffectiveLifecycleStatus({ lifecycleStatus, scheduledAt }) {
  if (lifecycleStatus === 'SCHEDULED') {
    if (!scheduledAt) {
      return 'DRAFT';
    }
    return Date.parse(scheduledAt) <= Date.now() ? 'PUBLISHED' : 'SCHEDULED';
  }
  return lifecycleStatus;
}

function isPostPubliclyVisible(post) {
  return resolveEffectiveLifecycleStatus(post) === 'PUBLISHED';
}

function toLifecycleState(post) {
  return {
    status: post.lifecycleStatus,
    effectiveStatus: resolveEffectiveLifecycleStatus(post),
    publishedAt: post.publishedAt || null,
    scheduledAt: post.scheduledAt || null
  };
}

function sortByPublishedAtDesc(left, right) {
  const leftTime = left.publishedAt ? Date.parse(left.publishedAt) : Number.NEGATIVE_INFINITY;
  const rightTime = right.publishedAt ? Date.parse(right.publishedAt) : Number.NEGATIVE_INFINITY;
  return rightTime - leftTime;
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
    lifecycle: toLifecycleState(post),
    viewerState: {
      authenticated,
      saved
    }
  };
}

function toAdminPost(post) {
  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    author: post.author,
    imageUrl: post.imageUrl,
    publishedAt: post.publishedAt,
    lifecycle: toLifecycleState(post)
  };
}

export class FeedService {
  constructor({ posts = POST_SEED_DATA } = {}) {
    this.posts = Array.from(posts)
      .map((post) => ({
        ...post,
        lifecycleStatus: normalizeRequiredLifecycleStatus(post.lifecycleStatus || 'PUBLISHED', 'lifecycle.status'),
        publishedAt: post.publishedAt ? normalizeRequiredLifecycleDate(post.publishedAt, 'publishedAt') : null,
        scheduledAt: post.scheduledAt ? normalizeRequiredLifecycleDate(post.scheduledAt, 'scheduledAt') : null
      }))
      .sort(sortByPublishedAtDesc);
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
      if (!isPostPubliclyVisible(post)) {
        return false;
      }
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
    if (!isPostPubliclyVisible(post)) {
      throw new FeedApiError(404, 'post_not_found', 'post not found');
    }
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

  listAdminPosts({ q, category, cursor, limit }) {
    const normalizedQuery = normalizeQuery(q);
    const normalizedCategory = normalizeCategory(category);
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);

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
      items: paged.map((post) => toAdminPost(post)),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total: filtered.length
      }
    };
  }

  createPost({ title, excerpt, category, author, imageUrl, publishedAt, lifecycle }) {
    if (lifecycle !== undefined && (typeof lifecycle !== 'object' || Array.isArray(lifecycle))) {
      throw new FeedApiError(400, 'invalid_lifecycle', 'lifecycle must be an object');
    }
    const lifecycleStatus = normalizeOptionalLifecycleStatus(lifecycle?.status, 'lifecycle.status') || 'PUBLISHED';
    let normalizedPublishedAt = normalizeOptionalLifecycleDate(
      lifecycle?.publishedAt ?? publishedAt,
      'lifecycle.publishedAt'
    );
    let normalizedScheduledAt = normalizeOptionalLifecycleDate(lifecycle?.scheduledAt, 'lifecycle.scheduledAt');
    if (lifecycleStatus === 'PUBLISHED') {
      normalizedPublishedAt = normalizedPublishedAt || new Date().toISOString();
      normalizedScheduledAt = null;
    } else if (lifecycleStatus === 'DRAFT') {
      normalizedPublishedAt = null;
      normalizedScheduledAt = null;
    } else {
      if (!normalizedScheduledAt) {
        throw new FeedApiError(
          400,
          'invalid_lifecycle_date',
          'lifecycle.scheduledAt is required when lifecycle.status is SCHEDULED'
        );
      }
      normalizedPublishedAt = normalizedScheduledAt;
    }

    const post = {
      id: randomUUID(),
      title: normalizeRequiredTitle(title),
      excerpt: normalizeRequiredExcerpt(excerpt),
      category: normalizeRequiredCategory(category),
      author: normalizeRequiredAuthor(author),
      imageUrl: normalizeOptionalImageUrl(imageUrl) ?? null,
      publishedAt: normalizedPublishedAt,
      lifecycleStatus,
      scheduledAt: normalizedScheduledAt
    };

    this.posts.push(post);
    this.posts.sort(sortByPublishedAtDesc);
    this.postById.set(post.id, post);
    return { post: toAdminPost(post) };
  }

  updatePost({ postId, title, excerpt, category, author, imageUrl, publishedAt, lifecycle }) {
    const post = this.getPostByIdOrThrow(postId);
    if (lifecycle !== undefined && (typeof lifecycle !== 'object' || Array.isArray(lifecycle))) {
      throw new FeedApiError(400, 'invalid_lifecycle', 'lifecycle must be an object');
    }
    const patch = {
      title: normalizeOptionalTitle(title),
      excerpt: normalizeOptionalExcerpt(excerpt),
      category: normalizeOptionalCategory(category),
      author: normalizeOptionalAuthor(author),
      imageUrl: normalizeOptionalImageUrl(imageUrl),
      publishedAt: normalizeOptionalLifecycleDate(
        lifecycle?.publishedAt ?? (publishedAt === undefined ? undefined : normalizePublishedAt(publishedAt)),
        'lifecycle.publishedAt'
      ),
      lifecycleStatus: normalizeOptionalLifecycleStatus(lifecycle?.status, 'lifecycle.status'),
      scheduledAt: normalizeOptionalLifecycleDate(lifecycle?.scheduledAt, 'lifecycle.scheduledAt')
    };

    if (patch.title !== undefined) {
      post.title = patch.title;
    }
    if (patch.excerpt !== undefined) {
      post.excerpt = patch.excerpt;
    }
    if (patch.category !== undefined) {
      post.category = patch.category;
    }
    if (patch.author !== undefined) {
      post.author = patch.author;
    }
    if (patch.imageUrl !== undefined) {
      post.imageUrl = patch.imageUrl;
    }
    if (patch.publishedAt !== undefined) {
      post.publishedAt = patch.publishedAt;
    }
    if (lifecycle !== undefined) {
      let nextStatus = patch.lifecycleStatus === undefined ? post.lifecycleStatus : patch.lifecycleStatus;
      let nextPublishedAt = patch.publishedAt === undefined ? post.publishedAt : patch.publishedAt;
      let nextScheduledAt = patch.scheduledAt === undefined ? post.scheduledAt : patch.scheduledAt;
      if (nextStatus === 'PUBLISHED') {
        nextPublishedAt = nextPublishedAt || new Date().toISOString();
        nextScheduledAt = null;
      } else if (nextStatus === 'DRAFT') {
        nextPublishedAt = null;
        nextScheduledAt = null;
      } else {
        if (!nextScheduledAt) {
          throw new FeedApiError(
            400,
            'invalid_lifecycle_date',
            'lifecycle.scheduledAt is required when lifecycle.status is SCHEDULED'
          );
        }
        nextPublishedAt = nextScheduledAt;
      }
      post.lifecycleStatus = nextStatus;
      post.publishedAt = nextPublishedAt;
      post.scheduledAt = nextScheduledAt;
    }

    this.posts.sort(sortByPublishedAtDesc);
    return { post: toAdminPost(post) };
  }

  publishPost({ postId, publishedAt }) {
    const post = this.getPostByIdOrThrow(postId);
    post.lifecycleStatus = 'PUBLISHED';
    post.publishedAt = normalizeOptionalLifecycleDate(publishedAt, 'publishedAt') || new Date().toISOString();
    post.scheduledAt = null;
    this.posts.sort(sortByPublishedAtDesc);
    return { post: toAdminPost(post) };
  }

  unpublishPost({ postId }) {
    const post = this.getPostByIdOrThrow(postId);
    post.lifecycleStatus = 'DRAFT';
    post.publishedAt = null;
    post.scheduledAt = null;
    this.posts.sort(sortByPublishedAtDesc);
    return { post: toAdminPost(post) };
  }

  schedulePost({ postId, scheduledAt }) {
    const post = this.getPostByIdOrThrow(postId);
    const normalizedScheduledAt = normalizeRequiredLifecycleDate(scheduledAt, 'scheduledAt');
    post.lifecycleStatus = 'SCHEDULED';
    post.publishedAt = normalizedScheduledAt;
    post.scheduledAt = normalizedScheduledAt;
    this.posts.sort(sortByPublishedAtDesc);
    return { post: toAdminPost(post) };
  }

  bulkUpdatePosts({ action, postIds, scheduledAt, publishedAt }) {
    const normalizedAction = normalizeBulkAction(action);
    const normalizedPostIds = normalizeBulkPostIds(postIds);
    const results = [];

    for (const postId of normalizedPostIds) {
      try {
        if (normalizedAction === 'PUBLISH') {
          const result = this.publishPost({ postId, publishedAt });
          results.push({ postId, success: true, lifecycle: result.post.lifecycle });
          continue;
        }
        if (normalizedAction === 'UNPUBLISH') {
          const result = this.unpublishPost({ postId });
          results.push({ postId, success: true, lifecycle: result.post.lifecycle });
          continue;
        }
        if (normalizedAction === 'SCHEDULE') {
          const result = this.schedulePost({ postId, scheduledAt });
          results.push({ postId, success: true, lifecycle: result.post.lifecycle });
          continue;
        }
        const result = this.deletePost({ postId });
        results.push({ postId, success: true, removed: result.removed });
      } catch (error) {
        if (isFeedApiError(error)) {
          results.push({
            postId,
            success: false,
            error: {
              code: error.code,
              message: error.message
            }
          });
          continue;
        }
        throw error;
      }
    }

    const successCount = results.filter((item) => item.success).length;
    return {
      action: normalizedAction,
      total: normalizedPostIds.length,
      successCount,
      failureCount: normalizedPostIds.length - successCount,
      results
    };
  }

  deletePost({ postId }) {
    const post = this.getPostByIdOrThrow(postId);
    this.postById.delete(post.id);
    this.posts = this.posts.filter((item) => item.id !== post.id);

    for (const savedMap of this.savedPostMapByUserId.values()) {
      savedMap.delete(post.id);
    }

    return {
      removed: true,
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
