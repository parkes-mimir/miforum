# 更新日志

本项目遵循 [语义化版本](https://semver.org/)。

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

### 活跃度等级系统

- 等级体系：Lv1 ~ Lv10，四阶段图标（⭐星星 / 🌙月亮 / ☀️太阳 / 👑皇冠）
- 经验值获取：注册+50、签到+10、发帖+20、评论+5、点赞+3、收藏+2
- 等级排行榜 `/api/leaderboard/level`
- 装备系统 `/api/shop/equip`、`/api/shop/unequip`
- 个人资料页等级卡片（进度条+粒子特效）
- 称号/头像框选择切换

---

## [0.8.3] - 2026-09-01 - 贡献者：parkes-mimir

### 安全修复

- 路径遍历漏洞：`deleteFile` 限制只能删除 uploads 目录
- Session 安全：使用 `crypto.randomBytes` 生成密钥
- 输入校验：注册时校验用户名长度、字符、邮箱格式
- `requireNotMuted` 中间件验证用户存在

---

## [0.8.2] - 2026-09-01 - 贡献者：parkes-mimir

### 新增

- PWA meta 标签（theme-color、apple-mobile-web-app）
- 移动端触摸优化（:active 状态、@media hover:none）
- 禁用双击缩放（user-scalable=no）

---

## [0.8.1] - 2026-09-01 - 贡献者：parkes-mimir

### 新增

- 用户 display_id 系统：三位数用户标识（000-999）
- 前端显示 display_id（帖子列表、评论、个人资料、管理员列表）

---

## [0.8.0] - 2026-09-01 - 贡献者：parkes-mimir, jxwzx

### 重大变更

- 数据库迁移：JSON 文件 → SQLite（better-sqlite3）
- Tailwind CSS 本地化：移除外部 CDN 依赖

---

## [0.7.1] - 2026-09-01 - 贡献者：parkes-mimir

- 头像框预览：兑换前可看到当前头像 + 框体效果
- 称号预览：兑换前可看到用户名 + 称号标签

---

## [0.7.0] - 2026-09-01 - 贡献者：parkes-mimir, jxwzx

- 积分商店系统：称号、头像框、改名卡
- 称号/头像框系统

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
