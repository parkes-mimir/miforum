/**
 * postHelper.js - Post formatting and utility functions
 */
const { parseJsonField, intToBool } = require('../utils/helpers');
const { getLevelInfo } = require('./level');

/**
 * Format a raw post row from DB into API response format
 * @param {Object} p - Raw post row from database
 * @returns {Object} Formatted post object
 */
function formatPost(p) {
  return {
    ...p,
    tags: parseJsonField(p.tags, []),
    images: parseJsonField(p.images, []),
    pinned: intToBool(p.pinned),
    private: intToBool(p.private),
    author_avatar_url: p.author_avatar_url || null,
    author_title: p.author_title || null,
    author_avatar_frame: p.author_avatar_frame || null,
    author_level_info: getLevelInfo(p.author_exp || 0)
  };
}

/**
 * Check if a user has admin role
 * @param {Object} user - User object with role property
 * @returns {boolean}
 */
function isAdmin(user) {
  return user && (user.role === 'admin' || user.role === 'super_admin');
}

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Express req.query
 * @param {number} defaultLimit - Default items per page (default 20)
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(query, defaultLimit = 20) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = { formatPost, isAdmin, parsePagination };
