# MiForum

Flarum 风格的轻量论坛，Node.js + Express 后端，SQLite 数据库，开箱即用。

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
- 积分商店（称号、头像框、改名卡，兑换即生效）
- 称号系统（发帖/评论/个人资料显示称号标签）
- 头像框系统（CSS-based 金/银/蓝/紫框，头像圆形区域外展示）
- 改名卡（兑换后获得改名次数，改名消耗一次）
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
- **数据库**: SQLite（better-sqlite3，单文件存储，支持事务）

## 项目结构

```
├── forum.html        # 首页（帖子列表、签到日历、管理面板）
├── post.html         # 帖子详情页（新标签页打开）
├── profile.html      # 个人资料页（头像裁剪、编辑资料、TA的帖子/点赞/收藏）
├── shop.html         # 积分商店（称号、头像框、改名卡兑换）
├── server.js         # 后端 REST API
├── database.js       # SQLite 数据库模块
├── migrate.js        # 数据迁移脚本（JSON → SQLite）
├── tailwind.css      # 本地 Tailwind CSS（27KB）
├── package.json      # 依赖声明
├── API.md            # API 文档
├── CHANGELOG.md      # 更新日志
├── data.db           # SQLite 数据库文件（自动生成，已 gitignore）
├── uploads/          # 上传的图片（已 gitignore）
└── .gitignore
```

## API

详见 [API.md](./API.md)

**API 概览**

| 模块 | 接口数 | 说明 |
|------|--------|------|
| 认证 | 4 | 注册、登录、退出、当前用户 |
| 帖子 | 6 | CRUD、列表、置顶 |
| 评论 | 5 | CRUD、楼层、置顶 |
| 签到 | 5 | 自动签到、历史、补签 |
| 点赞 | 3 | 点赞、取消、列表 |
| 收藏 | 4 | 收藏、取消、检查、列表 |
| 标签 | 1 | 热门标签 |
| 分类 | 4 | CRUD |
| 用户 | 4 | 资料、修改、帖子、点赞 |
| 管理员 | 7 | 禁言、删用户、设积分、授权 |
| 商店 | 3 | 商品、兑换、订单 |

**共计 46 个 API 接口**

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

**最新版本 v0.8.1** — 用户 display_id 系统（三位数用户标识）

## 贡献者

- **parkes-mimir** — 项目发起、需求设计、个人资料系统、头像裁剪、测试
- **phppi561** — 签到 API 时区修复（v0.2.1）、管理员功能（v0.4.0）
- **jxwzx** — 收藏功能开发（v0.5.1）

## 声明

本项目由 AI（OpenCode / mimo-v2.5-pro）编写，人类提供需求和测试反馈。许可证待定。
