/**
 * redemption.js - 兑换码控制器
 *
 * 管理员创建兑换码，用户使用兑换码兑换奖励。
 * 支持积分奖励类型。
 */

const { requireAuth } = require('../middleware/auth');
const { isAdmin } = require('../services/post-helper');

module.exports = function (app, db) {
  /** 管理员：获取所有兑换码 */
  app.get('/api/admin/redemption-codes', requireAuth, (req, res) => {
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
    if (!isAdmin(user)) return res.status(403).json({ error: '需要管理员权限' });

    const codes = db
      .prepare(
        `
      SELECT rc.*, p.username AS creator_name
      FROM redemption_codes rc
      LEFT JOIN profiles p ON p.id = rc.created_by
      ORDER BY rc.created_at DESC
    `
      )
      .all();
    res.json({ codes });
  });

  /** 管理员：创建兑换码 */
  app.post('/api/admin/redemption-codes', requireAuth, (req, res) => {
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
    if (!isAdmin(user)) return res.status(403).json({ error: '需要管理员权限' });

    const { rewardType, rewardValue, maxUses, expiresAt } = req.body;

    if (!rewardType || !rewardValue) {
      return res.status(400).json({ error: '请填写奖励类型和值' });
    }

    const validTypes = ['points'];
    if (!validTypes.includes(rewardType)) {
      return res.status(400).json({ error: '无效的奖励类型，支持：points' });
    }

    if (rewardType === 'points') {
      const points = Number(rewardValue);
      if (!Number.isFinite(points) || points <= 0 || points > 100000) {
        return res.status(400).json({ error: '积分必须为1-100000' });
      }
    }

    // 生成8位兑换码
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const result = db
      .prepare(
        `
      INSERT INTO redemption_codes (code, reward_type, reward_value, max_uses, expires_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        code,
        rewardType,
        String(rewardValue),
        maxUses ? Math.floor(maxUses) : 1,
        expiresAt || null,
        req.session.userId
      );

    const created = db.prepare('SELECT * FROM redemption_codes WHERE id = ?').get(result.lastInsertRowid);
    res.json({ ok: true, code: created });
  });

  /** 管理员：删除兑换码 */
  app.delete('/api/admin/redemption-codes/:id', requireAuth, (req, res) => {
    const user = db.prepare('SELECT role FROM profiles WHERE id = ?').get(req.session.userId);
    if (!isAdmin(user)) return res.status(403).json({ error: '需要管理员权限' });

    const codeId = Number(req.params.id);
    const code = db.prepare('SELECT id FROM redemption_codes WHERE id = ?').get(codeId);
    if (!code) return res.status(404).json({ error: '兑换码不存在' });

    db.prepare('DELETE FROM redemption_codes WHERE id = ?').run(codeId);
    res.json({ ok: true });
  });

  /** 用户：使用兑换码 */
  app.post('/api/redemption/redeem', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: '请输入兑换码' });
    }

    const trimmedCode = code.trim().toUpperCase();
    const redemption = db.prepare('SELECT * FROM redemption_codes WHERE code = ?').get(trimmedCode);

    if (!redemption) {
      return res.status(404).json({ error: '兑换码不存在' });
    }

    // 检查是否过期
    if (redemption.expires_at && new Date(redemption.expires_at) < new Date()) {
      return res.status(400).json({ error: '兑换码已过期' });
    }

    // 检查是否用完
    if (redemption.used_count >= redemption.max_uses) {
      return res.status(400).json({ error: '兑换码已被使用完毕' });
    }

    // 检查用户是否已使用过此码
    const userUsed = db
      .prepare('SELECT id FROM redemption_usage WHERE code_id = ? AND user_id = ?')
      .get(redemption.id, userId);
    if (userUsed) {
      return res.status(400).json({ error: '你已经使用过此兑换码' });
    }

    // 执行兑换
    const doRedeem = db.transaction(() => {
      // 记录使用
      db.prepare("INSERT INTO redemption_usage (code_id, user_id, used_at) VALUES (?, ?, datetime('now'))").run(
        redemption.id,
        userId
      );

      // 增加使用次数
      db.prepare('UPDATE redemption_codes SET used_count = used_count + 1 WHERE id = ?').run(redemption.id);

      // 发放奖励
      if (redemption.reward_type === 'points') {
        const points = Number(redemption.reward_value);
        db.prepare('UPDATE profiles SET points = points + ? WHERE id = ?').run(points, userId);
      }
    });
    doRedeem();

    const updatedUser = db.prepare('SELECT points FROM profiles WHERE id = ?').get(userId);
    res.json({
      ok: true,
      message: redemption.reward_type === 'points' ? `兑换成功，获得 ${redemption.reward_value} 积分` : '兑换成功',
      points: updatedUser?.points || 0
    });
  });
};
