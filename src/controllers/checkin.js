/**
 * checkin.js - 签到系统控制器
 *
 * 提供自动签到、手动签到、签到历史、补签功能，
 * 包含连续签到天数计算和经验值奖励。
 */

const { requireAuth } = require('../middleware/auth');
const { todayStr, addDays, daysBetween, dateStr } = require('../utils/helpers');
const { addExp, EXP_REWARDS, getLevelInfo } = require('../services/level');

function calcStreaks(checkinDates) {
  if (!checkinDates.length) return { current: 0, longest: 0, total: 0 };

  const sorted = [...checkinDates].sort();
  const dateSet = new Set(sorted);
  let current = 0,
    longest = 0,
    streak = 0;

  const today = todayStr();
  let d = dateSet.has(today) ? today : addDays(today, -1);
  while (dateSet.has(d)) {
    current++;
    d = addDays(d, -1);
  }

  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || daysBetween(sorted[i - 1], sorted[i]) === 1) streak++;
    else streak = 1;
    longest = Math.max(longest, streak);
  }

  return { current, longest, total: sorted.length };
}

module.exports = function (app, db) {
  app.get('/api/checkin/today', (req, res) => {
    if (!req.session.userId) return res.json({ checkedIn: false });
    const today = todayStr();
    const found = db
      .prepare('SELECT id FROM check_ins WHERE user_id = ? AND check_in_date = ?')
      .get(req.session.userId, today);
    res.json({ checkedIn: !!found });
  });

  app.get('/api/checkin/history', requireAuth, (req, res) => {
    const empty = {
      checkinDates: [],
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      missedDays: [],
      retroactiveCost: 10
    };
    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
    if (!user) return res.json(empty);

    const today = todayStr();
    const regDate = dateStr(user.created_at).slice(0, 10);
    const yearAgo = addDays(today, -364);
    const startDate = regDate > yearAgo ? regDate : yearAgo;

    const userCheckins = db
      .prepare('SELECT check_in_date FROM check_ins WHERE user_id = ?')
      .all(req.session.userId)
      .map((c) => c.check_in_date);
    const checkinSet = new Set(userCheckins);

    const checkinDates = userCheckins.filter((d) => d >= yearAgo);

    const yesterday = addDays(today, -1);
    const missedDays = [];
    let d = startDate;
    while (d <= yesterday) {
      if (!checkinSet.has(d)) missedDays.push(d);
      d = addDays(d, 1);
    }

    const streaks = calcStreaks(userCheckins);

    res.json({
      checkinDates,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      totalDays: streaks.total,
      missedDays,
      retroactiveCost: 10,
      retroactiveTotal: missedDays.length * 10,
      points: user.points || 0
    });
  });

  app.post('/api/checkin/retroactive', requireAuth, (req, res) => {
    const { date } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: '日期格式无效，请使用 YYYY-MM-DD' });
    }

    // 校验是否为有效日历日期
    const dateObj = new Date(date + 'T00:00:00Z');
    if (isNaN(dateObj.getTime()) || dateObj.toISOString().slice(0, 10) !== date) {
      return res.status(400).json({ error: '无效的日期' });
    }

    const user = db.prepare('SELECT id, created_at, points FROM profiles WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const today = todayStr();
    const regDate = dateStr(user.created_at).slice(0, 10);
    const cost = 10;

    if (date < regDate || date >= today) {
      return res.status(400).json({ error: '只能补签注册日至昨天的日期' });
    }
    const exists = db
      .prepare('SELECT id FROM check_ins WHERE user_id = ? AND check_in_date = ?')
      .get(req.session.userId, date);
    if (exists) return res.status(400).json({ error: '该日期已签到' });
    if ((user.points || 0) < cost) {
      return res.status(400).json({ error: `积分不足，补签需要 ${cost} 积分，当前 ${user.points || 0} 积分` });
    }

    const doRetroactive = db.transaction(() => {
      db.prepare('UPDATE profiles SET points = points - ? WHERE id = ?').run(cost, req.session.userId);
      db.prepare(
        "INSERT INTO check_ins (user_id, check_in_date, retroactive, created_at) VALUES (?, ?, 1, datetime('now'))"
      ).run(req.session.userId, date);
      addExp(db, req.session.userId, EXP_REWARDS.retroactive);
    });
    doRetroactive();

    const updatedUser = db.prepare('SELECT points, exp FROM profiles WHERE id = ?').get(req.session.userId);
    res.json({
      ok: true,
      points: updatedUser.points,
      exp: updatedUser.exp,
      level_info: getLevelInfo(updatedUser.exp),
      date
    });
  });

  /** 执行签到（内部函数，auto 和 manual 共用） */
  function doCheckin(userId) {
    const today = todayStr();
    const exists = db.prepare('SELECT id FROM check_ins WHERE user_id = ? AND check_in_date = ?').get(userId, today);
    if (exists) return { already: true };

    const txn = db.transaction(() => {
      db.prepare("INSERT INTO check_ins (user_id, check_in_date, created_at) VALUES (?, ?, datetime('now'))").run(
        userId,
        today
      );
      db.prepare('UPDATE profiles SET points = points + 10 WHERE id = ?').run(userId);
      addExp(db, userId, EXP_REWARDS.signin);
    });
    txn();

    const user = db.prepare('SELECT points, exp FROM profiles WHERE id = ?').get(userId);
    return { already: false, points: user.points, exp: user.exp, level_info: getLevelInfo(user.exp) };
  }

  app.post('/api/checkin/auto', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, points FROM profiles WHERE id = ?').get(req.session.userId);
    if (!user) return res.json({ checkedIn: false, points: 0 });

    const result = doCheckin(req.session.userId);
    if (result.already) return res.json({ checkedIn: true, points: user.points, newCheckin: false });
    res.json({
      checkedIn: true,
      points: result.points,
      newCheckin: true,
      exp: result.exp,
      level_info: result.level_info
    });
  });

  app.post('/api/checkin', requireAuth, (req, res) => {
    const result = doCheckin(req.session.userId);
    if (result.already) return res.status(400).json({ error: '今天已经签到过了' });
    res.json({ ok: true, points: result.points, exp: result.exp, level_info: result.level_info });
  });
};
