/**
 * polls.js - 投票控制器
 */

const { requireAuth } = require('../middleware/auth');
const { addExp, EXP_REWARDS } = require('../services/level');

module.exports = function (app, db) {
  /** 获取投票详情（含选项和结果） */
  app.get('/api/polls/:id', (req, res) => {
    const pollId = Number(req.params.id);
    const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
    if (!poll) return res.status(404).json({ error: '投票不存在' });

    // 自动关闭过期投票
    if (poll.status === 'open' && poll.close_at && new Date(poll.close_at) <= new Date()) {
      db.prepare("UPDATE polls SET status = 'closed' WHERE id = ?").run(pollId);
      poll.status = 'closed';
    }

    const options = db
      .prepare(
        `
      SELECT id, text, sort_order FROM poll_options WHERE poll_id = ? ORDER BY sort_order ASC
    `
      )
      .all(pollId);

    const userId = req.session.userId || null;

    // 获取每个选项的投票数
    const voteCounts = db
      .prepare(
        `
      SELECT option_id, COUNT(*) AS count FROM poll_votes WHERE poll_id = ? GROUP BY option_id
    `
      )
      .all(pollId);
    const countMap = {};
    voteCounts.forEach((v) => {
      countMap[v.option_id] = v.count;
    });

    // 获取当前用户的投票记录
    const userVotes = userId
      ? db.prepare('SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?').all(pollId, userId)
      : [];
    const userVotedOptionIds = userVotes.map((v) => v.option_id);
    const hasVoted = userVotedOptionIds.length > 0;

    // 判断是否应显示投票结果
    const totalVotes = voteCounts.reduce((sum, v) => sum + v.count, 0);

    const optionList = options.map((opt) => ({
      id: opt.id,
      text: opt.text,
      votes: countMap[opt.id] || 0
    }));

    const result = {
      id: poll.id,
      postId: poll.post_id,
      question: poll.question,
      pollType: poll.poll_type,
      maxChoices: poll.max_choices,
      status: poll.status,
      closeAt: poll.close_at || null,
      totalVotes,
      options: optionList,
      userVotes: userVotedOptionIds,
      hasVoted
    };

    res.json(result);
  });

  /** 投票 */
  app.post('/api/polls/:id/vote', requireAuth, (req, res) => {
    const pollId = Number(req.params.id);
    const userId = req.session.userId;
    const { optionIds } = req.body;

    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      return res.status(400).json({ error: '请至少选择一个选项' });
    }

    const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
    if (!poll) return res.status(404).json({ error: '投票不存在' });

    // 检查是否已过期
    if (poll.status === 'open' && poll.close_at && new Date(poll.close_at) <= new Date()) {
      db.prepare("UPDATE polls SET status = 'closed' WHERE id = ?").run(pollId);
      return res.status(400).json({ error: '投票已过期' });
    }
    if (poll.status === 'closed') return res.status(400).json({ error: '投票已关闭' });

    // 检查是否已投票（单选和多选都检查）
    const existingVotes = db
      .prepare('SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?')
      .all(pollId, userId);
    if (existingVotes.length > 0) {
      return res.status(400).json({ error: '已投过票，如需更改请先撤销' });
    }

    // 验证选项数量
    if (poll.poll_type === 'single' && optionIds.length !== 1) {
      return res.status(400).json({ error: '单选投票只能选择一个选项' });
    }
    if (poll.poll_type === 'multiple' && optionIds.length > poll.max_choices) {
      return res.status(400).json({ error: `最多只能选择 ${poll.max_choices} 个选项` });
    }

    // 验证选项属于该投票
    const validOptions = db.prepare('SELECT id FROM poll_options WHERE poll_id = ?').all(pollId);
    const validIds = new Set(validOptions.map((o) => o.id));
    for (const oid of optionIds) {
      if (!validIds.has(oid)) return res.status(400).json({ error: '无效的选项' });
    }

    // 去重
    const uniqueIds = [...new Set(optionIds)];
    if (uniqueIds.length !== optionIds.length) {
      return res.status(400).json({ error: '不能重复选择同一选项' });
    }

    const castVote = db.transaction(() => {
      const insertVote = db.prepare(`
        INSERT INTO poll_votes (poll_id, option_id, user_id, created_at) VALUES (?, ?, ?, datetime('now'))
      `);
      for (const oid of uniqueIds) {
        insertVote.run(pollId, oid, userId);
      }
      addExp(db, userId, EXP_REWARDS.vote);
    });

    castVote();
    res.json({ ok: true });
  });

  /** 撤销投票 */
  app.delete('/api/polls/:id/vote', requireAuth, (req, res) => {
    const pollId = Number(req.params.id);
    const userId = req.session.userId;

    const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
    if (!poll) return res.status(404).json({ error: '投票不存在' });
    if (poll.status === 'closed') return res.status(400).json({ error: '投票已关闭，无法撤销' });

    const existing = db.prepare('SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?').get(pollId, userId);
    if (!existing) return res.status(400).json({ error: '未投过票' });

    db.prepare('DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ?').run(pollId, userId);
    res.json({ ok: true });
  });

  /** 关闭投票（仅帖主） */
  app.put('/api/polls/:id/close', requireAuth, (req, res) => {
    const pollId = Number(req.params.id);
    const userId = req.session.userId;

    const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
    if (!poll) return res.status(404).json({ error: '投票不存在' });

    const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(poll.post_id);
    if (!post || post.author_id !== userId) {
      return res.status(403).json({ error: '只有帖子作者可以关闭投票' });
    }

    if (poll.status === 'closed') return res.status(400).json({ error: '投票已关闭' });

    db.prepare("UPDATE polls SET status = 'closed' WHERE id = ?").run(pollId);
    res.json({ ok: true });
  });
};
