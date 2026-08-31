# MiForum

Flarum 风格的轻量论坛，Node.js + Express 后端，JSON 文件数据库，开箱即用。

## 灵感来源

- [Flarum](https://github.com/flarum/flarum) — UI 设计风格（卡片式布局、圆角、极简配色）
- [Discourse](https://github.com/discourse/discourse) — 社区交互模式（分类、签到、积分）
- 小黑盒 — 签到日历交互设计

## 功能

- 注册 / 登录 / 退出（bcryptjs 加密，session 持久化）
- 自动签到（打开网页即签到，每日 +10 积分）
- 签到日历（月历视图，月份选择器，今天按钮，翻页动画）
- 积分补签（注册日至昨天之间的未签日期，每次消耗 10 积分）
- 个人资料（头像裁剪预览、简介、所在地、网站、隐私开关）
- 发帖（技术 / 生活 / 公告分类，多图片上传最多 30 张，10MB/张）
- 帖子新标签页完整展示，图片 lightbox 弹窗预览
- 帖子编辑 / 删除（作者可操作，支持增删图片）
- 评论（支持图片最多 3 张，楼层号，楼主标签，帖主置顶）
- 评论编辑 / 删除（作者可操作，帖主可删任意评论）
- 点赞 toggle + TA的点赞列表
- 搜索 + 分类筛选
- 三级权限体系（超级管理员 / 管理员 / 普通用户）
- 超级管理员：授权/撤销管理员、转让超管、用户管理
- 管理员：禁言/解禁用户、删帖、删评论、置顶帖子
- 禁言用户无法发帖/评论
- 积分系统（签到 +10，发帖 +5，补签 -10）
- 响应式布局（Tailwind CSS，适配手机和桌面）
- 端口占用自动杀旧进程重启

## 快速开始

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

浏览器打开 http://localhost:3000

超级管理员：`root@miforum.local` / `123456`

## 技术栈

- **前端**: HTML + Tailwind CSS (CDN) + 原生 JavaScript
- **后端**: Node.js + Express.js + bcryptjs + express-session + multer
- **数据库**: JSON 文件存储（`db.json`，零配置）

## 项目结构

```
├── forum.html        # 首页（帖子列表、签到日历、管理面板）
├── post.html         # 帖子详情页（新标签页打开）
├── profile.html      # 个人资料页（头像裁剪、编辑资料、TA的帖子/点赞/收藏）
├── server.js         # 后端 REST API
├── package.json      # 依赖声明
├── schema.sql        # Supabase PostgreSQL schema（备用）
├── db.json           # 运行时数据库（自动生成，已 gitignore）
├── uploads/          # 上传的图片（已 gitignore）
└── .gitignore
```

## API

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/register` | 注册（username, email, password） |
| POST | `/api/login` | 登录（email, password） |
| POST | `/api/logout` | 退出 |
| GET | `/api/me` | 当前用户信息（含 avatar_url, bio, role） |

### 个人资料

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users/:id` | 用户公开资料（隐私控制） |
| PUT | `/api/profile` | 修改资料（FormData: avatar, username, bio, location, website, profile_public） |
| GET | `/api/users/:id/posts` | 用户帖子列表 |
| GET | `/api/users/:id/likes` | 用户点赞列表 |

### 帖子

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/posts` | 帖子列表（?category=&search=） |
| GET | `/api/posts/:id` | 单个帖子详情 |
| POST | `/api/posts` | 发帖（FormData: images[], title, content, category） |
| PUT | `/api/posts/:id` | 编辑帖子（FormData: images[], removeImages） |
| DELETE | `/api/posts/:id` | 删除帖子（级联删除评论和图片） |
| PUT | `/api/posts/:id/pin` | 置顶/取消置顶帖子（管理员） |

### 评论

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/posts/:id/comments` | 评论列表（含楼层号、置顶排序） |
| POST | `/api/posts/:id/comments` | 发评论（FormData: images[], content） |
| PUT | `/api/comments/:id` | 编辑评论（FormData: images[], removeImages） |
| DELETE | `/api/comments/:id` | 删除评论（作者或帖主或管理员） |
| PUT | `/api/comments/:id/pin` | 置顶/取消置顶评论（仅帖主） |

### 签到

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/checkin/today` | 今日签到状态 |
| GET | `/api/checkin/history` | 签到历史（365天日历+统计+可补签日期） |
| POST | `/api/checkin` | 手动签到（+10积分） |
| POST | `/api/checkin/auto` | 自动签到（页面加载时调用） |
| POST | `/api/checkin/retroactive` | 补签（body: {date}，-10积分） |

### 点赞

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/likes` | 当前用户点赞的帖子 ID 列表 |
| POST | `/api/like/:id` | 点赞 |
| DELETE | `/api/like/:id` | 取消点赞 |

### 管理员

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/users` | 用户列表 |
| PUT | `/api/admin/users/:id/mute` | 禁言/取消禁言 |
| DELETE | `/api/admin/users/:id` | 删除用户（级联删除） |
| PUT | `/api/superadmin/grant-admin/:id` | 授予管理员（超管） |
| PUT | `/api/superadmin/revoke-admin/:id` | 撤销管理员（超管） |
| PUT | `/api/superadmin/transfer/:id` | 转让超管（超管） |

## 更新日志

### v0.5.0 (2026-08-31) — 贡献者: parkes-mimir

**个人资料系统**

- 新增 `profile.html` 个人资料页（英雄区 + 简介 + 统计 + 帖子/点赞/收藏 Tab）
- 头像上传 + 裁剪预览（canvas 渲染，拖动定位，滚轮/按钮/双指缩放 100%-4000%）
- 个人简介（最多 200 字）、所在地、个人网站
- 隐私开关（关闭后他人无法查看详细资料）
- TA的帖子 Tab：展示用户发布的帖子
- TA的点赞 Tab：展示用户点赞过的帖子
- TA的收藏 Tab：预留接口，显示「即将上线」
- 点击头像/用户名跳转个人资料页
- 帖子/评论 API 返回 `author_avatar_url`，前端显示真实头像

**新增 API**

- `GET /api/users/:id` — 用户公开资料（含隐私控制）
- `PUT /api/profile` — 修改资料（头像+简介+隐私）
- `GET /api/users/:id/posts` — 用户帖子列表
- `GET /api/users/:id/likes` — 用户点赞列表

**收藏系统预留**

- 数据库新增 `bookmarks` 表
- server.js 注释块说明接口设计（POST/DELETE/GET）
- 前端 Tab 已就位，待后续对接

**Bug 修复**

- 修复 renderAuth 函数声明缺失导致页面崩溃
- 修复 Tab 切换空指针错误（bookmarksEmpty 不存在）
- 头像裁剪改用 canvas 渲染，大圆圈和小预览完全一致
- 头像缩放限制最低 100%、最高 4000%

### v0.4.0 (2026-08-31) — 贡献者: parkes-mimir, phppi561

**权限体系重构**

- 三级角色：超级管理员 / 管理员 / 普通用户
- 超级管理员账号：`root@miforum.local` / `123456`（首次启动自动创建）
- 移除管理员认证密钥，改为账号密码登录
- 超级管理员可授予/撤销管理员权限
- 超级管理员可转让超管角色（转让后自己降为普通用户）
- 管理员不能管理管理员，只有超管有任免权
- 超级管理员不能被禁言/删除
- 登录返回 `role` 字段，前端显示角色标签（超管/管理）
- 用户管理面板显示角色标签和操作按钮

### v0.3.1 (2026-08-30)

**代码质量**

- 全部代码添加中文注释（server.js / forum.html / post.html）
- server.js 提取 `deleteFile()` / `deleteImages()` 辅助函数消除重复
- 所有函数添加 JSDoc 注释说明用途和参数
- 变量声明前加注释说明含义
- 区块分隔线清晰划分功能模块

### v0.3.0 (2026-08-30)

**帖子系统升级**

- 帖子点击改为新标签页打开完整详情页（post.html）
- 图片点击改为 lightbox 弹窗预览，不再新开标签页
- 帖子编辑支持增删图片
- 帖子删除级联清理评论图片文件
- 新增 `GET /api/posts/:id` 单帖子接口

**评论系统升级**

- 评论支持多图片上传（最多 3 张）
- 编辑评论时可新增/删除图片
- 显示楼层号（#1, #2, #3...）
- 楼主标签（帖主评论显示「楼主」）
- 帖主可置顶/取消置顶评论（书签图标）
- 置顶评论排序优先但楼层号不变
- 帖主可删除任意评论

**签到系统优化**

- 打开网页自动签到，移除签到按钮
- 补签后正确刷新签到状态
- 签到日历月份选择器修复错位

### v0.2.1 (2026-08-29) — 贡献者: phppi561

**签到 API 时区修复**

- `addDays` 改用 UTC 避免时区/DST 偏差
- `daysBetween` 统一使用 `T00:00:00Z` 确保计算准确
- `calcStreaks` 今天未签到时从昨天起算，避免当天未签就断签
- 补签限制为注册日至昨天（今天走正常签到）

### v0.2.0 (2026-08-29)

**签到系统重做**

- 新增 365 天签到日历，月历视图，左右翻页
- 点击月份标题弹出 1-12 月选择器，快速跳转
- 「今天」按钮一键回到当月
- 翻页带滑动过渡动画
- 日历格子固定 6 行 42 格，本月黑色 / 非本月浅灰
- 已签到：左上角绿色圆角三角 + 白色对勾
- 可补签：背景大字浅红色「补」，点击补签消耗 10 积分
- 侧边栏显示连续签到天数 / 累计签到天数
- 补签接口：只能补签注册日至昨天之间的日期

**其他改进**

- 端口被占用时自动杀旧进程重启
- db.json 加入 .gitignore，测试数据不丢失

### v0.1.0 (2026-08-28)

- 初始版本
- 用户注册 / 登录 / 退出
- 帖子 CRUD（技术 / 生活 / 公告分类）
- 评论 CRUD（作者可编辑 / 删除）
- 点赞 toggle
- 每日签到 +10 积分
- 搜索 + 分类筛选
- Flarum 风格响应式 UI

## 贡献者

- **parkes-mimir** — 项目发起、需求设计、个人资料系统、头像裁剪、测试
- **phppi561** — 签到 API 时区修复（v0.2.1）、管理员功能（v0.4.0）

## 声明

本项目由 AI（OpenCode / mimo-v2.5-pro）编写，人类提供需求和测试反馈。许可证待定。
