# 贡献指南

感谢你对 MiForum 项目的关注！本文档将帮助你快速上手开发环境。

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/parkes-mimir/miforum.git
cd miforum

# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

默认管理员账号：`root@miforum.local` / `123456`（首次登录需修改密码）

## 开发规范

### 代码风格
- **后端**：单引号字符串，ESLint 强制执行（`npm run lint`）
- **前端**：Alpine.js 组件，遵循现有命名规范
- **缩进**：2 空格

### Git 提交规范
```
类型: 简短描述（不超过50字）

[可选] 详细说明
```

**类型**：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具变更

**示例**：
```
feat: 添加帖子草稿功能

用户可以保存未完成的帖子为草稿，支持自动保存。
```

### 分支策略
- `master`: 主分支，保持可部署状态
- `feature/*`: 功能分支
- `fix/*`: 修复分支

## 测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npx jest tests/api.test.js

# 运行带覆盖率的测试
npx jest --coverage
```

**测试覆盖率目标**：
- 核心服务层：> 70%
- API 端点：> 80%

## 提交 Pull Request

1. Fork 仓库并创建功能分支
2. 编写代码并添加测试
3. 确保所有测试通过：`npm test`
4. 确保 lint 通过：`npm run lint`
5. 更新文档（如需要）
6. 提交 PR，描述变更内容

## 报告 Bug

使用 GitHub Issues 报告 Bug，请包含：
- 复现步骤
- 预期行为 vs 实际行为
- 环境信息（Node.js 版本、操作系统）
- 错误日志（如有）

## 功能建议

欢迎在 Issues 中提出功能建议！请说明：
- 使用场景
- 预期行为
- 是否愿意实现

## 代码结构

```
src/
├── server.js          # 入口文件
├── database.js        # 数据库连接和迁移
├── routes/            # 路由定义
├── controllers/       # 业务逻辑
├── services/          # 服务层
├── middleware/         # 中间件
└── utils/             # 工具函数

views/                 # EJS 模板
public/                # 静态资源
tests/                 # 测试文件
docs/                  # 文档
```

## 常见问题

### Q: 如何重置数据库？
```bash
rm -rf data/db/
npm run dev  # 会自动创建新数据库
```

### Q: 如何添加新的 API 端点？
1. 在 `src/controllers/` 创建控制器
2. 在 `src/routes/index.js` 添加路由映射
3. 添加测试
4. 更新 `docs/API.md`

### Q: 如何修改数据库表结构？
1. 在 `src/db/schema.js` 添加迁移代码
2. 更新 `src/db/seeds.js`（如需要默认数据）
3. 测试迁移

## 联系方式

- GitHub Issues: 项目主要沟通渠道
- 邮箱: 见 README.md

---

再次感谢你的贡献！🎉
