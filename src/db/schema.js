/**
 * schema.js - 数据库表结构定义
 */

const SCHEMA_SQL = `
  -- 用户表
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_id TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT DEFAULT '',
    location TEXT DEFAULT '',
    website TEXT DEFAULT '',
    profile_public INTEGER DEFAULT 1,
    points INTEGER DEFAULT 0,
    exp INTEGER DEFAULT 0,
    muted INTEGER DEFAULT 0,
    role TEXT DEFAULT 'user',
    title TEXT,
    avatar_frame TEXT,
    rename_chances INTEGER DEFAULT 0,
    force_password_change INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 帖子表
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'tech',
    tags TEXT DEFAULT '[]',
    author_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    images TEXT DEFAULT '[]',
    pinned INTEGER DEFAULT 0,
    private INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  );

  -- 评论表
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT DEFAULT '',
    images TEXT DEFAULT '[]',
    pinned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 签到表
  CREATE TABLE IF NOT EXISTS check_ins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    check_in_date TEXT NOT NULL,
    retroactive INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, check_in_date)
  );

  -- 点赞表
  CREATE TABLE IF NOT EXISTS post_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(post_id, user_id)
  );

  -- 收藏表
  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(post_id, user_id)
  );

  -- 商品表
  CREATE TABLE IF NOT EXISTS shop_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    type TEXT NOT NULL,
    value TEXT,
    price INTEGER NOT NULL,
    stock INTEGER DEFAULT -1,
    enabled INTEGER DEFAULT 1,
    checkin_required INTEGER DEFAULT 0
  );

  -- 订单表
  CREATE TABLE IF NOT EXISTS shop_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES shop_items(id),
    item_name TEXT,
    item_type TEXT,
    price INTEGER,
    status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 邮箱验证码表
  CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT DEFAULT 'register',
    used INTEGER DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email, type);

  -- 验证码锁定表（防暴力破解）
  CREATE TABLE IF NOT EXISTS code_lockouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lockout_key TEXT UNIQUE NOT NULL,
    attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_code_lockouts_key ON code_lockouts(lockout_key);

  -- 系统设置表
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- 经验日志表（用于每日上限统计）
  CREATE TABLE IF NOT EXISTS exp_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    date TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_exp_log_user_date ON exp_log(user_id, date);

  -- 分类表（板块）
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT DEFAULT '',
    color TEXT DEFAULT 'bg-gray-100 text-gray-700',
    icon TEXT DEFAULT '',
    section_type TEXT DEFAULT 'normal',
    created_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
    visibility TEXT DEFAULT 'all',
    post_policy TEXT DEFAULT 'members',
    sort_order INTEGER DEFAULT 0
  );

  -- 频道表
  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '',
    color TEXT DEFAULT 'bg-gray-100 text-gray-700',
    created_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    is_official INTEGER DEFAULT 0,
    join_policy TEXT DEFAULT 'open',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 频道成员表
  CREATE TABLE IF NOT EXISTS channel_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(channel_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON channel_members(channel_id);

  -- 频道加入申请表
  CREATE TABLE IF NOT EXISTS channel_join_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    reason TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT,
    reviewed_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    UNIQUE(channel_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_channel_join_requests_channel ON channel_join_requests(channel_id, status);
  CREATE INDEX IF NOT EXISTS idx_channel_join_requests_user ON channel_join_requests(user_id);

  -- 板块可见成员表
  CREATE TABLE IF NOT EXISTS board_visible_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE(board_id, user_id)
  );

  -- 板块可发帖成员表
  CREATE TABLE IF NOT EXISTS board_post_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE(board_id, user_id)
  );

  -- 兑换码表
  CREATE TABLE IF NOT EXISTS redemption_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    reward_type TEXT NOT NULL,
    reward_value TEXT NOT NULL,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    expires_at TEXT,
    created_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_redemption_code ON redemption_codes(code);

  -- 兑换码使用记录表
  CREATE TABLE IF NOT EXISTS redemption_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_id INTEGER NOT NULL REFERENCES redemption_codes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    used_at TEXT DEFAULT (datetime('now')),
    UNIQUE(code_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_redemption_usage_code ON redemption_usage(code_id);
  CREATE INDEX IF NOT EXISTS idx_redemption_usage_user ON redemption_usage(user_id);

  -- 索引
  CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
  CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
  CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
  CREATE INDEX IF NOT EXISTS idx_posts_private ON posts(private);
  CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
  CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
  CREATE INDEX IF NOT EXISTS idx_check_ins_user_date ON check_ins(user_id, check_in_date);
  CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
  CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
  CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON shop_orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

  -- 通知表
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    from_user_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
  CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

  -- 会话表
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 会话参与者表
  CREATE TABLE IF NOT EXISTS conversation_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_read_at TEXT DEFAULT (datetime('now')),
    UNIQUE(conversation_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_conv_part_user ON conversation_participants(user_id);

  -- 私信表
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

  -- 投票表
  CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    poll_type TEXT DEFAULT 'single',
    max_choices INTEGER DEFAULT 1,
    status TEXT DEFAULT 'open',
    close_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_polls_post ON polls(post_id);

  -- 投票选项表
  CREATE TABLE IF NOT EXISTS poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);

  -- 投票记录表
  CREATE TABLE IF NOT EXISTS poll_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(poll_id, option_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
  CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id);

  -- 自定义表情表
  CREATE TABLE IF NOT EXISTS custom_emoji (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT DEFAULT 'custom',
    created_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_custom_emoji_creator ON custom_emoji(created_by);

  -- 用户表情收藏表
  CREATE TABLE IF NOT EXISTS user_emoji (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    emoji_id INTEGER NOT NULL REFERENCES custom_emoji(id) ON DELETE CASCADE,
    added_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, emoji_id)
  );
  CREATE INDEX IF NOT EXISTS idx_user_emoji_user ON user_emoji(user_id);
`;

module.exports = { SCHEMA_SQL };
