/**
 * level.js - 经验值与等级系统控制器
 *
 * 等级体系：Lv1 ~ Lv10
 * ⭐星星 Lv1-3 / 🌙月亮 Lv4-6 / ☀️太阳 Lv7-9 / 👑皇冠 Lv10
 */

// ============================================================
// 常量
// ============================================================

/** 升级所需累计经验（索引即等级，level 0 占位，1~10 真实阈值） */
const EXP_LEVELS = [0, 0, 50, 150, 300, 600, 1000, 1500, 2200, 3000, 5000];
const MAX_LEVEL = 10;

/** 各行为获得的经验值 */
const EXP_REWARDS = {
  register: 50,       // 注册
  signin: 10,         // 签到
  retroactive: 5,     // 补签
  post: 20,           // 发帖
  comment: 5,         // 评论
  receive_like: 3,    // 收到点赞
  receive_comment: 2, // 收到评论
  bookmark: 2         // 收藏帖子
};

// ============================================================
// 纯函数（不需要数据库）
// ============================================================

/** 由累计经验值计算等级（1~10） */
function getLevel(exp) {
  let lv = 1;
  for (let i = 1; i <= MAX_LEVEL; i++) {
    if (exp >= EXP_LEVELS[i]) lv = i;
  }
  return lv;
}

/** 等级阶段配色 */
function getLevelTheme(level) {
  if (level >= 10) {
    return {
      stage: 'crown', stageName: '皇冠',
      icon: '👑',
      badgeBg: 'linear-gradient(90deg, #fbbf24 0%, #ef4444 50%, #f59e0b 100%)',
      badgeText: '#ffffff',
      cardBg: 'linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%)',
      cardBorder: '#fcd34d',
      progressBg: 'rgba(255,255,255,0.7)',
      progressFill: 'linear-gradient(90deg, #fbbf24 0%, #ef4444 50%, #f59e0b 100%)',
      accentColor: '#d97706'
    };
  }
  if (level >= 7) {
    return {
      stage: 'sun', stageName: '太阳',
      icon: '☀️',
      badgeBg: 'linear-gradient(90deg, #fbbf24 0%, #f97316 100%)',
      badgeText: '#ffffff',
      cardBg: 'linear-gradient(135deg, #fef3c7 0%, #ffedd5 100%)',
      cardBorder: '#fcd34d',
      progressBg: 'rgba(255,255,255,0.7)',
      progressFill: 'linear-gradient(90deg, #fbbf24 0%, #f97316 100%)',
      accentColor: '#d97706'
    };
  }
  if (level >= 4) {
    return {
      stage: 'moon', stageName: '月亮',
      icon: '🌙',
      badgeBg: 'linear-gradient(90deg, #a78bfa 0%, #6366f1 100%)',
      badgeText: '#ffffff',
      cardBg: 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)',
      cardBorder: '#c4b5fd',
      progressBg: 'rgba(255,255,255,0.7)',
      progressFill: 'linear-gradient(90deg, #a78bfa 0%, #6366f1 100%)',
      accentColor: '#7c3aed'
    };
  }
  return {
    stage: 'star', stageName: '星星',
    icon: '⭐',
    badgeBg: 'linear-gradient(90deg, #93c5fd 0%, #3b82f6 100%)',
    badgeText: '#ffffff',
    cardBg: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)',
    cardBorder: '#93c5fd',
    progressBg: 'rgba(255,255,255,0.7)',
    progressFill: 'linear-gradient(90deg, #93c5fd 0%, #3b82f6 100%)',
    accentColor: '#2563eb'
  };
}

/** 计算等级信息 */
function getLevelInfo(exp) {
  const level = getLevel(exp);
  const curBase = EXP_LEVELS[level];
  const nextBase = level >= MAX_LEVEL ? EXP_LEVELS[MAX_LEVEL] : EXP_LEVELS[level + 1];
  const nextLevel = level >= MAX_LEVEL ? MAX_LEVEL : level + 1;
  const need = nextBase - curBase;
  const have = exp - curBase;
  const remain = Math.max(0, need - have);
  const progress = need > 0 ? Math.min(100, Math.round(have / need * 100)) : 100;
  const theme = getLevelTheme(level);
  return {
    level, icon: theme.icon,
    exp, cur_base: curBase, next_base: nextBase, next_level: nextLevel,
    need, have, remain, progress,
    max_level: MAX_LEVEL,
    stage: theme.stage, stage_name: theme.stageName,
    badge_bg: theme.badgeBg, badge_text: theme.badgeText,
    card_bg: theme.cardBg, card_border: theme.cardBorder,
    progress_bg: theme.progressBg, progress_fill: theme.progressFill,
    accent_color: theme.accentColor
  };
}

/**
 * 给用户增加经验值（需要数据库实例）
 * @param {Object} db 数据库实例
 * @param {number} userId
 * @param {number} amount
 * @returns {number|null}
 */
function addExp(db, userId, amount) {
  if (!Number.isFinite(amount) || amount === 0) return null;
  db.prepare('UPDATE profiles SET exp = MAX(0, exp + ?) WHERE id = ?').run(amount, userId);
  const u = db.prepare('SELECT exp FROM profiles WHERE id = ?').get(userId);
  return u ? u.exp : 0;
}

// ============================================================
// 控制器
// ============================================================

module.exports = function(app, db) {
  /** 等级排行榜（前 20 名） */
  app.get('/api/leaderboard/level', (req, res) => {
    const rows = db.prepare(`
      SELECT id, display_id, username, avatar_url, title, avatar_frame, exp, role
      FROM profiles WHERE muted = 0
      ORDER BY exp DESC, id ASC LIMIT 20
    `).all();
    res.json({ leaderboard: rows.map((r, i) => ({
      rank: i + 1,
      id: r.id,
      display_id: r.display_id,
      username: r.username,
      avatar_url: r.avatar_url || null,
      title: r.title || null,
      avatar_frame: r.avatar_frame || null,
      exp: r.exp || 0,
      role: r.role || 'user',
      level_info: getLevelInfo(r.exp || 0)
    })) });
  });
};

// 导出所有函数和常量
module.exports.EXP_LEVELS = EXP_LEVELS;
module.exports.MAX_LEVEL = MAX_LEVEL;
module.exports.EXP_REWARDS = EXP_REWARDS;
module.exports.getLevel = getLevel;
module.exports.getLevelInfo = getLevelInfo;
module.exports.addExp = addExp;
