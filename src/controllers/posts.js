/**
 * posts.js - 帖子 CRUD 控制器
 *
 * 提供帖子的创建、读取、更新、删除功能，
 * 包括投票创建、图片管理、私密帖子过滤。
 */

const { requireAuth, requireNotMuted } = require('../middleware/auth');
const { deleteImages, deleteFile, parseJsonField, intToBool } = require('../utils/helpers');
const { postUpload, multerUpload } = require('../utils/upload');
const { addExp, EXP_REWARDS, getLevelInfo } = require('../services/level');
const { createPoll } = require('../services/poll');
const { getHotPosts } = require('../services/hot-posts');
const { formatPost, parsePagination, isAdmin } = require('../services/post-helper');

/** 解析标签（支持数组、JSON 字符串、逗号分隔字符串） */
function parseTags(tags) {
  let parsed = [];
  if (Array.isArray(tags)) {
    parsed = tags;
  } else if (typeof tags === 'string') {
    try {
      parsed = JSON.parse(tags);
    } catch (e) {
      parsed = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }
  // 过滤空字符串和纯空白，限制长度和数量
  return [...new Set(parsed.map((t) => String(t).trim().slice(0, 20)).filter(Boolean))].slice(0, 10);
}

/** 转义 SQL LIKE 通配符 */
function escapeLike(s) {
  return String(s).replace(/%/g, '\\%').replace(/_/g, '\\_');
}

module.exports = function (app, db) {
  /** 获取帖子列表（支持分页、分类、标签、搜索、排序，过滤私密帖子） */
  app.get('/api/posts', (req, res) => {
    const { category, search, tag } = req.query;
    const sort = req.query.sort || 'newest';
    const { page, limit, offset } = parsePagination(req.query);
    const userId = req.session.userId || null;

    // 热门板块使用独立算法
    if (category === 'hot') {
      const result = getHotPosts(db, userId, page, limit);
      return res.json(result);
    }

    // 获取当前用户信息（用于过滤私密帖子）
    let userRole = 'user';
    if (userId) {
      const u = db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId);
      if (u) userRole = u.role;
    }
    const adminCheck = isAdmin({ role: userRole });

    let whereSql = ' WHERE 1=1';
    const params = [];

    // 过滤私密帖子：仅作者和管理员可见
    if (!adminCheck) {
      whereSql += ' AND (p.private = 0 OR p.author_id = ?)';
      params.push(userId || 0);
    }

    if (category && category !== 'all') {
      whereSql += ' AND p.category = ?';
      params.push(category);
    }
    if (tag) {
      whereSql += " AND p.tags LIKE ? ESCAPE '\\'";
      params.push(`%"${escapeLike(tag)}"%`);
    }
    if (search) {
      whereSql += " AND (p.title LIKE ? ESCAPE '\\' OR p.content LIKE ? ESCAPE '\\')";
      params.push(`%${escapeLike(search)}%`, `%${escapeLike(search)}%`);
    }

    // 排序方式
    const sortOptions = {
      newest: 'p.created_at DESC',
      oldest: 'p.created_at ASC',
      most_liked: '(SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) DESC'
    };
    const orderBy = sortOptions[sort] || sortOptions.newest;

    // 查询总数
    const countSql = `SELECT COUNT(*) AS total FROM posts p${whereSql}`;
    const { total } = db.prepare(countSql).get(...params);

    // 查询当前页数据
    const sql = `
      SELECT p.*,
        pr.display_id AS author_display_id, pr.username AS author_name, pr.avatar_url AS author_avatar_url,
        pr.title AS author_title, pr.avatar_frame AS author_avatar_frame, pr.exp AS author_exp,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
        (SELECT COUNT(*) FROM bookmarks WHERE post_id = p.id) AS bookmarks_count
      FROM posts p
      LEFT JOIN profiles pr ON pr.id = p.author_id
      ${whereSql}
      ORDER BY p.pinned DESC, ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(sql).all(...params, limit, offset);
    const posts = rows.map((p) => formatPost(p));

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  });

  app.get('/api/posts/:id', (req, res) => {
    const pid = Number(req.params.id);
    const p = db
      .prepare(
        `
      SELECT p.*,
        pr.display_id AS author_display_id, pr.username AS author_name, pr.avatar_url AS author_avatar_url,
        pr.title AS author_title, pr.avatar_frame AS author_avatar_frame, pr.exp AS author_exp,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
        (SELECT COUNT(*) FROM bookmarks WHERE post_id = p.id) AS bookmarks_count
      FROM posts p
      LEFT JOIN profiles pr ON pr.id = p.author_id
      WHERE p.id = ?
    `
      )
      .get(pid);
    if (!p) return res.status(404).json({ error: '帖子不存在' });

    // 私密帖子权限检查
    if (intToBool(p.private)) {
      const userId = req.session.userId || null;
      const user = userId ? db.prepare('SELECT role FROM profiles WHERE id = ?').get(userId) : null;
      if (p.author_id !== userId && !isAdmin(user)) {
        return res.status(404).json({ error: '帖子不存在' });
      }
    }

    // 获取帖子关联的投票
    const poll = db.prepare('SELECT * FROM polls WHERE post_id = ?').get(pid);
    let pollData = null;
    if (poll) {
      // 自动关闭过期投票
      if (poll.status === 'open' && poll.close_at && new Date(poll.close_at) <= new Date()) {
        db.prepare("UPDATE polls SET status = 'closed' WHERE id = ?").run(poll.id);
        poll.status = 'closed';
      }

      const options = db
        .prepare('SELECT id, text, sort_order FROM poll_options WHERE poll_id = ? ORDER BY sort_order ASC')
        .all(poll.id);
      const userId = req.session.userId || null;
      const voteCounts = db
        .prepare('SELECT option_id, COUNT(*) AS count FROM poll_votes WHERE poll_id = ? GROUP BY option_id')
        .all(poll.id);
      const countMap = {};
      voteCounts.forEach((v) => {
        countMap[v.option_id] = v.count;
      });
      const userVotes = userId
        ? db.prepare('SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?').all(poll.id, userId)
        : [];
      const userVotedOptionIds = userVotes.map((v) => v.option_id);
      const hasVoted = userVotedOptionIds.length > 0;
      const totalVotes = voteCounts.reduce((sum, v) => sum + v.count, 0);
      pollData = {
        id: poll.id,
        question: poll.question,
        pollType: poll.poll_type,
        maxChoices: poll.max_choices,
        status: poll.status,
        closeAt: poll.close_at || null,
        totalVotes,
        options: options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          votes: countMap[opt.id] || 0
        })),
        userVotes: userVotedOptionIds,
        hasVoted
      };
    }

    res.json({
      post: formatPost(p),
      poll: pollData
    });
  });

  app.post('/api/posts', requireAuth, requireNotMuted(db), multerUpload(postUpload.array('images', 30)), (req, res) => {
    const {
      title,
      content,
      category,
      tags,
      private: isPrivate,
      pollQuestion,
      pollOptions,
      pollType,
      pollMaxChoices,
      pollCloseAt
    } = req.body;
    if (!title || !content) return res.status(400).json({ error: '请填写标题和正文' });
    if (title.length > 100) return res.status(400).json({ error: '标题最多100字' });
    if (content.length > 50000) return res.status(400).json({ error: '正文最多50000字' });

    // 检查板块权限
    if (category) {
      const cat = db.prepare('SELECT section_type FROM categories WHERE name = ?').get(category);
      if (!cat) return res.status(400).json({ error: '板块不存在' });
      if (cat.section_type === 'announcement') {
        const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
        if (!isAdmin(user)) {
          return res.status(403).json({ error: '公告板块仅管理员可发帖' });
        }
      }
      if (cat.section_type === 'hot') {
        return res.status(400).json({ error: '热门板块不支持直接发帖' });
      }
    }

    const privateVal = isPrivate === true || isPrivate === 'true' || isPrivate === '1' || isPrivate === 1 ? 1 : 0;

    // 解析投票数据
    let parsedPollOptions = null;
    if (pollQuestion && pollOptions) {
      try {
        parsedPollOptions = typeof pollOptions === 'string' ? JSON.parse(pollOptions) : pollOptions;
      } catch (e) {
        parsedPollOptions = null;
      }
      if (!Array.isArray(parsedPollOptions) || parsedPollOptions.length < 2) {
        parsedPollOptions = null;
      }
    }

    const images = req.files ? req.files.map((f) => '/uploads/' + f.filename) : [];
    if (images.length > 30) return res.status(400).json({ error: '最多上传30张图片' });
    const parsedTags = parseTags(tags);

    const insertPost = db.transaction(() => {
      const result = db
        .prepare(
          `
        INSERT INTO posts (title, content, category, tags, author_id, images, private, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `
        )
        .run(
          title,
          content,
          category || 'tech',
          JSON.stringify(parsedTags),
          req.session.userId,
          JSON.stringify(images),
          privateVal
        );

      const postId = result.lastInsertRowid;

      // 创建投票
      if (parsedPollOptions && pollQuestion) {
        createPoll(db, postId, pollQuestion, parsedPollOptions, {
          pollType: pollType || 'single',
          maxChoices: Number(pollMaxChoices) || 1,
          closeAt: pollCloseAt || null
        });
      }

      db.prepare('UPDATE profiles SET points = points + 5 WHERE id = ?').run(req.session.userId);
      addExp(db, req.session.userId, EXP_REWARDS.post);
      const user = db.prepare('SELECT points, exp FROM profiles WHERE id = ?').get(req.session.userId);
      return {
        postId: result.lastInsertRowid,
        points: user ? user.points : 0,
        exp: user ? user.exp : 0,
        level_info: getLevelInfo(user ? user.exp : 0)
      };
    });

    const result = insertPost();
    res.json({
      ok: true,
      postId: result.postId,
      points: result.points,
      exp: result.exp,
      level_info: result.level_info
    });
  });

  app.put(
    '/api/posts/:id',
    requireAuth,
    requireNotMuted(db),
    multerUpload(postUpload.array('images', 30)),
    (req, res) => {
      const {
        title,
        content,
        category,
        tags,
        removeImages,
        private: isPrivate,
        deletePoll,
        pollQuestion,
        pollOptions,
        pollType,
        pollMaxChoices,
        pollCloseAt
      } = req.body;
      if (!title || !content) return res.status(400).json({ error: '请填写标题和正文' });
      if (title.length > 100) return res.status(400).json({ error: '标题最多100字' });
      if (content.length > 50000) return res.status(400).json({ error: '正文最多50000字' });

      const pid = Number(req.params.id);
      const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(pid);
      if (!post) return res.status(404).json({ error: '帖子不存在' });
      if (post.author_id !== req.session.userId) return res.status(403).json({ error: '只能编辑自己的帖子' });

      const privateVal =
        isPrivate === true || isPrivate === 'true' || isPrivate === '1' || isPrivate === 1
          ? 1
          : isPrivate === false || isPrivate === 'false' || isPrivate === '0' || isPrivate === 0
            ? 0
            : intToBool(post.private)
              ? 1
              : 0;

      let currentImages = parseJsonField(post.images, []);

      if (removeImages) {
        let removeList;
        try {
          removeList = JSON.parse(removeImages);
        } catch (e) {
          return res.status(400).json({ error: 'removeImages 格式错误' });
        }
        removeList.forEach(deleteFile);
        currentImages = currentImages.filter((u) => !removeList.includes(u));
      }

      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((f) => '/uploads/' + f.filename);
        currentImages = [...currentImages, ...newImages];
      }

      let finalTags = parseJsonField(post.tags, []);
      if (tags !== undefined) {
        finalTags = parseTags(tags);
      }

      const editPost = db.transaction(() => {
        // 校验板块是否存在
        const catName = category || post.category;
        const cat = db.prepare('SELECT name FROM categories WHERE name = ?').get(catName);
        if (!cat) throw new Error('板块不存在');

        db.prepare(
          `
        UPDATE posts SET title = ?, content = ?, category = ?, tags = ?, images = ?, private = ?, updated_at = datetime('now')
        WHERE id = ?
      `
        ).run(title, content, catName, JSON.stringify(finalTags), JSON.stringify(currentImages), privateVal, pid);

        // 删除投票
        if (deletePoll === true || deletePoll === 'true' || deletePoll === 1) {
          db.prepare('DELETE FROM polls WHERE post_id = ?').run(pid);
        }

        // 新增投票（仅当帖子没有投票时）
        if (pollQuestion && pollOptions) {
          const existingPoll = db.prepare('SELECT id FROM polls WHERE post_id = ?').get(pid);
          if (!existingPoll) {
            let parsedPollOptions;
            try {
              parsedPollOptions = typeof pollOptions === 'string' ? JSON.parse(pollOptions) : pollOptions;
            } catch (e) {
              parsedPollOptions = null;
            }
            if (Array.isArray(parsedPollOptions) && parsedPollOptions.length >= 2) {
              createPoll(db, pid, pollQuestion, parsedPollOptions, {
                pollType: pollType || 'single',
                maxChoices: Number(pollMaxChoices) || 1,
                closeAt: pollCloseAt || null
              });
            }
          }
        }
      });
      try {
        editPost();
      } catch (e) {
        return res.status(400).json({ error: e.message });
      }

      res.json({ ok: true });
    }
  );

  app.delete('/api/posts/:id', requireAuth, (req, res) => {
    const pid = Number(req.params.id);
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(pid);
    if (!post) return res.status(404).json({ error: '帖子不存在' });

    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
    if (post.author_id !== req.session.userId && !isAdmin(user)) {
      return res.status(403).json({ error: '只能删除自己的帖子' });
    }

    const deletePost = db.transaction(() => {
      const commentImages = db.prepare('SELECT images FROM comments WHERE post_id = ?').all(pid);
      commentImages.forEach((c) => deleteImages(parseJsonField(c.images, [])));

      deleteImages(parseJsonField(post.images, []));

      db.prepare('DELETE FROM posts WHERE id = ?').run(pid);
    });
    deletePost();

    res.json({ ok: true });
  });
};
