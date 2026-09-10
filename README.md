# MiForum

Flarum 风格的轻量论坛，Alpine.js 前端，Node.js + Express 后端，SQLite 数据库，EJS 模板渲染，开箱即用。

![MiForum 预览](docs/preview.png)

## 灵感来源

- [Flarum](https://github.com/flarum/flarum) — UI 设计风格
- [Discourse](https://github.com/discourse/discourse) — 社区交互模式
- [NodeBB](https://github.com/NodeBB/NodeBB) — 项目结构参考

## 功能

- 注册 / 登录 / 退出（bcryptjs 加密，Session SQLite 持久化，重启不丢失）
- 自动签到（打开网页即签到，每日 +10 积分）
- 签到日历（月历视图，月份选择器，今天按钮，翻页动画）
- 积分补签（注册日至昨天之间的未签日期，每次消耗 10 积分）
- 个人资料（头像裁剪预览、简介、所在地、网站、隐私开关）
- 发帖（技术 / 生活 / 公告分类，多图片上传最多 30 张，10MB/张）
- 帖子新标签页完整展示，图片 lightbox 弹窗预览
- 帖子编辑 / 删除（作者可操作，支持增删图片）
- 评论（支持图片最多 3 张，楼层号，楼主标签，帖主置顶）
- 评论编辑 / 删除（作者可操作，帖主可删任意评论）
- 点赞 toggle + TA的点赞列表（乐观更新，失败自动回滚）
- 收藏功能 + TA的收藏列表
- 搜索 + 分类筛选 + 标签筛选
- 三级权限体系（超级管理员 / 管理员 / 普通用户）
- 超级管理员：授权/撤销管理员、转让超管、用户管理
- 管理员：禁言/解禁用户、删帖、删评论、置顶帖子
- 积分系统（签到 +10，发帖 +5，补签 -10）
- 积分商店（称号、头像框、改名卡，兑换即生效）
- 活跃度等级系统（Lv1~Lv10，星星→月亮→太阳→皇冠）
- 经验值系统（注册+50、签到+10、发帖+20、评论+5）
- 装备系统（称号/头像框切换）
- 等级排行榜
- 关于页面（版本信息、检查更新、自动更新）
- 响应式布局（Tailwind CSS，适配手机和桌面）
- 主题系统（亮色/暗色模式 + 5种主题色，localStorage 持久化）
- 自定义表情（默认 emoji + 自定义图片上传 + 一键收藏）
- 帖子投票（单选/多选、时间限制、自动过期）
- 私密帖子（仅作者和管理员可见）
- 帖子排序（最新/最多赞/最早）
- 消息中心（通知、私信、B站风格侧边栏）
- 板块系统（公告/热门/普通板块，用户可创建）
- PWA 支持（theme-color、apple-mobile-web-app）
- 分页加载（帖子/评论/收藏列表）
- 安全加固（helmet、速率限制、CSRF 防护、CSP、SMTP 加密、验证码锁定持久化）
- 单元测试（jest + supertest，160 个用例）
- 环境变量管理（dotenv）
- Docker 支持（一键部署、自动更新）
- CI/CD（GitHub Actions）
- 端口占用自动杀旧进程重启

## 快速开始

### 方式一：直接运行

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 开发模式（自动重启）
npm run dev
```

### 方式二：Docker 部署

```bash
# 构建镜像
docker build -t miforum .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -v ./data:/data \
  -e SESSION_SECRET=change-me-in-production \
  miforum
```

### 方式三：Docker Compose

```bash
# 创建 .env 文件
echo "SESSION_SECRET=change-me-in-production" > .env

# 启动
docker-compose up -d

# 停止
docker-compose down
```

浏览器打开 http://localhost:3000

超级管理员：`root@miforum.local` / `123456`

**首次登录请立即修改密码！**

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Alpine.js 3.14 | 响应式 UI 框架（15KB，替代 Vue/React） |
| **模板** | EJS | 服务端模板渲染，公共 partials 复用 |
| **样式** | Tailwind CSS | 原子化 CSS 框架 |
| **后端** | Node.js + Express 4 | Web 框架 |
| **数据库** | SQLite (better-sqlite3) | 单文件数据库，WAL 模式 |
| **认证** | express-session + bcryptjs | Session 持久化（SQLite 存储） |
| **安全** | helmet + express-rate-limit | 安全头、速率限制 |
| **测试** | Jest + Supertest | 160 个测试用例 |

## 项目结构

```
├── src/                        # 后端源码
│   ├── server.js               # 主入口（Express 配置、EJS 配置）
│   ├── database.js             # 数据库连接管理
│   ├── db/
│   │   ├── schema.js           # 表结构 DDL
│   │   └── seeds.js            # 默认数据
│   ├── routes/
│   │   └── index.js            # 中央路由映射表
│   ├── controllers/            # 业务控制器
│   │   ├── auth.js             # 认证（注册/登录/退出）
│   │   ├── posts.js            # 帖子 CRUD
│   │   ├── comments.js         # 评论 CRUD
│   │   ├── checkin.js          # 签到系统
│   │   ├── likes.js            # 点赞/收藏
│   │   ├── shop.js             # 积分商店
│   │   ├── level.js            # 经验值/等级
│   │   ├── profile.js          # 个人资料
│   │   ├── notifications.js    # 通知系统
│   │   ├── messages.js         # 私信系统
│   │   ├── polls.js            # 投票系统
│   │   ├── emoji.js            # 表情系统
│   │   ├── admin-users.js      # 管理员-用户管理
│   │   ├── admin-categories.js # 管理员-分类管理
│   │   ├── admin-system.js     # 管理员-系统设置
│   │   └── admin-superadmin.js # 超级管理员操作
│   ├── services/               # 业务逻辑层
│   │   ├── level.js            # 等级服务
│   │   ├── post-helper.js       # 帖子工具
│   │   ├── notification.js     # 通知服务
│   │   ├── poll.js             # 投票服务
│   │   └── hot-posts.js        # 热门帖子算法
│   ├── middleware/
│   │   └── auth.js             # 认证/权限中间件
│   └── utils/
│       ├── helpers.js          # 通用工具
│       ├── email.js            # 邮件发送
│       └── upload.js           # 文件上传
│
├── views/                      # EJS 模板
│   ├── partials/
│   │   ├── head.ejs            # 公共 <head>
│   │   ├── header.ejs          # 公共导航栏
│   │   └── scripts.ejs         # 公共脚本引用
│   ├── forum.ejs               # 首页
│   ├── post.ejs                # 帖子详情
│   ├── profile.ejs             # 个人资料
│   ├── shop.ejs                # 积分商店
│   └── messages.ejs            # 消息中心
│
├── public/                     # 前端静态资源
│   ├── js/
│   │   ├── common.js           # 公共工具函数
│   │   ├── alpine.min.js       # Alpine.js 框架
│   │   ├── stores/app.js       # Alpine 全局状态
│   │   ├── components/         # 可复用组件
│   │   ├── pages/              # 页面逻辑
│   │   ├── emoji-picker.js     # 表情选择器
│   │   └── share.js            # 分享功能
│   └── css/
│       └── tailwind.css
│
├── docs/                       # 文档
│   ├── API.md
│   ├── CHANGELOG.md
│   ├── CHANGELOG-TEMPLATE.md
│   ├── TEST.md
│   └── TEST-REPORT.md
│
├── scripts/                    # 工具脚本
│   └── backup-db.sh            # 数据库备份
│
├── tests/                      # 测试文件
│   ├── auth.test.js
│   ├── api.test.js
│   └── services.test.js
│
├── .github/workflows/          # CI/CD
│   ├── ci.yml
│   └── docker.yml
│
├── .husky/                     # Git hooks
│   └── pre-commit
│
├── Dockerfile
├── docker-compose.yml
├── .eslintrc.json
├── .prettierrc
├── CONTRIBUTING.md
├── package.json
└── README.md
```

## API

详见 [docs/API.md](./docs/API.md)

**API 概览（79 个接口）**

| 模块 | 接口数 | 说明 |
|------|--------|------|
| 认证 | 6 | 注册、登录、退出、验证码、修改密码、当前用户 |
| 帖子 | 5 | CRUD、列表（含投票） |
| 评论 | 5 | CRUD、置顶 |
| 签到 | 5 | 自动签到、历史、补签 |
| 点赞/收藏 | 7 | 点赞、取消、列表、收藏 |
| 商店 | 6 | 商品、兑换、装备、卸下 |
| 等级 | 1 | 排行榜 |
| 用户 | 4 | 资料、修改、帖子、点赞 |
| 通知 | 4 | 列表、未读数、已读 |
| 私信 | 5 | 会话、消息收发 |
| 投票 | 4 | 详情、投票、撤销、关闭 |
| 表情 | 6 | 上传、列表、收藏、删除 |
| 管理员 | 21 | 用户/帖子/分类/SMTP/更新管理 |

## 开发

```bash
# 代码规范检查
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format

# 运行测试
npm test

# 备份数据库
npm run backup
```

## 贡献者

由以下贡献者共同维护：

- parkes-mimir
- phppi561
- jxwzx
- XY20-hub
- sakesenqiu1

## 更新日志

详见 [docs/CHANGELOG.md](./docs/CHANGELOG.md)

**最新版本 v1.2.4** — 全面代码质量审计 + Bug 修复 + 安全加固

## 声明

本项目由 AI 辅助编写,MIT License。
