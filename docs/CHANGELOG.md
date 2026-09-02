# 更新日志

本项目遵循 [语义化版本](https://semver.org/)。

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

- 帖子标签系统
- 动态分类管理

---

## [0.5.x] - 2026-08-31

- 个人资料页、头像裁剪、收藏功能

---

## [0.4.0] - 2026-08-31 - 贡献者：parkes-mimir, phppi561

- 三级角色权限系统

---

## [0.3.x] - 2026-08-30

- 帖子新标签页、评论图片、签到日历

---

## [0.2.x] - 2026-08-29

- 签到系统、365天日历

---

## [0.1.0] - 2026-08-28 - 贡献者：parkes-mimir

- 初始版本
