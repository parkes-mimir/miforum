/**
 * poll.js - Poll service
 */

/**
 * Create a poll for a post
 * @param {Object} db - Database instance
 * @param {number} postId - Post ID
 * @param {string} question - Poll question
 * @param {string[]} options - Array of option texts
 * @param {Object} [settings] - Poll settings
 * @param {string} [settings.pollType='single'] - 'single' or 'multiple'
 * @param {number} [settings.maxChoices=1] - Max choices for multiple
 * @param {string} [settings.closeAt] - Close time (ISO string)
 * @returns {number} Poll ID
 */
function createPoll(db, postId, question, options, settings = {}) {
  const { pollType = 'single', maxChoices = 1, closeAt } = settings;

  const result = db.prepare(`
    INSERT INTO polls (post_id, question, poll_type, max_choices, close_at, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(postId, question, pollType, maxChoices, closeAt || null);

  const pollId = result.lastInsertRowid;
  const insertOption = db.prepare(`
    INSERT INTO poll_options (poll_id, text, sort_order) VALUES (?, ?, ?)
  `);

  options.forEach((text, i) => {
    insertOption.run(pollId, text, i);
  });

  return pollId;
}

module.exports = { createPoll };
