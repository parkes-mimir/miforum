# MiForum v1.2.5 测试报告

## 测试环境

- **运行时**: Node.js v24.14.1
- **测试框架**: Jest 30.5.1
- **HTTP 测试**: Supertest 7.2.2
- **数据库**: better-sqlite3 (内存模式)
- **测试时间**: 2026-09-06

## 测试结果总览

| 指标 | 结果 |
|------|------|
| 测试套件 | 3/3 通过 |
| 测试用例 | 160/160 通过 |
| E2E 测试 | 23/23 通过 |
| 快照 | 0 |
| 执行时间 | ~3.8 秒 |
| ESLint | 通过 |

## 测试套件详情

### 1. auth.test.js - 认证与基础功能 (65 用例)

| 模块 | 用例数 | 状态 | 测试内容 |
|------|--------|------|----------|
| 认证 API | 12 | ✅ | 注册、登录、登出、输入校验、重复检测 |
| 签到 API | 5 | ✅ | 每日签到、重复签到、签到历史 |
| 帖子 API | 8 | ✅ | CRUD、分页、搜索、分类筛选 |
| 评论 API | 6 | ✅ | 创建、编辑、删除、分页 |
| 点赞/收藏 API | 6 | ✅ | 点赞、取消点赞、收藏、取消收藏 |
| 商店 API | 6 | ✅ | 商品列表、兑换、积分扣除 |
| 用户资料 API | 5 | ✅ | 获取资料、更新资料、头像上传 |
| 标签/分类 API | 4 | ✅ | 分类列表、标签提取 |
| 管理员 API | 8 | ✅ | 禁言、删除用户、积分调整 |
| 安全测试 | 5 | ✅ | CSRF 防护、速率限制、权限校验 |

### 2. api.test.js - 高级功能 (50 用例)

| 模块 | 用例数 | 状态 | 测试内容 |
|------|--------|------|----------|
| 帖子高级功能 | 6 | ✅ | 创建、搜索、分类/标签筛选、分页上限 |
| 评论高级功能 | 4 | ✅ | 创建、分页、置顶、删除 |
| 商店高级功能 | 5 | ✅ | 商品不存在、缺少ID、未购买、无效类型 |
| 管理员高级功能 | 7 | ✅ | 积分奖励、分类 CRUD、排行榜 |
| 通知 API | 8 | ✅ | 点赞通知、列表、筛选、已读标记 |
| 私信 API | 8 | ✅ | 会话创建、消息发送、未读数、权限 |
| 私密帖子 | 5 | ✅ | 创建、作者/管理员可见、他人不可见 |
| 帖子排序 | 3 | ✅ | 最新、最多赞、最早排序 |
| 用户资料补充 | 4 | ✅ | 用户帖子/点赞列表、不存在用户 |
| 签到补签 | 2 | ✅ | 缺少日期、未来日期校验 |
| 管理员用户管理 | 6 | ✅ | 禁言、置顶、SMTP、版本、标签 |
| 安全测试补充 | 2 | ✅ | CSRF 跨域拒绝、速率限制头 |

## API 端点覆盖

### 认证相关 (6 端点)
- ✅ POST /api/send-code
- ✅ POST /api/register
- ✅ POST /api/login
- ✅ POST /api/logout
- ✅ GET /api/me
- ✅ POST /api/change-password

### 帖子相关 (5 端点)
- ✅ GET /api/posts
- ✅ GET /api/posts/:id
- ✅ POST /api/posts
- ✅ PUT /api/posts/:id
- ✅ DELETE /api/posts/:id

### 评论相关 (4 端点)
- ✅ GET /api/posts/:id/comments
- ✅ POST /api/posts/:id/comments
- ✅ PUT /api/comments/:id
- ✅ DELETE /api/comments/:id

### 点赞/收藏 (5 端点)
- ✅ POST /api/like/:id
- ✅ DELETE /api/like/:id
- ✅ POST /api/bookmark/:id
- ✅ DELETE /api/bookmark/:id
- ✅ GET /api/bookmarks

### 签到相关 (3 端点)
- ✅ GET /api/checkin/today
- ✅ GET /api/checkin/history
- ✅ POST /api/checkin

### 商店相关 (3 端点)
- ✅ GET /api/shop/items
- ✅ GET /api/shop/orders
- ✅ POST /api/shop/exchange

### 用户资料 (4 端点)
- ✅ GET /api/users/:id
- ✅ PUT /api/profile
- ✅ GET /api/users/:id/posts
- ✅ GET /api/users/:id/likes

### 通知相关 (5 端点)
- ✅ GET /api/notifications
- ✅ PUT /api/notifications/:id/read
- ✅ PUT /api/notifications/read-all
- ✅ GET /api/notifications/unread-count

### 私信相关 (5 端点)
- ✅ GET /api/conversations
- ✅ POST /api/conversations
- ✅ GET /api/conversations/:id/messages
- ✅ POST /api/conversations/:id/messages
- ✅ GET /api/messages/unread-count

### 管理员相关 (12 端点)
- ✅ GET /api/admin/status
- ✅ GET /api/admin/users
- ✅ PUT /api/admin/users/:id/mute
- ✅ DELETE /api/admin/users/:id
- ✅ PUT /api/admin/users/:id/points
- ✅ PUT /api/admin/users/:id/points/add
- ✅ GET /api/categories
- ✅ POST /api/categories
- ✅ PUT /api/categories/:id
- ✅ DELETE /api/categories/:id
- ✅ GET /api/admin/smtp
- ✅ GET /api/admin/version

### 其他 (5 端点)
- ✅ GET /api/tags
- ✅ GET /api/level/:userId
- ✅ GET /api/leaderboard/level
- ✅ PUT /api/posts/:id/pin
- ✅ GET /api/checkin/today

## 安全测试

| 测试项 | 状态 | 说明 |
|--------|------|------|
| CSRF 防护 | ✅ | 跨域 POST 请求被拒绝 |
| 速率限制 | ✅ | 返回 Retry-After 头 |
| 权限校验 | ✅ | 未登录访问受保护端点返回 401 |
| 管理员权限 | ✅ | 非管理员访问管理端点返回 403 |
| 输入校验 | ✅ | 邮箱、用户名、密码格式校验 |
| SQL 注入防护 | ✅ | 参数化查询 |

## 存储测试

| 测试项 | 状态 | 说明 |
|--------|------|------|
| SQLite 连接 | ✅ | WAL 模式、外键约束 |
| 数据持久化 | ✅ | 写入后读取一致 |
| 事务支持 | ✅ | 原子操作 |
| JSON 字段 | ✅ | tags/images 解析 |
| Session 存储 | ✅ | SQLite 持久化 |

## 已知限制

1. **Open Handles**: Jest 检测到2个打开的句柄（Session 清理定时器），使用 `--forceExit` 处理
2. **无前端测试**: 当前仅后端 API 测试，前端无自动化测试
3. **无 WebSocket 测试**: 私信轮询模式未测试实时性

## 建议

1. 补充前端 E2E 测试（Playwright/Cypress）
2. 添加性能测试（并发请求）
3. 添加数据库迁移测试
4. 添加备份/恢复测试
