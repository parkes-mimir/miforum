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

### 点赞与收藏

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/likes` | 当前用户点赞的帖子 ID 列表 |
| POST | `/api/like/:id` | 点赞 |
| DELETE | `/api/like/:id` | 取消点赞 |
| GET | `/api/bookmarks` | 当前用户收藏列表 |
| GET | `/api/bookmark/:id` | 检查是否已收藏 |
| POST | `/api/bookmark/:id` | 收藏 |
| DELETE | `/api/bookmark/:id` | 取消收藏 |

### 标签

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tags` | 热门标签（按使用次数排序） |

### 分类

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/categories` | 获取所有分类（公开） |
| POST | `/api/categories` | 创建分类（管理员） |
| PUT | `/api/categories/:id` | 编辑分类（管理员） |
| DELETE | `/api/categories/:id` | 删除分类（管理员） |

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

详见 [CHANGELOG.md](./CHANGELOG.md)

**最新版本 v0.6.0** — 帖子标签系统、动态分类管理、收藏改五角星

## 贡献者

- **parkes-mimir** — 项目发起、需求设计、个人资料系统、头像裁剪、测试
- **phppi561** — 签到 API 时区修复（v0.2.1）、管理员功能（v0.4.0）
- **jxwzx** — 收藏功能开发（v0.5.1）

## 声明

本项目由 AI（OpenCode / mimo-v2.5-pro）编写，人类提供需求和测试反馈。许可证待定。
