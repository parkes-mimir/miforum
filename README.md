# MiForum

Flarum 风格的轻量论坛，单文件前端 + Node.js 后端，JSON 文件数据库，开箱即用。

## 灵感来源

- [Flarum](https://github.com/flarum/flarum) — UI 设计风格（卡片式布局、圆角、极简配色）
- [Discourse](https://github.com/discourse/discourse) — 社区交互模式（分类、签到、积分）

## 功能

- 注册 / 登录 / 退出（bcryptjs 加密，session 持久化）
- 每日签到（每天一次，积分 +10）
- 发帖（技术 / 生活 / 公告分类）
- 评论（作者可编辑 / 删除）
- 点赞 toggle
- 搜索 + 分类筛选
- 响应式布局（Tailwind CSS，适配手机和桌面）

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
├── db.json           # 运行时数据库（自动生成）
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
| POST | `/api/checkin` | 签到 |
| POST | `/api/like/:id` | 点赞 |
| DELETE | `/api/like/:id` | 取消点赞 |

## License

MIT
