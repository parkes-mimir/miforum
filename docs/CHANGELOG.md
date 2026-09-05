# 更新日志

本项目遵循 [语义化版本](https://semver.org/)。

---

## [1.1.5] - 2026-09-05 - 贡献者：parkes-mimir

### 新增

- **板块重构**：支持特殊板块和普通板块
  - 📢 公告板块：仅管理员可发帖
  - 🔥 热门板块：Discourse 启发的个性化推荐算法，不可直接发帖
  - 普通板块：用户可自行创建（每人限5个）
  - 板块支持 emoji 图标、简介描述
- **热门帖子算法**：
  - 评分公式：`(点赞×3 + 评论×2 + 收藏×1) ÷ (小时+2)^1.5`
  - 个性化：用户交互过的分类/作者获得加权
  - 时间衰减：仅展示30天内帖子
  - 随机因子：±10% 防止千人一面
- **用户创建板块**：`POST /api/categories/user`
  - 标识2-20字符（英文/数字/下划线）
  - 名称1-10字
  - 每人最多5个板块

### 涉及文件

| 文件 | 改动 |
|------|------|
| src/database.js | categories 表新增 description/icon/section_type/created_by 字段 |
| src/services/hotPosts.js | 新建热门帖子算法服务 |
| src/controllers/admin.js | 板块 CRUD 支持新字段、用户创建板块 API |
| src/controllers/posts.js | 热门板块走独立算法、公告板块发帖权限控制 |
| public/forum.html | 侧边栏分区展示、创建板块弹窗、板块管理更新 |
| schema.sql | categories 表同步更新 |

---

## [1.1.4] - 2026-09-05 - 贡献者：parkes-mimir

### 新增

- **投票功能**：帖子可附带投票，支持单选/多选
  - 发帖时可添加投票（2-10个选项）
  - 投票时间限制：不限时/1小时/6小时/1天/3天/7天/30天
  - 自动过期：到期自动关闭投票，显示"已结束"
  - 倒计时显示：剩余X天/剩余X时X分/剩余X分钟
  - 匿名投票：只显示票数和百分比，不显示投票人
  - 撤销投票：投票后可撤销
  - 进度条动画：投票后显示各选项百分比
- **帖子编辑投票管理**：
  - 删除已有投票（级联删除选项和记录）
  - 新建投票（仅当帖子无投票时）
  - 已有投票不可编辑，保护数据一致性

### 涉及文件

| 文件 | 改动 |
|------|------|
| src/database.js | 新增 polls/poll_options/poll_votes 表 |
| src/controllers/polls.js | 新建投票控制器 |
| src/controllers/posts.js | 发帖/编辑支持投票、帖子详情返回投票数据 |
| public/forum.html | 发帖弹窗投票表单、时长选择 |
| public/post.html | 投票卡片渲染、投票/撤销、编辑模式投票管理 |
| schema.sql | 新增投票相关表定义 |

---

## [1.1.3] - 2026-09-04 - 贡献者：parkes-mimir

### 新增

- **消息中心**：独立标签页 `/messages`，B站风格侧边栏导航
  - 我的私信：会话列表 + 聊天窗口，支持1对1私信
  - 回复我的：评论通知列表
  - 收到的赞：点赞通知列表
  - 收藏我的：收藏通知列表
  - 各分类独立未读数角标，支持单独全部已读
- **通知系统**：点赞/评论/收藏帖子自动触发通知
  - 数据库新增 `notifications` 表
  - 后端通知控制器（CRUD、分类筛选、批量已读）
- **私信系统**：用户主页点击"发私信"进入聊天
  - 数据库新增 `conversations`、`conversation_participants`、`messages` 表
  - 后端私信控制器（会话管理、消息收发、未读统计）
  - 聊天轮询刷新（5秒间隔）
- **消息徽标**：右上角信封图标显示总未读数
  - 页面可见时自动刷新徽标

### 修复

- 私信发送按钮被压缩（添加 flex-shrink-0）
- 消息中心侧边栏徽标0时隐藏
- 从消息中心返回后徽标自动刷新
- 所有页面统一显示消息中心按钮（forum/post/profile/shop）

### 涉及文件

| 文件 | 改动 |
|------|------|
| src/database.js | 新增 notifications/conversations/messages 表 |
| src/controllers/notifications.js | 新建通知控制器 |
| src/controllers/messages.js | 新建私信控制器 |
| src/controllers/likes.js | 触发通知 |
| src/controllers/comments.js | 触发通知 |
| src/server.js | 注册新路由、添加 /messages 路由 |
| public/messages.html | 新建消息中心页面 |
| public/forum.html | 消息图标、徽标刷新 |
| public/post.html | 消息图标 |
| public/profile.html | 消息图标、发私信按钮 |
| public/shop.html | 消息图标 |
| schema.sql | 新增表定义 |

---

## [1.1.2] - 2026-09-04 - 贡献者：parkes-mimir

### 新增

- **私密帖子**：发帖/编辑时可勾选"私密帖子"，仅作者和管理员可见
  - 帖子列表、详情页、用户主页、点赞列表均过滤私密帖子
  - 私密帖子显示"私密"标签
  - 数据库 `posts` 表新增 `private` 字段（自动迁移）
- **帖子排序**：帖子列表支持三种排序方式
  - 最新（默认）：按发布时间倒序
  - 最多赞：按点赞数倒序
  - 最早：按发布时间正序
  - URL 支持 `?sort=most_liked` 参数
- **移动端搜索框**：移动端搜索框独立一行显示，桌面端保持原布局

### 涉及文件

| 文件 | 改动 |
|------|------|
| src/database.js | posts 表添加 private 字段 |
| src/controllers/posts.js | 排序参数、私密帖子过滤、创建/编辑支持 private |
| src/controllers/profile.js | 用户帖子/点赞列表过滤私密帖子 |
| public/forum.html | 排序控件、私密开关、移动端搜索框 |
| public/post.html | 私密标签、编辑私密开关 |
| schema.sql | posts 表添加 private 字段 |

---

## [1.1.1] - 2026-09-04 - 贡献者：parkes-mimir

### 修复

- HTTP 环境登录状态丢失：`secure: isProduction` 导致浏览器拒绝存储 session cookie
  - 改为读取 `COOKIE_SECURE` 环境变量，默认 `false`
  - HTTPS 部署需在 `.env` 或 `docker-compose.yml` 中设置 `COOKIE_SECURE=true`
- 积分商店：不同称号/头像框可分别购买（修复只能买一个的 bug）
- Dockerfile 移除不存在的 `docs/` COPY 指令（修复 CI 构建失败）
- Docker 环境支持自动更新（从 GitHub 下载 release 包覆盖源码）

### 新增

- 头像框和称号在帖子列表、帖子详情、评论、右上角全局显示

---

## [1.1.0] - 2026-09-04 - 贡献者：parkes-mimir

安全审计修复版本，共修复 21 项安全/代码质量问题，涉及 20 个文件。未新增任何 npm 依赖。

### 安全修复（严重）

- XSS 防护：所有 lightbox onclick 中的 URL 使用 `escAttr()` 转义单引号（forum.html、post.html、profile.html）
- CSRF 防护：POST/PUT/DELETE 请求校验 Origin/Referer 头与 Host 一致性（server.js）
- CSP 移除 `unsafe-eval`，保留 `unsafe-inline`（server.js）
- 验证码暴力破解防护：per-email 内存锁，5 次错误锁定 10 分钟（auth.js）
- SMTP 密码 AES-256-GCM 加密存储，密钥派生自 SESSION_SECRET（helpers.js、admin.js、email.js）
- Display ID 竞态条件：UNIQUE 冲突时自动重试最多 5 次（auth.js）

### 安全修复（中危）

- 管理员自动更新改用 `git pull --rebase`，避免 `git reset --hard` 丢失数据（admin.js）
- `requireNotMuted` 中间件增加登录状态前置检查（middleware/auth.js）
- `/api/checkin/history` 添加 `requireAuth` 中间件（checkin.js）
- 查询语句 `SELECT *` 改为显式列名（auth.js、checkin.js）

### 改进

- 前端公共函数提取为 `public/js/common.js`（esc、toast、relTime、api、avatarHtml 等）
- multer 配置提取为 `src/utils/upload.js` 共享模块（postUpload、commentUpload、avatarUpload）
- `schema.sql` 重写为匹配实际 SQLite 表结构（原为 Supabase/PostgreSQL）
- `.dockerignore` 补充 `.env.*`、`docs/`、`backups/` 条目
- 新增 `tests/api.test.js` 测试文件，覆盖帖子搜索/筛选、评论分页、商店兑换、管理员积分、CSRF 校验等 25 个用例

### 修复

- 撤回 `sanitizeText` 入库净化（会破坏含 `<`、`>`、`&` 的用户内容，改为依赖前端 `esc()` / `textContent` 出库转义）

### 涉及文件

| 文件 | 改动 |
|------|------|
| src/server.js | CSRF 中间件、CSP 移除 unsafe-eval |
| src/controllers/auth.js | 验证码锁定、Display ID 重试、显式列名 |
| src/controllers/checkin.js | requireAuth、显式列名 |
| src/controllers/posts.js | multer 提取、撤回 sanitizeText |
| src/controllers/comments.js | multer 提取、撤回 sanitizeText |
| src/controllers/profile.js | multer 提取 |
| src/controllers/admin.js | SMTP 加密、git pull --rebase |
| src/middleware/auth.js | requireNotMuted 认证检查 |
| src/utils/helpers.js | 新增 encryptText/decryptText/sanitizeText |
| src/utils/upload.js | 新建 multer 共享模块 |
| src/utils/email.js | SMTP 密码解密 |
| src/database.js | ensureColumn 白名单（1.0.8 已修） |
| public/forum.html | escAttr 转义、common.js 引入 |
| public/post.html | escAttr 转义、common.js 引入 |
| public/shop.html | common.js 引入 |
| public/profile.html | common.js 引入 |
| public/js/common.js | 新建前端公共函数 |
| tests/api.test.js | 新建 25 个测试用例 |
| schema.sql | 重写为 SQLite 匹配 |
| .dockerignore | 补充条目 |
| package.json | 版本号 → 1.1.0 |

---

## [1.0.9] - 2026-09-03 - 贡献者：parkes-mimir

### 安全修复

- Lightbox XSS 防护：验证 URL 必须以 `/uploads/` 开头
- post.html 注册表单添加验证码输入框
- post.html 添加密码强度指示器
- post.html 添加发送验证码功能

### 修复

- 修复 post.html 注册缺少验证码字段
- 修复 lightbox onclick URL 未转义

---

## [1.0.8] - 2026-09-03 - 贡献者：parkes-mimir

### 安全修复

- CORS 策略改为白名单模式（通过 CORS_ORIGINS 环境变量配置）
- SQL 注入防护：shop.js 字段名白名单校验
- 验证码使用 crypto.randomInt（密码学安全）
- Session Cookie 生产环境强制 HTTPS
- 验证码暴力破解防护（10分钟内最多5次尝试）
- ensureColumn SQL 拼接白名单校验
- 用户帖子列表尊重隐私设置
- 添加 trust proxy 配置（Docker/reverse proxy）
- 删除重复的 getNextDisplayId 函数

---

## [1.0.7] - 2026-09-03 - 贡献者：parkes-mimir

### 改进

- Docker 挂载项目目录，支持容器内自动更新
- 数据库和上传目录使用 named volume 持久化
- Docker 环境更新提示改为重新构建镜像

### 修复

- 修复 Docker 容器内自动更新报错（无 .git 目录）

---

## [1.0.6] - 2026-09-03 - 贡献者：parkes-mimir

### 修复

- 纯图片评论无法编辑（添加隐藏 content 元素）
- 帖子详情页标签横排显示 + 展开/收起按钮
- 管理员用户列表布局优化（移动端）
- 多评论编辑独立状态（互不干扰）
- 管理员奖励积分按钮
- 修复管理员列表模板语法错误

---

## [1.0.5] - 2026-09-03 - 贡献者：parkes-mimir

### 改进

- 标签展开/收起按钮文案优化（展开全部 / 收起）
- 移动端帖子标签显示优化

---

## [1.0.4] - 2026-09-03 - 贡献者：parkes-mimir

### 修复

- 手机端发帖弹窗可滚动，发布按钮固定在底部
- 修复图片上传失败问题（控制器使用 helpers.js 的 UPLOADS_DIR，支持环境变量）
- Docker 环境下图片上传路径正确

---

## [1.0.3] - 2026-09-03 - 贡献者：parkes-mimir

### 修复

- 禁用 CSP `upgrade-insecure-requests` 指令
- 解决浏览器自动将 HTTP 升级为 HTTPS 的问题
- 局域网 HTTP 访问完全正常

---

## [1.0.2] - 2026-09-03 - 贡献者：parkes-mimir

### 修复

- 禁用 HSTS，解决浏览器强制跳转 HTTPS 的问题
- 局域网 HTTP 访问正常

---

## [1.0.1] - 2026-09-03 - 贡献者：parkes-mimir

### 修复

- 添加 CORS 支持，允许局域网跨域访问
- 放宽 CSP 策略（connectSrc/imgSrc 允许 http/https）
- 修复其他设备访问时资源加载失败

---

## [1.0.0] - 2026-09-03 - 贡献者：parkes-mimir, jxwzx, phppi561

### 正式版发布

首个正式版本，功能完整、代码规范、测试覆盖。

### 功能清单

- 用户系统：注册（邮箱验证）、登录、退出、强制改密
- 个人资料：头像裁剪、简介、称号、头像框
- 帖子系统：CRUD、图片上传、标签、分类筛选
- 评论系统：CRUD、楼层号、置顶、图片
- 签到系统：自动签到、日历、补签
- 点赞/收藏：toggle、列表、隐私保护
- 积分系统：商店、称号、头像框、改名卡
- 等级系统：Lv1~Lv10，每日经验上限100
- 管理系统：禁言、删帖、分类管理、SMTP配置
- **关于页面**：版本信息、检查更新、自动更新
- Docker 支持：一键部署、环境变量配置
- CI/CD：GitHub Actions 自动测试

### 技术栈

- 后端：Node.js + Express + SQLite（better-sqlite3）
- 前端：HTML + Tailwind CSS + 原生 JavaScript
- 测试：jest + supertest（53 个用例）
- 部署：Docker / Docker Compose

---

## [0.9.9] - 2026-09-03 - 贡献者：parkes-mimir

### 改进

- **经验值系统优化**：
  - 每日经验上限：100（注册经验不受限）
  - 新增 `exp_log` 表记录经验获取日志
  - 发帖经验：20 → 15，收到点赞：3 → 2，收到评论：2 → 1
- **等级曲线调整**（10个月满级）：
  - Lv10 需要 30000 经验（原 12000）
  - 前期升级快，鼓励新用户
  - 后期需要长期坚持
- **安全加固**：
  - CSP 细化白名单替代完全禁用
  - 测试环境禁用速率限制

---

## [0.9.8] - 2026-09-03 - 贡献者：parkes-mimir

### 新增

- **邮箱验证**：
  - 注册时需要输入邮箱验证码
  - `POST /api/send-code` — 发送验证码接口
  - 支持 QQ邮箱、163/yeah.net邮箱等 SMTP 服务
  - 验证码 10 分钟有效，60秒发送间隔
  - `.env.example` 添加 SMTP 配置说明
- **管理面板 SMTP 配置**：
  - 管理面板添加「邮箱设置」标签
  - 支持配置 SMTP 主机、端口、SSL、邮箱、授权码
  - 支持测试 SMTP 连接
  - 配置存储在数据库（`settings` 表），优先于环境变量
- **管理面板改版**：
  - 添加标签切换（用户管理 / 邮箱设置）
  - 修复管理员用户列表不显示的 bug

### 改进

- 注册表单添加验证码输入框和发送按钮
- 发送按钮显示倒计时（60秒）
- `email.js` 支持从数据库读取 SMTP 配置

---

## [0.9.7] - 2026-09-02 - 贡献者：parkes-mimir

### 新增

- **Docker 支持**：
  - `Dockerfile`：基于 node:20-alpine 的轻量化镜像
  - `docker-compose.yml`：一键启动，支持环境变量配置
  - 数据库和上传目录持久化（`./data/`）
  - 端口可配置（默认 3000）
  - 健康检查
- **CI/CD**：
  - `.github/workflows/ci.yml`：push/PR 自动测试 + lint
  - `.github/workflows/docker.yml`：tag 推送自动构建 Docker 镜像
  - 镜像推送到 GitHub Container Registry (ghcr.io)
- **环境变量支持**：
  - `DB_PATH`：数据库文件路径
  - `UPLOADS_PATH`：上传目录路径

### 改进

- `database.js` 数据库路径支持环境变量配置
- `helpers.js` 上传目录支持环境变量配置

---

## [0.9.6] - 2026-09-02 - 贡献者：parkes-mimir

### 修复

- 统一 `display_id` 为六位数（000000-999999）
  - 超管：`#000000`
  - 普通用户：`#000001` 起
  - 旧数据库自动迁移超管 display_id
- 移除商店「无头像框」商品（先删订单再删商品）
- 更新 `.gitignore` 忽略 `src/data.db`

---

## [0.9.5] - 2026-09-02 - 贡献者：parkes-mimir

### 隐私保护

- 点赞和收藏仅本人可见
- 公开资料关闭后，其他人不能查看点赞和收藏
- 公开资料开启时，其他人可正常查看

---

## [0.9.4] - 2026-09-02 - 贡献者：parkes-mimir

### 新增

- **分页翻页**：帖子列表、评论列表、收藏列表、用户帖子/点赞
  - 每页条数：帖子20条、评论50条、收藏20条
  - 翻页控件：页码 + 上一页/下一页 + 总数
  - 点击帖子从新标签页改为当前页跳转
- **显示本机 IP**：服务器启动时显示所有网卡 IP 地址
- **密码强度指示器**：注册和修改密码时显示密码强度
  - 4档强度：非常弱(红)、弱(橙)、一般(黄)、强(绿)、非常强(深绿)
  - 进度条 + 文字实时反馈
- **修改密码入口**：编辑资料弹窗添加「修改密码」按钮

### 修复

- 修复 `tailwind.css` 缺失 `h-1` 等类（重新生成 CSS）
- 修复强制改密标志被服务器重启重置的问题
- 开发环境放宽速率限制（500次/分钟）

---

## [0.9.3] - 2026-09-02 - 贡献者：parkes-mimir

### 新增

- **环境变量管理**：使用 `dotenv` 管理配置
  - `.env.example` 示例文件
  - 支持 `PORT`、`SESSION_SECRET`、`ADMIN_EMAIL`、`ADMIN_PASSWORD`、`NODE_ENV`
- **分页加载**：所有列表 API 支持分页
  - `GET /api/posts?page=1&limit=20`
  - `GET /api/posts/:id/comments?page=1&limit=50`
  - `GET /api/bookmarks?page=1&limit=20`
  - `GET /api/users/:id/posts?page=1&limit=20`
  - `GET /api/users/:id/likes?page=1&limit=20`
  - 响应包含 `pagination: { page, limit, total, pages }`
- **安全加固**：
  - `helmet`：设置安全 HTTP 头
  - `express-rate-limit`：API 速率限制
  - 登录/注册速率限制（防暴力破解）
- **强制修改密码**：超管首次登录弹窗提示修改默认密码
  - `POST /api/change-password` — 修改密码接口
  - 登录/页面加载时检测 `force_password_change` 字段
  - 修改成功后标记 `force_password_change = 0`
- **单元测试**：`jest` + `supertest`
  - 16 个测试用例全部通过

### 改进

- `server.js` 重构：分离 `createApp()` 和 `registerRoutes()`，支持测试

---

## [0.9.2] - 2026-09-02 - 贡献者：parkes-mimir

### 重大变更

- **项目结构重构**：采用 NodeBB 风格的模块化架构
  - `src/server.js` — 主入口（Express 配置 + 路由注册）
  - `src/controllers/` — 业务模块（9 个独立控制器）
  - `src/middleware/` — 中间件（认证、权限）
  - `src/utils/` — 工具函数
  - `public/` — 前端静态文件
  - `docs/` — 文档

### 模块拆分

| 控制器 | 文件 | 负责人 | API数 |
|--------|------|--------|-------|
| auth | src/controllers/auth.js | parkes | 4 |
| posts | src/controllers/posts.js | parkes | 5 |
| comments | src/controllers/comments.js | parkes | 5 |
| checkin | src/controllers/checkin.js | phppi561 | 5 |
| likes | src/controllers/likes.js | jxwzx | 7 |
| shop | src/controllers/shop.js | parkes | 6 |
| level | src/controllers/level.js | jxwzx | 1 |
| profile | src/controllers/profile.js | parkes | 4 |
| admin | src/controllers/admin.js | phppi561 | 16 |

### 新增

- ESLint 代码规范配置（`.eslintrc.json`）
- `npm run lint` / `npm run lint:fix` 命令
- `npm run dev` 开发模式（自动重启）

### 改进

- `addExp` 函数改为接收 `db` 参数，避免循环依赖
- 修复 `likes.js` 使用 ESM 语法问题（改为 CommonJS）

### Bug 修复

- 修复管理员中间件调用（`requireAdmin` 需传 `db` 参数）
- 修复 `tailwind.css` 路径（改为 `css/tailwind.css`）
- 删除重复的 `docs/README.md`

---

## [0.9.1] - 2026-09-02 - 贡献者：parkes-mimir

### Bug 修复

- 修复 `selectTitle`/`selectFrame` 使用隐式 `event` 对象
- 修复 `shop.html` 的 `esc()` 缺少单引号转义
- 删除测试遗留的 `cookies.txt`

---


## [0.9.0] - 2026-09-02 - 贡献者：jxwzx

### 活跃度等级系统（完整实现）

- 等级体系：Lv1 ~ Lv10，四阶段图标（⭐星星 Lv1-3 / 🌙月亮 Lv4-6 / ☀️太阳 Lv7-9 / 👑皇冠 Lv10）
- 经验值获取规则（参考 QQ 等级设计）：
  - 注册 +50 / 每日签到 +10 / 补签 +5
  - 发帖 +20 / 评论 +5
  - 收到点赞 +3 / 收到评论 +2
  - 收藏帖子 +2
- 等级进度条：薄轨道 + 渐变填充 + 流动光泽 + 末端横向喷射粒子特效
- 等级徽章按阶段配色：星星蓝 / 月亮紫 / 太阳橙 / 皇冠金红
- 个人资料页等级卡片：徽章 + 当前经验/升级经验 + 距下一级提示

### API 变更

- 新增 `/api/leaderboard/level` — 活跃度等级排行榜
- `/api/me`、`/api/users/:id`、`/api/posts`、`/api/posts/:id`、`/api/comments` 全部返回 `exp` 和 `level_info` 字段
- 发帖 / 评论 / 点赞 / 收藏 API 自动累加经验

### 积分商店增强

- 新增装备/卸下接口：`POST /api/shop/equip`、`POST /api/shop/unequip`
- 称号和头像框可在编辑资料弹窗中选择装备
- 头像框改用内联 style 实现渐变光环（gold/silver/blue/purple），不再依赖 Tailwind 编译类

### 数据库

- `profiles` 表新增 `exp` 字段（默认 0），自动迁移旧库
- `ensureColumn()` 迁移机制，启动时检查并补全缺失列

### 修复

- 修复 Tailwind 预编译 CSS 缺少动态渐变类导致头像框/等级徽章不显示
- 修复浏览器缓存旧 HTML 导致修改不生效（HTML 文件加 no-cache 响应头）
- 修复等级徽章字体白色在白色背景上不可见

---

## [0.8.4] - 2026-09-02 - 贡献者：jxwzx

### 积分商店优化

- 称号和头像框不可重复购买（永久物品限制）
- 商店页面显示已拥有商品状态（灰色显示 + "已拥有"标签）
- 已拥有商品不可点击购买

### 个人资料增强

- 编辑资料新增称号选择（显示已拥有的称号列表）
- 编辑资料新增头像框选择（显示已拥有的头像框列表）
- 个人主页显示当前称号标签
- 头像框 CSS 效果（金/银/蓝/紫光环）

### 修复

- 修复编辑资料无法保存称号和头像框的问题
- 清理重复的购买记录
- 修复 loadUserItems 函数未被调用的问题

---
## [0.8.3] - 2026-09-01 - 贡献者：parkes-mimir

### 安全修复

- 路径遍历漏洞：`deleteFile` 限制只能删除 uploads 目录下的文件
- Session 安全：使用 `crypto.randomBytes` 生成密钥，添加 `httpOnly`/`sameSite` 属性
- 输入校验：注册时校验用户名长度（2-20字）、字符合法性、邮箱格式
- `requireNotMuted` 中间件：验证用户是否存在

### 功能修复

- 添加 `/api/admin/status` 端点（管理员状态检查）
- 删除重复的 `resetPostForm` 定义（修复发帖后标签不重置）
- 删除重复的 `adminPanelModal` HTML（修复无效 HTML）
- 评论前检查帖子是否存在（返回友好错误信息）

---

## [0.8.2] - 2026-09-01 - 贡献者：parkes-mimir

### 新增

- PWA meta 标签：theme-color、apple-mobile-web-app-capable
- 移动端触摸优化：:active 状态反馈
- 触摸设备优化：@media (hover: none) 媒体查询
- 禁用双击缩放：user-scalable=no

### 改进

- shop.html 移动端布局优化（响应式间距、字体大小）
- forum.html 移动端日历优化（缩小间距和字体）
- 商品卡片和兑换记录响应式优化

---

## [0.8.1] - 2026-09-01 - 贡献者：parkes-mimir

### 新增

- 用户 display_id 系统：三位数用户标识（000-999）
  - 超级管理员固定为 `000`
  - 普通用户从 `001` 开始自动生成
  - 所有用户相关 API 返回 `display_id` 字段
  - 帖子/评论 API 返回 `author_display_id` 字段
- 前端显示 display_id
  - 帖子列表显示作者 display_id
  - 帖子详情和评论显示 display_id
  - 个人资料显示 display_id
  - 管理员用户列表显示 display_id

### API 变更

- 注册响应新增 `display_id` 字段
- 登录响应新增 `display_id` 字段
- `/api/me` 响应新增 `display_id` 字段
- `/api/users/:id` 响应新增 `display_id` 字段
- `/api/admin/users` 响应新增 `display_id` 字段
- `/api/profile` 响应新增 `display_id` 字段
- 帖子列表/详情响应新增 `author_display_id` 字段
- 评论列表响应新增 `author_display_id` 字段

---

## [0.8.0] - 2026-09-01 - 贡献者：parkes-mimir, jxwzx

### 重大变更

- 数据库迁移：JSON 文件存储 → SQLite（better-sqlite3）
  - 支持事务，解决并发读写问题
  - 单文件存储（data.db），部署简单
  - 使用 WAL 模式提升并发性能
  - 提供迁移脚本（migrate.js），自动迁移现有数据

### 新增

- Tailwind CSS 本地化：移除外部 CDN 依赖
  - 生成本地 tailwind.css（27KB）
  - 使用系统字体替代 Google Fonts
  - 国内网络环境下可正常访问

### 修复

- 修复 JSON 数据库并发读写导致的数据丢失问题
- 修复点赞/收藏/签到重复写入问题
- 修复积分操作竞态条件

### 技术改进

- 数据库模块化（database.js），便于维护
- 使用 UNIQUE 约束防止重复数据
- 使用外键约束保证数据一致性
- 事务包裹多步操作，保证原子性

---

## [0.7.1] - 2026-09-01 - 贡献者：parkes-mimir

### 新增

- 头像框预览：兑换前可看到当前头像 + 框体效果对比
- 称号预览：兑换前可看到用户名 + 称号标签效果

### 文档

- CHANGELOG.md 添加 v0.7.0 更新日志
- README.md 更新 API 表（商店API）、功能列表、项目结构

---

## [0.7.0] - 2026-09-01 - 贡献者：parkes-mimir, jxwzx

### 新增

- 积分商店系统：称号（永久生效）、头像框（CSS样式）、改名卡
- 商店页面 `shop.html`：商品展示、兑换确认弹窗、头像框/称号预览、兑换记录
- 称号系统：发帖/评论/个人资料显示称号标签
- 头像框系统：CSS-based（金/银/蓝/紫），头像圆形区域外的框体
- 改名卡：兑换后获得 `rename_chances`，改名消耗一张，无卡不能改名
- 帖子/评论/收藏 API 返回 `author_title` 和 `author_avatar_frame`
- 管理员设置积分 API：`PUT /api/admin/users/:id/points`

### 移除

- 普通用户发帖置顶（移除 `pin_card` 商品）
- 顶置次数字段（移除 `pinned_count`/`pin_chances`）

### 修复

- `loadDB()` 补充 `shop_items`/`shop_orders` 初始化（兼容已有数据库）
- `shop.html` 修复引用已删除变量 `pin_card`/`pin_chances`
- 添加 `/shop` 路由

### API

- `GET /api/shop/items` — 获取商店商品
- `POST /api/shop/exchange` — 兑换商品（自动设置称号/头像框/改名卡）
- `GET /api/shop/orders` — 兑换记录
- `PUT /api/admin/users/:id/points` — 管理员设置积分

---

## [0.6.0] - 2026-09-01 - 贡献者：parkes-mimir

### 新增

- 帖子标签系统：发帖/编辑支持添加标签（最多10个，每标签20字）
- 标签 API：`GET /api/tags` 获取热门标签，`GET /api/posts?tag=` 按标签筛选
- 动态分类管理：分类存储到数据库，管理员可增删改分类
- 分类 API：`GET /api/categories`、`POST/PUT/DELETE /api/categories/:id`
- 帖子分类/标签可点击跳转主页筛选（URL 参数 `?category=` `?tag=`）
- 收藏图标改为五角星（★），已收藏变黄色
- 登录/注册后自动刷新分类列表

### 修复

- 标签解析支持原生数组（JSON body）
- 分类管理添加按钮布局溢出
- 侧边栏分类不显示

---

## [0.5.2] - 2026-09-01 - 贡献者：parkes-mimir, jxwzx

### 新增

- 收藏功能：帖子列表/详情页收藏按钮（书签图标），个人资料「TA的收藏」Tab
- 收藏 API：`POST/DELETE /api/bookmark/:postId`、`GET /api/bookmarks`、`GET /api/bookmark/:postId`
- 帖子 API 返回 `bookmarks_count` 字段

### 修复

- 修复 post.html 收藏按钮函数位置错误
- 修复 profile.html 收藏 Tab 结构问题
- CHANGELOG.md 独立文件，README 更新日志精简

---

## [0.5.1] - 2026-09-01 - 贡献者：jxwzx

### 新增

- 帖子列表页添加收藏按钮（书签图标）
- 帖子详情页添加收藏按钮
- 个人中心「TA的收藏」标签页，展示用户收藏的帖子

### API

- `POST /api/bookmark/:postId` — 收藏帖子
- `DELETE /api/bookmark/:postId` — 取消收藏
- `GET /api/bookmarks` — 当前用户收藏列表
- `GET /api/bookmark/:postId` — 检查是否已收藏
- 帖子列表和详情 API 新增 `bookmarks_count` 字段

---

## [0.5.0] - 2026-08-31 - 贡献者：parkes-mimir

### 新增

- 个人资料页（`profile.html`）：英雄区 + 简介 + 统计 + 帖子/点赞/收藏 Tab
- 头像上传 + 裁剪预览（canvas 渲染，拖动定位，滚轮/按钮/双指缩放 100%-4000%）
- 个人简介（最多 200 字）、所在地、个人网站、隐私开关
- 点击头像/用户名跳转个人资料页
- 帖子/评论 API 返回 `author_avatar_url`

### API

- `GET /api/users/:id` — 用户公开资料（含隐私控制）
- `PUT /api/profile` — 修改资料（FormData: avatar, username, bio, location, website, profile_public）
- `GET /api/users/:id/posts` — 用户帖子列表
- `GET /api/users/:id/likes` — 用户点赞列表

### Bug 修复

- 修复 renderAuth 函数声明缺失导致页面崩溃
- 修复 Tab 切换空指针错误
- 头像裁剪改用 canvas 渲染，大圆圈和小预览完全一致
- 头像缩放限制最低 100%、最高 4000%

---

## [0.4.0] - 2026-08-31 - 贡献者：parkes-mimir, phppi561

### 新增

- 三级角色：超级管理员 / 管理员 / 普通用户
- 超级管理员账号 `root@miforum.local` / `123456`（首次启动自动创建）
- 超级管理员可授予/撤销管理员权限、转让超管角色
- 帖子置顶（管理员）、禁言/解禁用户
- 前端显示角色标签（超管/管理）

### API

- `PUT /api/superadmin/grant-admin/:id`
- `PUT /api/superadmin/revoke-admin/:id`
- `PUT /api/superadmin/transfer/:id`
- `GET /api/admin/users`
- `PUT /api/admin/users/:id/mute`
- `DELETE /api/admin/users/:id`
- `PUT /api/posts/:id/pin`

---

## [0.3.1] - 2026-08-30 - 贡献者：parkes-mimir

- 全部代码添加中文注释
- 提取 `deleteFile()` / `deleteImages()` 辅助函数
- 函数级 JSDoc 注释、变量说明、区块分隔

---

## [0.3.0] - 2026-08-30 - 贡献者：parkes-mimir

### 帖子系统

- 帖子新标签页打开（`post.html`）
- 图片 lightbox 弹窗预览
- 帖子编辑支持增删图片
- 帖子删除级联清理评论图片
- `GET /api/posts/:id` 单帖子接口

### 评论系统

- 评论支持多图片上传（最多 3 张）
- 楼层号、楼主标签、帖主置顶评论
- 评论编辑/删除（作者、帖主、管理员）

### 签到系统

- 打开网页自动签到
- 补签后正确刷新状态
- 签到日历月份选择器修复

### Bug 修复

- multer Unexpected field 错误处理
- JSON.parse 加 try-catch 防崩溃
- 删除帖子时清理评论图片文件

---

## [0.2.1] - 2026-08-29 - 贡献者：phppi561

### 签到 API 时区修复

- `addDays` 改用 UTC 避免时区/DST 偏差
- `daysBetween` 统一使用 `T00:00:00Z`
- `calcStreaks` 今天未签到时从昨天起算，避免断签
- 补签限制为注册日至昨天

---

## [0.2.0] - 2026-08-29 - 贡献者：parkes-mimir

### 签到系统

- 365 天签到日历（月历视图、左右翻页、月份选择器、今天按钮）
- 已签到：左上角绿色圆角三角 + 白色对勾
- 可补签：背景大字浅红色「补」
- 侧边栏显示连续/累计签到天数
- 端口占用自动杀旧进程重启

---

## [0.1.0] - 2026-08-28 - 贡献者：parkes-mimir

- 初始版本
- 用户注册 / 登录 / 退出
- 帖子 CRUD（技术 / 生活 / 公告分类）
- 评论 CRUD
- 点赞 toggle
- 每日签到 +10 积分
- 搜索 + 分类筛选
- Flarum 风格响应式 UI


