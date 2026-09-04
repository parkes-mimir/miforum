const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { deleteFile, parseJsonField, boolToInt, intToBool, UPLOADS_DIR } = require('../utils/helpers');
const { getLevelInfo } = require('./level');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const name = 'avatar-' + date + '-' + Date.now() + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('仅支持 JPG/PNG/GIF/WebP/BMP 格式图片'));
  }
});

function multerUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err && err.code === 'LIMIT_UNEXPECTED_FILE') return next();
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  };
}

module.exports = function (app, db) {
  app.get('/api/users/:id', (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const isOwner = req.session.userId === uid;
    const me = req.session.userId ? db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId) : null;
    const isAdmin = me && (me.role === 'admin' || me.role === 'super_admin');

    const publicData = {
      id: user.id,
      display_id: user.display_id,
      username: user.username,
      avatar_url: user.avatar_url || null,
      role: user.role || 'user',
      title: user.title || null,
      avatar_frame: user.avatar_frame || null,
      created_at: user.created_at,
      exp: user.exp || 0,
      level_info: getLevelInfo(user.exp || 0),
      posts_count: db.prepare('SELECT COUNT(*) AS c FROM posts WHERE author_id = ?').get(uid).c,
      comments_count: db.prepare('SELECT COUNT(*) AS c FROM comments WHERE author_id = ?').get(uid).c
    };

    if (isOwner || isAdmin || intToBool(user.profile_public)) {
      publicData.bio = user.bio || '';
      publicData.location = user.location || '';
      publicData.website = user.website || '';
      publicData.points = user.points || 0;
      publicData.profile_public = intToBool(user.profile_public);
    }

    if (isOwner) {
      publicData.email = user.email;
    }

    res.json({ user: publicData });
  });

  app.put('/api/profile', requireAuth, multerUpload(upload.single('avatar')), (req, res) => {
    const { username, bio, location, website, profile_public, title, avatar_frame } = req.body;
    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const updateProfile = db.transaction(() => {
      let newUsername = user.username;
      let newRenameChances = user.rename_chances || 0;

      if (username && username !== user.username) {
        if (newRenameChances <= 0) {
          throw new Error('改名卡不足，请先在积分商店兑换');
        }
        const nameExists = db.prepare('SELECT id FROM profiles WHERE username = ? AND id != ?').get(username, user.id);
        if (nameExists) throw new Error('用户名已被占用');
        newRenameChances--;
        newUsername = username;
      }

      const newBio = bio !== undefined ? bio.slice(0, 200) : user.bio;
      const newLocation = location !== undefined ? location : user.location;
      const newWebsite = website !== undefined ? website : user.website;
      const newProfilePublic = profile_public !== undefined ? boolToInt(profile_public === 'true' || profile_public === true) : user.profile_public;

      let newAvatarUrl = user.avatar_url;
      if (req.file) {
        if (user.avatar_url) deleteFile(user.avatar_url);
        newAvatarUrl = '/uploads/' + req.file.filename;
      }

      let newTitle = user.title || null;
      let newFrame = user.avatar_frame || null;
      if (title !== undefined) {
        if (title === '' || title === null) {
          newTitle = null;
        } else {
          const owned = db.prepare(`
            SELECT s.value FROM shop_orders o
            JOIN shop_items s ON s.id = o.item_id
            WHERE o.user_id = ? AND o.item_type = 'title' AND o.status = 'completed'
              AND s.value = ?
          `).get(user.id, title);
          if (!owned) throw new Error('未拥有该称号');
          newTitle = title;
        }
      }
      if (avatar_frame !== undefined) {
        if (avatar_frame === '' || avatar_frame === null) {
          newFrame = null;
        } else {
          const owned = db.prepare(`
            SELECT s.value FROM shop_orders o
            JOIN shop_items s ON s.id = o.item_id
            WHERE o.user_id = ? AND o.item_type = 'avatar_frame' AND o.status = 'completed'
              AND s.value = ?
          `).get(user.id, avatar_frame);
          if (!owned) throw new Error('未拥有该头像框');
          newFrame = avatar_frame === 'none' ? null : avatar_frame;
        }
      }

      db.prepare(`
        UPDATE profiles SET username = ?, bio = ?, location = ?, website = ?,
        profile_public = ?, avatar_url = ?, rename_chances = ?, title = ?, avatar_frame = ? WHERE id = ?
      `).run(newUsername, newBio, newLocation, newWebsite, newProfilePublic, newAvatarUrl, newRenameChances, newTitle, newFrame, user.id);

      return { newUsername, newBio, newLocation, newWebsite, newProfilePublic, newAvatarUrl, newRenameChances, newTitle, newFrame };
    });

    try {
      updateProfile();
      const updated = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
      res.json({
        ok: true,
        user: {
          id: updated.id, display_id: updated.display_id, username: updated.username, email: updated.email,
          avatar_url: updated.avatar_url, bio: updated.bio,
          location: updated.location, website: updated.website,
          profile_public: intToBool(updated.profile_public), points: updated.points || 0,
          title: updated.title || null,
          avatar_frame: updated.avatar_frame || null,
          rename_chances: updated.rename_chances || 0
        }
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  /** 获取用户帖子列表（支持分页） */
  app.get('/api/users/:id/posts', (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    // 隐私检查：私密资料只有本人和管理员可查看帖子列表
    const isOwner = req.session.userId === uid;
    const me = req.session.userId ? db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId) : null;
    const isAdmin = me && (me.role === 'admin' || me.role === 'super_admin');
    if (!isOwner && !isAdmin && !intToBool(user.profile_public)) {
      return res.status(403).json({ error: '该用户设置了私密资料' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { total } = db.prepare('SELECT COUNT(*) AS total FROM posts WHERE author_id = ?').get(uid);

    const posts = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
      FROM posts p
      WHERE p.author_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(uid, limit, offset).map(p => ({
      ...p,
      tags: parseJsonField(p.tags, []),
      images: parseJsonField(p.images, []),
      pinned: intToBool(p.pinned),
      author_display_id: user.display_id,
      author_name: user.username,
      author_avatar_url: user.avatar_url || null,
      author_title: user.title || null,
      author_avatar_frame: user.avatar_frame || null
    }));

    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  });

  /** 获取用户点赞列表（支持分页） */
  app.get('/api/users/:id/likes', (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT id FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { total } = db.prepare('SELECT COUNT(*) AS total FROM post_likes WHERE user_id = ?').get(uid);

    const posts = db.prepare(`
      SELECT p.*,
        pr.display_id AS author_display_id, pr.username AS author_name, pr.avatar_url AS author_avatar_url,
        pr.title AS author_title, pr.avatar_frame AS author_avatar_frame,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
      FROM post_likes pl
      JOIN posts p ON p.id = pl.post_id
      LEFT JOIN profiles pr ON pr.id = p.author_id
      WHERE pl.user_id = ?
      ORDER BY pl.created_at DESC
      LIMIT ? OFFSET ?
    `).all(uid, limit, offset).map(p => ({
      ...p,
      tags: parseJsonField(p.tags, []),
      images: parseJsonField(p.images, []),
      pinned: intToBool(p.pinned),
      author_avatar_url: p.author_avatar_url || null,
      author_title: p.author_title || null,
      author_avatar_frame: p.author_avatar_frame || null
    }));

    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  });
};
