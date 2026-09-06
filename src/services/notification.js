/**
 * notification.js - Notification service
 */

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
  const result = db.prepare(`
    INSERT INTO notifications (user_id, from_user_id, type, post_id)
    VALUES (?, ?, ?, ?)
  `).run(userId, fromUserId, type, postId || null);
  return result.lastInsertRowid;
}

module.exports = { createNotification };
