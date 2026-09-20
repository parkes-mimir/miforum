/**
 * recommend.js - 推荐帖子算法
 *
 * 推荐算法更注重新鲜度和内容质量，
 * 降低点赞权重，让新帖子有机会被看到。
 */

const { parseJsonField } = require('../utils/helpers');
const { isAdmin, formatPost } = require('./post-helper');

// 推荐算法参数（更注重新帖子）
const DECAY_EXPONENT = 1.0; // 降低衰减速度
const DECAY_OFFSET = 0.5;
const MAX_AGE_DAYS = 30; // 显示30天内的帖子

// 权重更低
const WEIGHT_LIKES = 1;
const WEIGHT_COMMENTS = 2;
const WEIGHT_BOOKMARKS = 0.5;

// 新帖加分（大幅提高）
const NEW_POST_BOOST_1H = 100; // 1小时内
const NEW_POST_BOOST_6H = 60; // 6小时内
const NEW_POST_BOOST_24H = 30; // 24小时内
const NEW_POST_BOOST_3D = 10; // 3天内

/**
 * 计算推荐分数
 */
function calculateRecommendScore(row) {
  const baseScore =
    row.likes_count * WEIGHT_LIKES + row.comments_count * WEIGHT_COMMENTS + row.bookmarks_count * WEIGHT_BOOKMARKS;

  const ageHours = Math.max(0, (Date.now() - new Date(row.created_at + 'Z').getTime()) / 3600000);
  const decay = 1 / Math.pow(ageHours + DECAY_OFFSET, DECAY_EXPONENT);

  // 新帖加分（时间越短加分越高）
  let newBoost = 0;
  if (ageHours < 1) newBoost = NEW_POST_BOOST_1H;
  else if (ageHours < 6) newBoost = NEW_POST_BOOST_6H;
  else if (ageHours < 24) newBoost = NEW_POST_BOOST_24H;
  else if (ageHours < 72) newBoost = NEW_POST_BOOST_3D;

  // 内容质量
  const hasImages = parseJsonField(row.images, []).length > 0;
  const contentLength = (row.content || '').length;
  const quality = (hasImages ? 1.1 : 1.0) * (contentLength > 50 ? 1.05 : 1.0);

  const randomFactor = 0.95 + Math.random() * 0.1;

  return (baseScore + newBoost) * decay * quality * randomFactor;
}

/**
 * 获取推荐帖子
 */
function getRecommendPosts(db, userId, page, limit) {
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const cutoffDate = new Date(Date.now() - MAX_AGE_DAYS * 86400000).toISOString().slice(0, 19).replace('T', ' ');

  let privacyFilter = 'AND p.private = 0';
  let visibilityFilter = '';
  const params = [cutoffDate];

  if (userId) {
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
    if (isAdmin(user)) {
      privacyFilter = '';
    } else {
      privacyFilter = 'AND (p.private = 0 OR p.author_id = ?)';
      params.push(userId);

      visibilityFilter = `AND (
        p.category NOT IN (SELECT name FROM categories WHERE visibility IN ('members', 'selected') AND channel_id IS NOT NULL)
        OR p.category IN (
          SELECT c.name FROM categories c
          JOIN channel_members cm ON cm.channel_id = c.channel_id AND cm.user_id = ?
          WHERE c.visibility = 'members' AND c.channel_id IS NOT NULL
        )
        OR p.category IN (
          SELECT c.name FROM categories c
          JOIN board_visible_members bvm ON bvm.board_id = c.id AND bvm.user_id = ?
          WHERE c.visibility = 'selected' AND c.channel_id IS NOT NULL
        )
      )`;
      params.push(userId, userId);
    }
  } else {
    visibilityFilter =
      "AND p.category NOT IN (SELECT name FROM categories WHERE visibility IN ('members', 'selected') AND channel_id IS NOT NULL)";
  }

  const candidateLimit = Math.max(200, page * limit * 3);
  const rows = db
    .prepare(
      `
    SELECT p.*,
      pr.display_id AS author_display_id, pr.username AS author_name,
      pr.avatar_url AS author_avatar_url, pr.title AS author_title,
      pr.avatar_frame AS author_avatar_frame, pr.exp AS author_exp,
      (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
      (SELECT COUNT(*) FROM bookmarks WHERE post_id = p.id) AS bookmarks_count
    FROM posts p
    LEFT JOIN profiles pr ON pr.id = p.author_id
    WHERE p.created_at >= ? ${privacyFilter} ${visibilityFilter}
    ORDER BY p.pinned DESC, p.created_at DESC
    LIMIT ?
  `
    )
    .all(...params, candidateLimit);

  const scored = rows.map((row) => ({
    row,
    score: calculateRecommendScore(row)
  }));

  scored.sort((a, b) => {
    if (a.row.pinned !== b.row.pinned) return b.row.pinned - a.row.pinned;
    return b.score - a.score;
  });

  const total = scored.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const paged = scored.slice(offset, offset + limit);

  const posts = paged.map(({ row: p, score }) => ({
    ...formatPost(p),
    recommend_score: Math.round(score * 100) / 100
  }));

  return {
    posts,
    pagination: { page, limit, total, pages }
  };
}

module.exports = { getRecommendPosts };
