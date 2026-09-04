/**
 * auth.js - 认证与权限中间件
 */

const { intToBool } = require('../utils/helpers');

/**
 * 登录校验中间件
 */
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: '请先登录' });
  next();
}

/**
 * 管理员权限校验中间件（超级管理员或管理员）
 * @param {Object} db 数据库实例
 */
function requireAdmin(db) {
  return (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: '请先登录' });
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
  };
}

/**
 * 超级管理员权限校验中间件
 * @param {Object} db 数据库实例
 */
function requireSuperAdmin(db) {
  return (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: '请先登录' });
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ error: '需要超级管理员权限' });
    }
    next();
  };
}

/**
 * 禁言校验中间件：被禁言用户不能发布/编辑内容
 * @param {Object} db 数据库实例
 */
function requireNotMuted(db) {
  return (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: '请先登录' });
    const user = db.prepare('SELECT muted FROM profiles WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(401).json({ error: '用户不存在' });
    if (intToBool(user.muted)) return res.status(403).json({ error: '你已被禁言，暂时无法发布内容' });
    next();
  };
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requireNotMuted
};
