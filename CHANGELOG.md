# 更新日志

本项目遵循 [语义化版本](https://semver.org/)。

---

## [0.9.1] - 2026-09-02 - 贡献者：parkes-mimir

### Bug 修复

- 修复 `selectTitle`/`selectFrame` 使用隐式 `event` 对象（改为参数传递 `el`）
- 修复 `shop.html` 的 `esc()` 缺少单引号转义
- 删除测试遗留的 `cookies.txt`

### 安全

- `.gitignore` 添加 `cookies.txt` 防止泄露 session

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


