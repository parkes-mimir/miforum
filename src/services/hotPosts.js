/**
 * hotPosts.js - 个性化热门帖子算法
 *
 * 使用 Discourse 启发的评分公式，结合用户行为进行个性化排序。
 * SQL 负责聚合和过滤，JS 负责个性化加权。
 */

const { parseJsonField, intToBool } = require('../utils/helpers');
const { getLevelInfo } = require('../controllers/level');

const DECAY_EXPONENT = 1.5;
const DECAY_OFFSET = 2;
const MAX_AGE_DAYS = 30;

const WEIGHT_LIKES = 3;
const WEIGHT_COMMENTS = 2;
const WEIGHT_BOOKMARKS = 1;

const BOOST_CATEGORY = 1.5;
const BOOST_AUTHOR = 1.3;
const QUALITY_IMAGES = 1.2;
const QUALITY_LONG_CONTENT = 1.1;
const LONG_CONTENT_THRESHOLD = 100;

/**
 * 获取当前用户交互过的分类集合
 */
function getUserInteractedCategories(db, userId) {
  if (!userId) return new Set();
  const liked = db.prepare(`
    SELECT DISTINCT p.category FROM post_likes pl
    JOIN posts p ON p.id = pl.post_id WHERE pl.user_id = ?
  `).all(userId);
  const commented = db.prepare(`
    SELECT DISTINCT p.category FROM comments c
    JOIN posts p ON p.id = c.post_id WHERE c.author_id = ?
  `).all(userId);
  const set = new Set();
  liked.forEach(r => set.add(r.category));
  commented.forEach(r => set.add(r.category));
  return set;
}

/**
 * 获取当前用户交互过的作者集合
 */
function getUserInteractedAuthors(db, userId) {
  if (!userId) return new Set();
  const liked = db.prepare(`
    SELECT DISTINCT p.author_id FROM post_likes pl
    JOIN posts p ON p.id = pl.post_id WHERE pl.user_id = ?
  `).all(userId);
  const commented = db.prepare(`
    SELECT DISTINCT p.author_id FROM comments c
    JOIN posts p ON p.id = c.post_id WHERE c.author_id = ?
  `).all(userId);
  const set = new Set();
  liked.forEach(r => set.add(r.author_id));
  commented.forEach(r => set.add(r.author_id));
  return set;
}

/**
 * 计算帖子的最终热度分数
 */
function calculateScore(row, interactedCategories, interactedAuthors) {
  const baseScore = row.likes_count * WEIGHT_LIKES
    + row.comments_count * WEIGHT_COMMENTS
    + row.bookmarks_count * WEIGHT_BOOKMARKS;

  const ageHours = Math.max(0, (Date.now() - new Date(row.created_at + 'Z').getTime()) / 3600000);
  const decay = 1 / Math.pow(ageHours + DECAY_OFFSET, DECAY_EXPONENT);

  const hasImages = parseJsonField(row.images, []).length > 0;
  const contentLength = (row.content || '').length;
  const quality = (hasImages ? QUALITY_IMAGES : 1.0) * (contentLength > LONG_CONTENT_THRESHOLD ? QUALITY_LONG_CONTENT : 1.0);

  const categoryBoost = interactedCategories.has(row.category) ? BOOST_CATEGORY : 1.0;
  const authorBoost = interactedAuthors.has(row.author_id) ? BOOST_AUTHOR : 1.0;

  const randomFactor = 0.9 + Math.random() * 0.2;

  return baseScore * decay * quality * categoryBoost * authorBoost * randomFactor;
}

/**
 * 获取热门帖子（带个性化排序）
 *
 * @param {Object} db - better-sqlite3 数据库实例
 * @param {number|null} userId - 当前用户 ID（null 表示未登录）
 * @param {number} page - 页码（从 1 开始）
 * @param {number} limit - 每页数量
 * @returns {{ posts: Object[], pagination: { page: number, limit: number, total: number, pages: number } }}
 */
function getHotPosts(db, userId, page, limit) {
  page = Math.max(1, parseInt(page) || 1);
  limit = Math.min(50, Math.max(1, parseInt(limit) || 20));

  const cutoffDate = new Date(Date.now() - MAX_AGE_DAYS * 86400000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  let privacyFilter = 'AND p.private = 0';
  const params = [cutoffDate];

  if (userId) {
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
    const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
    if (isAdmin) {
      privacyFilter = '';
    } else {
      privacyFilter = 'AND (p.private = 0 OR p.author_id = ?)';
      params.push(userId);
    }
  }

  const rows = db.prepare(`
    SELECT p.*,
      pr.display_id AS author_display_id, pr.username AS author_name,
      pr.avatar_url AS author_avatar_url, pr.title AS author_title,
      pr.avatar_frame AS author_avatar_frame, pr.exp AS author_exp,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
      (SELECT COUNT(*) FROM bookmarks WHERE post_id = p.id) AS bookmarks_count
    FROM posts p
    LEFT JOIN profiles pr ON pr.id = p.author_id
    WHERE p.created_at >= ? ${privacyFilter}
    ORDER BY p.pinned DESC, p.created_at DESC
  `).all(...params);

  const interactedCategories = getUserInteractedCategories(db, userId);
  const interactedAuthors = getUserInteractedAuthors(db, userId);

  const scored = rows.map(row => ({
    row,
    score: calculateScore(row, interactedCategories, interactedAuthors)
  }));

  scored.sort((a, b) => b.score - a.score);

  const total = scored.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const paged = scored.slice(offset, offset + limit);

  const posts = paged.map(({ row: p, score }) => ({
    ...p,
    tags: parseJsonField(p.tags, []),
    images: parseJsonField(p.images, []),
    pinned: intToBool(p.pinned),
    private: intToBool(p.private),
    author_avatar_url: p.author_avatar_url || null,
    author_title: p.author_title || null,
    author_avatar_frame: p.author_avatar_frame || null,
    author_level_info: getLevelInfo(p.author_exp || 0),
    hot_score: Math.round(score * 100) / 100
  }));

  return {
    posts,
    pagination: { page, limit, total, pages }
  };
}

module.exports = { getHotPosts };
