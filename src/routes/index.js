/**
 * routes/index.js - 中央路由注册
 *
 * 职责：
 * - 集中管理所有 API 路由的挂载
 * - 提供清晰的路由映射表
 * - 便于查看项目所有 API 端点
 */

/**
 * 注册所有路由
 * @param {import('express').Express} app
 * @param {import('better-sqlite3').Database} db
 */
function registerRoutes(app, db) {
  // ============================================================
  // 认证相关
  // ============================================================
  // POST   /api/send-code          发送验证码
  // POST   /api/register           注册
  // POST   /api/login              登录
  // POST   /api/logout             登出
  // GET    /api/me                 获取当前用户
  // GET    /api/preferences        获取用户偏好
  // PUT    /api/preferences        更新用户偏好
  // POST   /api/change-password    修改密码
  require('../controllers/auth')(app, db);

  // ============================================================
  // 频道相关
  // ============================================================
  // GET    /api/channels            频道列表
  // GET    /api/channels/:id        频道详情
  // POST   /api/channels            创建频道
  // PUT    /api/channels/:id        编辑频道
  // DELETE /api/channels/:id        删除频道
  // POST   /api/channels/:id/join   加入频道
  // POST   /api/channels/:id/leave  退出频道
  // GET    /api/channels/:id/members 频道成员列表
  // PUT    /api/channels/:id/members/:uid/role 设置成员角色
  // GET    /api/channels/:id/boards 频道板块列表
  require('../controllers/channels')(app, db);

  // ============================================================
  // 兑换码
  // ============================================================
  // GET    /api/admin/redemption-codes    管理员兑换码列表
  // POST   /api/admin/redemption-codes    创建兑换码
  // DELETE /api/admin/redemption-codes/:id 删除兑换码
  // POST   /api/redemption/redeem         用户兑换
  require('../controllers/redemption')(app, db);

  // ============================================================
  // 帖子相关
  // ============================================================
  // GET    /api/posts              帖子列表
  // GET    /api/posts/:id          帖子详情
  // POST   /api/posts              创建帖子
  // PUT    /api/posts/:id          编辑帖子
  // DELETE /api/posts/:id          删除帖子
  require('../controllers/posts')(app, db);

  // ============================================================
  // 评论相关
  // ============================================================
  // GET    /api/posts/:id/comments  获取评论
  // POST   /api/posts/:id/comments  发表评论
  // PUT    /api/comments/:id        编辑评论
  // DELETE /api/comments/:id        删除评论
  require('../controllers/comments')(app, db);

  // ============================================================
  // 签到相关
  // ============================================================
  // GET    /api/checkin/today       今日签到状态
  // GET    /api/checkin/history     签到历史
  // POST   /api/checkin             手动签到
  // POST   /api/checkin/auto        自动签到
  // POST   /api/checkin/retroactive 补签
  require('../controllers/checkin')(app, db);

  // ============================================================
  // 点赞 & 收藏
  // ============================================================
  // GET    /api/likes               点赞列表
  // POST   /api/like/:postId        点赞
  // DELETE /api/like/:postId        取消点赞
  // POST   /api/bookmark/:postId    收藏
  // DELETE /api/bookmark/:postId    取消收藏
  // GET    /api/bookmark/:postId    收藏状态
  // GET    /api/bookmarks           收藏列表
  require('../controllers/likes')(app, db);

  // ============================================================
  // 积分商店
  // ============================================================
  // GET    /api/shop/items          商品列表
  // GET    /api/shop/items/:id      商品详情
  // GET    /api/shop/orders         订单列表
  // POST   /api/shop/exchange       兑换商品
  // POST   /api/shop/equip          装备
  // POST   /api/shop/unequip        卸下装备
  // GET    /api/admin/shop/items    管理员商品列表
  // POST   /api/admin/shop/items    创建商品
  // PUT    /api/admin/shop/items/:id 更新商品
  // DELETE /api/admin/shop/items/:id 删除商品
  // GET    /api/admin/shop/orders   管理员兑换记录
  require('../controllers/shop')(app, db);

  // ============================================================
  // 等级 & 经验
  // ============================================================
  // GET    /api/leaderboard/level   等级排行榜
  require('../controllers/level')(app, db);

  // ============================================================
  // 用户资料
  // ============================================================
  // GET    /api/users/:id           用户信息
  // PUT    /api/profile             编辑资料
  // GET    /api/users/:id/posts     用户帖子
  // GET    /api/users/:id/likes     用户点赞
  require('../controllers/profile')(app, db);

  // ============================================================
  // 通知 & 消息
  // ============================================================
  // GET    /api/notifications            通知列表
  // PUT    /api/notifications/:id/read   标记已读
  // PUT    /api/notifications/read-all   全部已读
  // GET    /api/notifications/unread-count 未读数
  require('../controllers/notifications')(app, db);

  // GET    /api/conversations            会话列表
  // POST   /api/conversations            创建会话
  // GET    /api/conversations/:id/messages 消息列表
  // POST   /api/conversations/:id/messages 发送消息
  // GET    /api/messages/unread-count    未读数
  require('../controllers/messages')(app, db);

  // ============================================================
  // 投票
  // ============================================================
  // POST   /api/polls               创建投票
  // GET    /api/polls/:id           获取投票
  // POST   /api/polls/:id/vote      投票
  // DELETE /api/polls/:id/vote      撤销投票
  require('../controllers/polls')(app, db);

  // ============================================================
  // 自定义表情
  // ============================================================
  // GET    /api/emoji/public        公共表情列表
  // GET    /api/emoji/my            我的收藏
  // POST   /api/emoji               上传表情
  // POST   /api/emoji/:id/collect   收藏表情
  // DELETE /api/emoji/:id/collect   取消收藏
  // DELETE /api/emoji/:id           删除表情
  require('../controllers/emoji')(app, db);

  // ============================================================
  // 管理后台 - 用户管理
  // ============================================================
  // GET    /api/admin/status        管理员状态
  // GET    /api/admin/users         用户列表
  // PUT    /api/admin/users/:id/mute    禁言
  // DELETE /api/admin/users/:id     删除用户
  // PUT    /api/posts/:id/pin       置顶帖子
  // PUT    /api/admin/users/:id/points      设置积分
  require('../controllers/admin-users')(app, db);

  // ============================================================
  // 管理后台 - 分类管理
  // ============================================================
  // GET    /api/categories          分类列表
  // POST   /api/categories          创建分类
  // PUT    /api/categories/:id      编辑分类
  // DELETE /api/categories/:id      删除分类
  // GET    /api/tags                标签列表
  require('../controllers/admin-categories')(app, db);

  // ============================================================
  // 管理后台 - 系统设置
  // ============================================================
  // GET    /api/admin/smtp          SMTP 配置
  // PUT    /api/admin/smtp          更新 SMTP
  // POST   /api/admin/smtp/test     测试 SMTP
  // GET    /api/admin/version       版本信息
  // GET    /api/admin/check-update  检查更新
  require('../controllers/admin-system')(app, db);

  // ============================================================
  // 管理后台 - 超级管理员
  // ============================================================
  // PUT    /api/superadmin/grant-admin/:id   授权管理
  // PUT    /api/superadmin/revoke-admin/:id  撤销管理
  // PUT    /api/superadmin/transfer/:id      转让超管
  // POST   /api/admin/update                 系统更新
  require('../controllers/admin-superadmin')(app, db);
}

module.exports = { registerRoutes };
