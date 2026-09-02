const { requireAuth } = require('../middleware/auth');
const { todayStr, addDays, daysBetween, dateStr } = require('../utils/helpers');
const { addExp, EXP_REWARDS, getLevelInfo } = require('./level');

function calcStreaks(checkinDates) {
  if (!checkinDates.length) return { current: 0, longest: 0, total: 0 };

  const sorted = [...checkinDates].sort();
  const dateSet = new Set(sorted);
  let current = 0, longest = 0, streak = 0;

  const today = todayStr();
  let d = dateSet.has(today) ? today : addDays(today, -1);
  while (dateSet.has(d)) { current++; d = addDays(d, -1); }

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
    const found = db.prepare('SELECT id FROM check_ins WHERE user_id = ? AND check_in_date = ?')
      .get(req.session.userId, today);
    res.json({ checkedIn: !!found });
  });

  app.get('/api/checkin/history', (req, res) => {
    const empty = { checkinDates: [], currentStreak: 0, longestStreak: 0, totalDays: 0, missedDays: [], retroactiveCost: 10 };
    if (!req.session.userId) return res.json(empty);

    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
    if (!user) return res.json(empty);

    const today = todayStr();
    const regDate = dateStr(user.created_at).slice(0, 10);
    const yearAgo = addDays(today, -364);
    const startDate = regDate > yearAgo ? regDate : yearAgo;

    const userCheckins = db.prepare('SELECT check_in_date FROM check_ins WHERE user_id = ?')
      .all(req.session.userId).map(c => c.check_in_date);
    const checkinSet = new Set(userCheckins);

    const checkinDates = userCheckins.filter(d => d >= yearAgo);

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
    if (!date) return res.status(400).json({ error: '请指定补签日期' });

    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const today = todayStr();
    const regDate = dateStr(user.created_at).slice(0, 10);
    const cost = 10;

    if (date < regDate || date >= today) {
      return res.status(400).json({ error: '只能补签注册日至昨天的日期' });
    }
    const exists = db.prepare('SELECT id FROM check_ins WHERE user_id = ? AND check_in_date = ?')
      .get(req.session.userId, date);
    if (exists) return res.status(400).json({ error: '该日期已签到' });
    if ((user.points || 0) < cost) {
      return res.status(400).json({ error: `积分不足，补签需要 ${cost} 积分，当前 ${user.points || 0} 积分` });
    }

    const doRetroactive = db.transaction(() => {
      db.prepare('UPDATE profiles SET points = points - ? WHERE id = ?').run(cost, req.session.userId);
      db.prepare('INSERT INTO check_ins (user_id, check_in_date, retroactive, created_at) VALUES (?, ?, 1, datetime(\'now\'))')
        .run(req.session.userId, date);
      addExp(db, req.session.userId, EXP_REWARDS.retroactive);
    });
    doRetroactive();

    const updatedUser = db.prepare('SELECT points, exp FROM profiles WHERE id = ?').get(req.session.userId);
    res.json({ ok: true, points: updatedUser.points, exp: updatedUser.exp, level_info: getLevelInfo(updatedUser.exp), date });
  });

  app.post('/api/checkin/auto', requireAuth, (req, res) => {
    const today = todayStr();
    const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.session.userId);
    if (!user) return res.json({ checkedIn: false, points: 0 });

    const already = db.prepare('SELECT id FROM check_ins WHERE user_id = ? AND check_in_date = ?')
      .get(req.session.userId, today);
    if (already) return res.json({ checkedIn: true, points: user.points, newCheckin: false });

    const doCheckin = db.transaction(() => {
      db.prepare('INSERT INTO check_ins (user_id, check_in_date, created_at) VALUES (?, ?, datetime(\'now\'))')
        .run(req.session.userId, today);
      db.prepare('UPDATE profiles SET points = points + 10 WHERE id = ?').run(req.session.userId);
      addExp(db, req.session.userId, EXP_REWARDS.signin);
    });
    doCheckin();

    const updatedUser = db.prepare('SELECT points, exp FROM profiles WHERE id = ?').get(req.session.userId);
    res.json({ checkedIn: true, points: updatedUser.points, newCheckin: true, exp: updatedUser.exp, level_info: getLevelInfo(updatedUser.exp) });
  });

  app.post('/api/checkin', requireAuth, (req, res) => {
    const today = todayStr();
    const exists = db.prepare('SELECT id FROM check_ins WHERE user_id = ? AND check_in_date = ?')
      .get(req.session.userId, today);
    if (exists) return res.status(400).json({ error: '今天已经签到过了' });

    const doCheckin = db.transaction(() => {
      db.prepare('INSERT INTO check_ins (user_id, check_in_date, created_at) VALUES (?, ?, datetime(\'now\'))')
        .run(req.session.userId, today);
      db.prepare('UPDATE profiles SET points = points + 10 WHERE id = ?').run(req.session.userId);
      addExp(db, req.session.userId, EXP_REWARDS.signin);
    });
    doCheckin();

    const user = db.prepare('SELECT points, exp FROM profiles WHERE id = ?').get(req.session.userId);
    res.json({ ok: true, points: user ? user.points : 0, exp: user ? user.exp : 0, level_info: getLevelInfo(user ? user.exp : 0) });
  });
};
