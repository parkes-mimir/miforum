/**
 * profile.js - 用户资料控制器
 *
 * 提供用户信息查询、资料编辑、用户帖子/点赞列表，
 * 包含隐私检查和头像上传功能。
 */

const { requireAuth } = require('../middleware/auth');
const { deleteFile, boolToInt, intToBool } = require('../utils/helpers');
const { avatarUpload, multerUpload } = require('../utils/upload');
const { getLevelInfo } = require('../services/level');
const { formatPost, parsePagination, isAdmin } = require('../services/post-helper');

module.exports = function (app, db) {
  app.get('/api/users/:id', (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const isOwner = req.session.userId === uid;
    const me = req.session.userId ? db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId) : null;

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

    if (isOwner || isAdmin(me) || intToBool(user.profile_public)) {
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

  app.put('/api/profile', requireAuth, multerUpload(avatarUpload.single('avatar')), (req, res) => {
    const { username, bio, location, website, profilePublic, title, avatarFrame } = req.body;
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
      const newLocation = location !== undefined ? String(location).slice(0, 50) : user.location;
      const newWebsite = website !== undefined ? String(website).slice(0, 200) : user.website;
      const newProfilePublic =
        profilePublic !== undefined
          ? boolToInt(profilePublic === 'true' || profilePublic === true)
          : user.profile_public;

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
          const titleStr = String(title).slice(0, 20);
          const owned = db
            .prepare(
              `
            SELECT s.value FROM shop_orders o
            JOIN shop_items s ON s.id = o.item_id
            WHERE o.user_id = ? AND o.item_type = 'title' AND o.status = 'completed'
              AND s.value = ?
          `
            )
            .get(user.id, titleStr);
          if (!owned) throw new Error('未拥有该称号');
          newTitle = titleStr;
        }
      }
      if (avatarFrame !== undefined) {
        if (avatarFrame === '' || avatarFrame === null) {
          newFrame = null;
        } else {
          const frameStr = String(avatarFrame).slice(0, 20);
          const owned = db
            .prepare(
              `
            SELECT s.value FROM shop_orders o
            JOIN shop_items s ON s.id = o.item_id
            WHERE o.user_id = ? AND o.item_type = 'avatar_frame' AND o.status = 'completed'
              AND s.value = ?
          `
            )
            .get(user.id, frameStr);
          if (!owned) throw new Error('未拥有该头像框');
          newFrame = frameStr === 'none' ? null : frameStr;
        }
      }

      db.prepare(
        `
        UPDATE profiles SET username = ?, bio = ?, location = ?, website = ?,
        profile_public = ?, avatar_url = ?, rename_chances = ?, title = ?, avatar_frame = ? WHERE id = ?
      `
      ).run(
        newUsername,
        newBio,
        newLocation,
        newWebsite,
        newProfilePublic,
        newAvatarUrl,
        newRenameChances,
        newTitle,
        newFrame,
        user.id
      );

      return {
        newUsername,
        newBio,
        newLocation,
        newWebsite,
        newProfilePublic,
        newAvatarUrl,
        newRenameChances,
        newTitle,
        newFrame
      };
    });

    try {
      updateProfile();
      const updated = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
      res.json({
        ok: true,
        user: {
          id: updated.id,
          display_id: updated.display_id,
          username: updated.username,
          email: updated.email,
          avatar_url: updated.avatar_url,
          bio: updated.bio,
          location: updated.location,
          website: updated.website,
          profile_public: intToBool(updated.profile_public),
          points: updated.points || 0,
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
    if (!isOwner && !isAdmin(me) && !intToBool(user.profile_public)) {
      return res.status(403).json({ error: '该用户设置了私密资料' });
    }

    const { page, limit, offset } = parsePagination(req.query);

    // 过滤私密帖子：仅作者和管理员可见
    let privacyFilter = '';
    const queryParams = [uid];
    if (!isOwner && !isAdmin(me)) {
      privacyFilter = ' AND p.private = 0';
    }

    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM posts p WHERE p.author_id = ?${privacyFilter}`)
      .get(...queryParams);

    const posts = db
      .prepare(
        `
      SELECT p.*,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
      FROM posts p
      WHERE p.author_id = ?${privacyFilter}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(...queryParams, limit, offset)
      .map((p) => formatPost(p));

    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  });

  /** 获取用户点赞列表（支持分页，过滤私密帖子） */
  app.get('/api/users/:id/likes', (req, res) => {
    const uid = Number(req.params.id);
    const user = db.prepare('SELECT id FROM profiles WHERE id = ?').get(uid);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    // 检查查看权限
    const isOwner = req.session.userId === uid;
    const me = req.session.userId ? db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId) : null;

    const { page, limit, offset } = parsePagination(req.query);

    // 过滤私密帖子
    let privacyFilter = '';
    if (!isOwner && !isAdmin(me)) {
      privacyFilter = ' AND p.private = 0';
    }

    const { total } = db
      .prepare(
        `SELECT COUNT(*) AS total FROM post_likes pl JOIN posts p ON p.id = pl.post_id WHERE pl.user_id = ?${privacyFilter}`
      )
      .get(uid);

    const posts = db
      .prepare(
        `
      SELECT p.*,
        pr.display_id AS author_display_id, pr.username AS author_name, pr.avatar_url AS author_avatar_url,
        pr.title AS author_title, pr.avatar_frame AS author_avatar_frame,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
      FROM post_likes pl
      JOIN posts p ON p.id = pl.post_id
      LEFT JOIN profiles pr ON pr.id = p.author_id
      WHERE pl.user_id = ?${privacyFilter}
      ORDER BY pl.created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(uid, limit, offset)
      .map((p) => formatPost(p));

    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  });
};
