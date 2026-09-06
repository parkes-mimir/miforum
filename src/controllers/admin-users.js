const { requireAuth, requireAdmin: requireAdminFactory } = require('../middleware/auth');
const { intToBool, parseJsonField, deleteImages } = require('../utils/helpers');

module.exports = function (app, db) {
  const requireAdmin = requireAdminFactory(db);

  app.get('/api/admin/status', requireAuth, (req, res) => {
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
    const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
    res.json({ isAdmin });
  });

  app.get('/api/admin/users', requireAdmin, (req, res) => {
    const users = db.prepare(`
      SELECT u.*,
        (SELECT COUNT(*) FROM posts WHERE author_id = u.id) AS posts_count,
        (SELECT COUNT(*) FROM comments WHERE author_id = u.id) AS comments_count
      FROM profiles u
    `).all().map(u => ({
      id: u.id,
      display_id: u.display_id,
      username: u.username,
      email: u.email,
      points: u.points || 0,
      muted: intToBool(u.muted),
      role: u.role || 'user',
      created_at: u.created_at,
      posts_count: u.posts_count,
      comments_count: u.comments_count
    }));
    res.json({ users });
  });

  app.put('/api/admin/users/:id/mute', requireAdmin, (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT role, muted FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.role === 'super_admin') return res.status(403).json({ error: '不能禁言超级管理员' });

    const newMuted = intToBool(user.muted) ? 0 : 1;
    db.prepare('UPDATE profiles SET muted = ? WHERE id = ?').run(newMuted, uid);
    res.json({ ok: true, muted: intToBool(newMuted) });
  });

  app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.role === 'super_admin') return res.status(403).json({ error: '不能删除超级管理员' });

    const deleteUser = db.transaction(() => {
      const userPosts = db.prepare('SELECT id, images FROM posts WHERE author_id = ?').all(uid);

      userPosts.forEach(p => deleteImages(parseJsonField(p.images, [])));

      const allComments = db.prepare('SELECT id, images, post_id FROM comments WHERE author_id = ?').all(uid);
      allComments.forEach(c => deleteImages(parseJsonField(c.images, [])));

      const postRelatedComments = db.prepare('SELECT id, images FROM comments WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)').all(uid);
      postRelatedComments.forEach(c => deleteImages(parseJsonField(c.images, [])));

      db.prepare('DELETE FROM posts WHERE author_id = ?').run(uid);
      db.prepare('DELETE FROM comments WHERE author_id = ?').run(uid);
      db.prepare('DELETE FROM post_likes WHERE user_id = ?').run(uid);
      db.prepare('DELETE FROM bookmarks WHERE user_id = ?').run(uid);
      db.prepare('DELETE FROM check_ins WHERE user_id = ?').run(uid);
      db.prepare('DELETE FROM profiles WHERE id = ?').run(uid);
    });
    deleteUser();

    res.json({ ok: true });
  });

  app.put('/api/posts/:id/pin', requireAdmin, (req, res) => {
    const pid = Number(req.params.id);
    const post = db.prepare('SELECT pinned FROM posts WHERE id = ?').get(pid);
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    const newPinned = intToBool(post.pinned) ? 0 : 1;
    db.prepare('UPDATE posts SET pinned = ? WHERE id = ?').run(newPinned, pid);
    res.json({ ok: true, pinned: intToBool(newPinned) });
  });

  app.put('/api/admin/users/:id/points', requireAdmin, (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT id FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const points = Number(req.body.points);
    if (!Number.isFinite(points) || points < 0) return res.status(400).json({ error: '积分必须为非负整数' });
    if (points > 1000000) return res.status(400).json({ error: '积分上限为 1,000,000' });

    db.prepare('UPDATE profiles SET points = ? WHERE id = ?').run(Math.floor(points), uid);
    res.json({ ok: true, points: Math.floor(points) });
  });

  app.put('/api/admin/users/:id/points/add', requireAdmin, (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT id, points FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const { amount, reason } = req.body;
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: '积分必须为正数' });
    if (amount > 10000) return res.status(400).json({ error: '单次最多增加 10000 积分' });
    db.prepare('UPDATE profiles SET points = points + ? WHERE id = ?').run(amount, uid);
    const updated = db.prepare('SELECT points FROM profiles WHERE id = ?').get(uid);
    res.json({ ok: true, points: updated.points, message: `已奖励 ${amount} 积分${reason ? '：' + reason : ''}` });
  });
};
