/**
 * bot.js - BOT服务
 *
 * 提供RSS拉取和自动发帖功能，
 * 支持多个BOT、定时拉取、去重机制。
 */

const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'MiForum-Bot/1.0'
  }
});

/**
 * 初始化BOT服务
 * @param {Object} app Express应用实例
 * @param {Object} db 数据库实例
 */
function initBotService(app, db) {
  // 确保所有BOT用户存在
  ensureAllBotUsers(db);

  // 启动定时拉取
  startScheduler(db);

  console.log('  ✓ BOT服务已启动');
}

/**
 * 确保BOT用户存在，如果不存在则创建
 */
function ensureBotUser(db, botId, botName) {
  const email = `bot-${botId}@miforum.local`;
  const botUser = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);

  if (!botUser) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('bot-password-' + Date.now(), 10);

    // 生成唯一的display_id
    const maxId = db.prepare('SELECT MAX(CAST(display_id AS INTEGER)) as max_id FROM profiles').get();
    const nextId = (maxId.max_id || 1000) + 1;

    try {
      db.prepare(
        `
        INSERT INTO profiles (display_id, username, email, password_hash, role, profile_public, created_at)
        VALUES (?, ?, ?, ?, 'user', 1, datetime('now'))
      `
      ).run(String(nextId).padStart(6, '0'), botName + 'Bot', email, hash);
      console.log(`  ✓ BOT用户 "${botName}Bot" 创建完成`);
    } catch (e) {
      console.error(`  ✗ BOT用户创建失败: ${e.message}`);
      return null;
    }
  }

  return db.prepare('SELECT id FROM profiles WHERE email = ?').get(email)?.id;
}

/**
 * 确保所有BOT用户存在
 */
function ensureAllBotUsers(db) {
  const bots = db.prepare('SELECT id, name FROM bots').all();
  for (const bot of bots) {
    ensureBotUser(db, bot.id, bot.name);
  }
}

/**
 * 获取BOT用户ID
 */
function getBotUserId(db, botId) {
  const bot = db.prepare('SELECT name FROM bots WHERE id = ?').get(botId);
  if (!bot) return null;

  const email = `bot-${botId}@miforum.local`;
  const user = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
  return user ? user.id : null;
}

/**
 * 启动定时调度器
 */
function startScheduler(db) {
  // 每分钟检查一次是否有BOT需要拉取
  setInterval(() => {
    fetchAllBots(db);
  }, 60 * 1000);

  // 启动后立即执行一次
  setTimeout(() => {
    fetchAllBots(db);
  }, 5000);
}

/**
 * 拉取所有启用的BOT
 */
async function fetchAllBots(db) {
  const bots = db.prepare('SELECT * FROM bots WHERE enabled = 1').all();
  const now = new Date();

  for (const bot of bots) {
    // 检查是否到达拉取时间
    if (bot.last_fetched_at) {
      const lastFetch = new Date(bot.last_fetched_at);
      const diffMinutes = (now - lastFetch) / (1000 * 60);
      if (diffMinutes < bot.interval_minutes) {
        continue;
      }
    }

    try {
      await fetchBot(db, bot);
    } catch (e) {
      console.error(`BOT "${bot.name}" 拉取失败:`, e.message);
    }
  }
}

/**
 * 拉取单个BOT的RSS
 */
async function fetchBot(db, bot) {
  console.log(`  → 拉取BOT "${bot.name}" RSS...`);

  const feed = await parser.parseURL(bot.rss_url);

  // 确保BOT用户存在并获取用户ID
  const botUserId = ensureBotUser(db, bot.id, bot.name);
  if (!botUserId) {
    console.error('  ✗ BOT用户创建失败');
    return;
  }

  let newPosts = 0;

  for (const item of feed.items.slice(0, 10)) {
    // 生成唯一标识
    const guid = item.guid || item.link || item.title;

    // 检查是否已发过
    const exists = db.prepare('SELECT id FROM bot_posts WHERE rss_guid = ?').get(guid);
    if (exists) continue;

    // 构建帖子内容
    const title = (item.title || '无标题').slice(0, 100);
    let content = item.contentSnippet || item.content || item.summary || '';

    // 添加原文链接
    if (item.link) {
      content += `\n\n---\n原文链接：${item.link}`;
    }

    // 限制内容长度
    content = content.slice(0, 5000);

    // 插入帖子
    const result = db
      .prepare(
        `
      INSERT INTO posts (title, content, category, tags, author_id, images, private, created_at)
      VALUES (?, ?, ?, '[]', ?, '[]', 0, datetime('now'))
    `
      )
      .run(title, content, bot.category, botUserId);

    const postId = result.lastInsertRowid;

    // 记录BOT发帖
    db.prepare('INSERT INTO bot_posts (bot_id, post_id, rss_guid) VALUES (?, ?, ?)').run(bot.id, postId, guid);

    newPosts++;
  }

  // 更新最后拉取时间
  db.prepare("UPDATE bots SET last_fetched_at = datetime('now') WHERE id = ?").run(bot.id);

  if (newPosts > 0) {
    console.log(`  ✓ BOT "${bot.name}" 发布了 ${newPosts} 篇新帖子`);
  }
}

/**
 * 手动触发BOT拉取
 */
async function manualFetch(db, botId) {
  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(botId);
  if (!bot) throw new Error('BOT不存在');

  await fetchBot(db, bot);
  return { ok: true, message: `BOT "${bot.name}" 拉取完成` };
}

module.exports = {
  initBotService,
  manualFetch,
  fetchAllBots
};
