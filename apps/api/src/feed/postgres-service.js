import { randomUUID } from 'node:crypto';
import { POST_SEED_DATA, FeedApiError, createFeedService } from './service.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

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

function normalizePostId(postId) {
  const normalized = String(postId || '').trim();
  if (!normalized) {
    throw new FeedApiError(400, 'invalid_post_id', 'postId is required');
  }
  return normalized;
}

function mapPostRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    author: row.author,
    imageUrl: row.image_url || null,
    publishedAt: new Date(row.published_at).toISOString()
  };
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

function toAdminPost(post) {
  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    author: post.author,
    imageUrl: post.imageUrl,
    publishedAt: post.publishedAt
  };
}

async function upsertPostToDb(pool, post) {
  await pool.query(
    `
      INSERT INTO feed_posts (
        id,
        title,
        excerpt,
        category,
        author,
        image_url,
        published_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
      ON CONFLICT (id)
      DO UPDATE SET
        title = EXCLUDED.title,
        excerpt = EXCLUDED.excerpt,
        category = EXCLUDED.category,
        author = EXCLUDED.author,
        image_url = EXCLUDED.image_url,
        published_at = EXCLUDED.published_at,
        updated_at = NOW()
    `,
    [post.id, post.title, post.excerpt, post.category, post.author, post.imageUrl, post.publishedAt]
  );
}

async function seedPostsIfEmpty(pool) {
  const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM feed_posts');
  const count = Number(countResult.rows[0]?.count || 0);
  if (count > 0) {
    return;
  }

  for (const post of POST_SEED_DATA) {
    await upsertPostToDb(pool, post);
  }
}

async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export class PostgresFeedService {
  constructor({ pool }) {
    this.pool = pool;
    this.adminCreateValidator = createFeedService({ posts: [] });
  }

  async getPostByIdOrThrow(postId, { queryable = this.pool, lockClause = '' } = {}) {
    const normalizedPostId = normalizePostId(postId);
    const normalizedLockClause = String(lockClause || '').trim();
    const result = await queryable.query(
      `
        SELECT
          id,
          title,
          excerpt,
          category,
          author,
          image_url,
          published_at
        FROM feed_posts
        WHERE id = $1
        LIMIT 1
        ${normalizedLockClause}
      `,
      [normalizedPostId]
    );
    const post = mapPostRow(result.rows[0]);
    if (!post) {
      throw new FeedApiError(404, 'post_not_found', 'post not found');
    }
    return post;
  }

  async listPosts({ q, category, cursor, limit, userId }) {
    const normalizedQuery = normalizeQuery(q);
    const normalizedCategory = normalizeCategory(category);
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);
    const authenticated = Boolean(userId);

    const whereParts = [];
    const params = [];
    if (normalizedCategory) {
      params.push(normalizedCategory);
      whereParts.push(`category = $${params.length}`);
    }
    if (normalizedQuery) {
      params.push(`%${normalizedQuery}%`);
      whereParts.push(`
        LOWER(CONCAT_WS(' ', title, excerpt, author, category)) LIKE $${params.length}
      `);
    }
    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countResult = await this.pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM feed_posts
        ${whereClause}
      `,
      params
    );
    const total = Number(countResult.rows[0]?.count || 0);

    const listParams = [...params, normalizedLimit, normalizedCursor];
    const listResult = await this.pool.query(
      `
        SELECT
          id,
          title,
          excerpt,
          category,
          author,
          image_url,
          published_at
        FROM feed_posts
        ${whereClause}
        ORDER BY published_at DESC, created_at DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      listParams
    );
    const posts = listResult.rows.map((row) => mapPostRow(row));
    const nextOffset = normalizedCursor + posts.length;
    const nextCursor = nextOffset < total ? String(nextOffset) : null;

    let savedPostIds = new Set();
    if (authenticated && posts.length > 0) {
      const ids = posts.map((post) => post.id);
      const savedResult = await this.pool.query(
        `
          SELECT post_id
          FROM user_saved_posts
          WHERE user_id = $1 AND post_id = ANY($2::text[])
        `,
        [userId, ids]
      );
      savedPostIds = new Set(savedResult.rows.map((row) => row.post_id));
    }

    return {
      items: posts.map((post) =>
        toFeedPost(post, {
          authenticated,
          saved: authenticated && savedPostIds.has(post.id)
        })
      ),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total
      }
    };
  }

  async listSavedPosts({ userId, cursor, limit }) {
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);

    const countResult = await this.pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM user_saved_posts usp
        JOIN feed_posts fp ON fp.id = usp.post_id
        WHERE usp.user_id = $1
      `,
      [userId]
    );
    const total = Number(countResult.rows[0]?.count || 0);

    const listResult = await this.pool.query(
      `
        SELECT
          fp.id,
          fp.title,
          fp.excerpt,
          fp.category,
          fp.author,
          fp.image_url,
          fp.published_at
        FROM user_saved_posts usp
        JOIN feed_posts fp ON fp.id = usp.post_id
        WHERE usp.user_id = $1
        ORDER BY usp.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [userId, normalizedLimit, normalizedCursor]
    );
    const posts = listResult.rows.map((row) => mapPostRow(row));
    const nextOffset = normalizedCursor + posts.length;
    const nextCursor = nextOffset < total ? String(nextOffset) : null;

    return {
      items: posts.map((post) =>
        toFeedPost(post, {
          authenticated: true,
          saved: true
        })
      ),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total
      }
    };
  }

  async savePost({ userId, postId }) {
    return withTransaction(this.pool, async (client) => {
      const post = await this.getPostByIdOrThrow(postId, {
        queryable: client,
        lockClause: 'FOR UPDATE'
      });
      const result = await client.query(
        `
          INSERT INTO user_saved_posts (id, user_id, post_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, post_id) DO NOTHING
        `,
        [randomUUID(), userId, post.id]
      );
      return {
        saved: true,
        created: result.rowCount > 0,
        postId: post.id
      };
    });
  }

  async unsavePost({ userId, postId }) {
    const post = await this.getPostByIdOrThrow(postId);
    const result = await this.pool.query(
      `
        DELETE FROM user_saved_posts
        WHERE user_id = $1 AND post_id = $2
      `,
      [userId, post.id]
    );
    return {
      saved: false,
      removed: result.rowCount > 0,
      postId: post.id
    };
  }

  async listAdminPosts({ q, category, cursor, limit }) {
    const normalizedQuery = normalizeQuery(q);
    const normalizedCategory = normalizeCategory(category);
    const normalizedCursor = normalizeCursor(cursor);
    const normalizedLimit = normalizeLimit(limit);

    const whereParts = [];
    const params = [];
    if (normalizedCategory) {
      params.push(normalizedCategory);
      whereParts.push(`category = $${params.length}`);
    }
    if (normalizedQuery) {
      params.push(`%${normalizedQuery}%`);
      whereParts.push(`
        LOWER(CONCAT_WS(' ', title, excerpt, author, category)) LIKE $${params.length}
      `);
    }
    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countResult = await this.pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM feed_posts
        ${whereClause}
      `,
      params
    );
    const total = Number(countResult.rows[0]?.count || 0);

    const listParams = [...params, normalizedLimit, normalizedCursor];
    const listResult = await this.pool.query(
      `
        SELECT
          id,
          title,
          excerpt,
          category,
          author,
          image_url,
          published_at
        FROM feed_posts
        ${whereClause}
        ORDER BY published_at DESC, created_at DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      listParams
    );
    const posts = listResult.rows.map((row) => mapPostRow(row));
    const nextOffset = normalizedCursor + posts.length;
    const nextCursor = nextOffset < total ? String(nextOffset) : null;

    return {
      items: posts.map((post) => toAdminPost(post)),
      pageInfo: {
        cursor: String(normalizedCursor),
        nextCursor,
        limit: normalizedLimit,
        total
      }
    };
  }

  async createPost(payload) {
    const result = this.adminCreateValidator.createPost(payload);
    await upsertPostToDb(this.pool, result.post);
    return result;
  }

  async updatePost({ postId, ...patch }) {
    return withTransaction(this.pool, async (client) => {
      const existing = await this.getPostByIdOrThrow(postId, {
        queryable: client,
        lockClause: 'FOR UPDATE'
      });
      const validationService = createFeedService({ posts: [existing] });
      const result = validationService.updatePost({ postId: existing.id, ...patch });
      await upsertPostToDb(client, result.post);
      return result;
    });
  }

  async deletePost({ postId }) {
    const normalizedPostId = normalizePostId(postId);
    const result = await this.pool.query(
      `
        DELETE FROM feed_posts
        WHERE id = $1
        RETURNING id
      `,
      [normalizedPostId]
    );
    if (result.rowCount === 0) {
      throw new FeedApiError(404, 'post_not_found', 'post not found');
    }
    return {
      removed: true,
      postId: result.rows[0].id
    };
  }
}

export async function createPostgresFeedService({ pool }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('Postgres feed service requires a pg pool');
  }

  await seedPostsIfEmpty(pool);
  return new PostgresFeedService({ pool });
}
