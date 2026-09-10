/**
 * notification.js - Notification service
 */

const VALID_TYPES = ['like', 'comment', 'bookmark'];

/**
 * Create a notification (skips self-notifications)
 * @param {Object} db - Database instance
 * @param {Object} params
 * @param {number} params.userId - Recipient user ID
 * @param {number} params.fromUserId - Sender user ID
 * @param {string} params.type - Notification type ('like', 'comment', 'bookmark')
 * @param {number} [params.postId] - Related post ID
 * @returns {number|null} Notification ID or null if skipped
 */
function createNotification(db, { userId, fromUserId, type, postId }) {
  if (userId === fromUserId) return null;
  if (!VALID_TYPES.includes(type)) return null;

  // 防止重复通知（同一用户对同一帖子的同一类型通知，10分钟内不重复创建）
  if (postId) {
    const recent = db
      .prepare(
        `
      SELECT id FROM notifications 
      WHERE user_id = ? AND from_user_id = ? AND type = ? AND post_id = ?
        AND created_at > datetime('now', '-10 minutes')
    `
      )
      .get(userId, fromUserId, type, postId);
    if (recent) return null;
  }

  const result = db
    .prepare(
      `
    INSERT INTO notifications (user_id, from_user_id, type, post_id)
    VALUES (?, ?, ?, ?)
  `
    )
    .run(userId, fromUserId, type, postId || null);
  return result.lastInsertRowid;
}

module.exports = { createNotification };
