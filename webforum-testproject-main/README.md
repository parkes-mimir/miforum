# MiForum

Flarum 风格的轻量论坛，单文件前端 + Node.js 后端，JSON 文件数据库，开箱即用。

## 灵感来源

- [Flarum](https://github.com/flarum/flarum) — UI 设计风格（卡片式布局、圆角、极简配色）
- [Discourse](https://github.com/discourse/discourse) — 社区交互模式（分类、签到、积分）
- 小黑盒 — 签到日历交互设计

## 功能

- 注册 / 登录 / 退出（bcryptjs 加密，session 持久化）
- 每日签到（每天一次，积分 +10）
- 签到日历（月历视图，左上角三角✓标记已签，大字「补」标记可补签）
- 积分补签（注册日至昨天之间的未签日期，每次消耗10积分）
- 月份快速跳转（点击月份标题弹出选择器，支持翻页动画）
- 发帖（技术 / 生活 / 公告分类）
- 评论（作者可编辑 / 删除）
- 点赞 toggle
- 搜索 + 分类筛选
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

## 技术栈

- **前端**: HTML + Tailwind CSS (CDN) + 原生 JavaScript
- **后端**: Express.js + bcryptjs + express-session
- **数据库**: JSON 文件存储（`db.json`，零配置）

## 项目结构

```
├── forum.html        # 前端页面（单文件，含 HTML/CSS/JS）
├── server.js         # 后端 REST API
├── package.json      # 依赖声明
├── schema.sql        # Supabase PostgreSQL schema（备用）
├── db.json           # 运行时数据库（自动生成，已 gitignore）
└── .gitignore
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/register` | 注册 |
| POST | `/api/login` | 登录 |
| POST | `/api/logout` | 退出 |
| GET | `/api/me` | 当前用户 |
| GET | `/api/posts` | 帖子列表（?category=&search=） |
| POST | `/api/posts` | 发帖 |
| GET | `/api/posts/:id/comments` | 评论列表 |
| POST | `/api/posts/:id/comments` | 发评论 |
| PUT | `/api/comments/:id` | 编辑评论 |
| DELETE | `/api/comments/:id` | 删除评论 |
| GET | `/api/checkin/today` | 今日签到状态 |
| GET | `/api/checkin/history` | 签到历史（365天日历+统计+可补签日期） |
| POST | `/api/checkin` | 签到 |
| POST | `/api/checkin/retroactive` | 补签（body: `{date: "2026-08-28"}`） |
| POST | `/api/like/:id` | 点赞 |
| DELETE | `/api/like/:id` | 取消点赞 |

## 更新日志

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
- 补签接口：只能补签注册日至昨天之间的日期（今天请走正常签到）

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

## 声明

本项目由 AI（OpenCode / mimo-v2.5-pro）编写，人类提供需求和测试反馈。许可证待定。
