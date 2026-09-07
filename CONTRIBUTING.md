# 贡献指南

感谢你参与 MiForum！本项目是一个 Flarum 风格的轻量论坛（Node.js + Express + SQLite）。

欢迎通过以下任一方式贡献：

- 报告 Bug、提出功能建议（[Issues](https://github.com/parkes-mimir/miforum/issues)）
- 完善文档、修复 Bug、新增功能、补充测试（Pull Request）

## 行为准则

- 尊重每一位参与者，友善沟通，对事不对人
- 讨论聚焦技术本身
- 遵守 MIT 开源协议

## 参与流程

1. **先沟通，再动手**：新功能或较大的改动，建议先在
   [Issues](https://github.com/parkes-mimir/miforum/issues) 中讨论、确认方向，
   避免白做；小 Bug 修复和文档改动可直接提交 PR。
2. **Fork 并克隆**：Fork 本仓库到自己的账号，克隆到本地，从 `main` 分支切出功能分支：

   ```bash
   git checkout -b feat/my-change
   ```

3. **开发并自测**：完成修改后，在本地通过代码检查和测试（GitHub Actions 的 CI 会执行同样的检查）。
4. **提交 PR**：推送到你的 Fork，向 `main` 分支发起 Pull Request，并填写 PR 模板。

## 环境准备

- Node.js ≥ 20（推荐与 CI 一致使用 22）
- npm

```bash
npm install
```

## 常用命令

| 命令                | 说明                          |
| ------------------- | ----------------------------- |
| `npm run dev`       | 开发模式启动（文件变更自动重启） |
| `npm start`         | 生产模式启动                  |
| `npm test`          | 运行全部测试（Jest）          |
| `npm run test:watch`| 监听模式运行测试              |
| `npm run lint`      | 代码检查（ESLint，覆盖 src/） |
| `npm run lint:fix`  | 自动修复 lint 问题            |
| `npm run migrate`   | 旧版 db.json 数据迁移到 SQLite |

首次启动默认管理员账号为 `root@miforum.local` / `123456`，请立即修改密码。

## 目录结构

```
src/              后端源码
├── server.js     应用入口
├── database.js   SQLite 数据库初始化
├── controllers/  各业务模块控制器
├── middleware/   认证等中间件
├── routes/       路由注册
├── services/     业务服务（等级、通知、热门帖子等）
└── utils/        工具函数（邮件、上传等）
public/           前端静态资源（CSS / JS）
views/            EJS 页面模板
tests/            Jest 测试
docs/             项目文档（API、更新日志、测试说明）
```

## 代码规范

- 提交信息建议使用「类型: 简述」格式，类型可选：
  `feat`（新功能）、`fix`（修复）、`docs`（文档）、`test`（测试）、`chore`（杂项）。
  例如：`fix: 修复移动端评论区布局溢出`
- 遵循现有代码风格，提交前执行 `npm run lint:fix`
- 修改了 API 时，请同步更新 [docs/API.md](docs/API.md)
- 新增功能请补充对应的测试用例

## 注意事项

- 请勿提交本地运行产生的文件：数据库文件（`*.db`、`*.db-wal`、`*.db-shm`）、
  `.env`、`uploads/` 目录等（以仓库 `.gitignore` 为准）
- 不要提交密钥、密码、Cookie 等敏感信息
- 一个 PR 只做一件事，保持改动聚焦，便于审查与合并

## 发布流程

版本号遵循 `v主.次.修订` 格式，更新日志记录在 [docs/CHANGELOG.md](docs/CHANGELOG.md)。
