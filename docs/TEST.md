# 测试文档

MiForum 单元测试记录。

## 测试框架

- **jest** — 测试运行器
- **supertest** — HTTP 断言库

## 运行测试

```bash
npm test
```

## 测试用例

### 认证 API（10 个）

| 测试 | 接口 | 验证点 |
|------|------|--------|
| 注册成功 | POST /api/register | 返回 id、display_id、exp、level_info |
| 用户名过短 | POST /api/register | 返回 400，提示"用户名" |
| 邮箱格式错误 | POST /api/register | 返回 400，提示"邮箱" |
| 密码过短 | POST /api/register | 返回 400，提示"密码" |
| 邮箱重复 | POST /api/register | 返回 400，提示"邮箱已被注册" |
| 登录成功 | POST /api/login | 返回用户信息 |
| 密码错误 | POST /api/login | 返回 400，提示"邮箱或密码错误" |
| 获取用户信息 | GET /api/me | 登录后返回完整用户信息 |
| 未登录 | GET /api/me | 返回 null |
| 退出登录 | POST /api/logout | 返回 ok: true |

### 帖子 API（4 个）

| 测试 | 接口 | 验证点 |
|------|------|--------|
| 发帖成功 | POST /api/posts | 返回 postId、points、exp |
| 帖子列表 | GET /api/posts | 返回 posts 数组 + pagination 对象 |
| 帖子详情 | GET /api/posts/:id | 返回帖子信息 + author_level_info |
| 帖子不存在 | GET /api/posts/:id | 返回 404 |

### 商店 API（2 个）

| 测试 | 接口 | 验证点 |
|------|------|--------|
| 商品列表 | GET /api/shop/items | 返回 items 数组，非空 |
| 等级排行榜 | GET /api/leaderboard/level | 返回 leaderboard 数组 |

## 测试结果

```
Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
Snapshots:   0 total
Time:        ~2s
```

## 待补充测试

- [ ] 签到 API（自动签到、补签、历史）
- [ ] 评论 API（创建、编辑、删除、置顶）
- [ ] 点赞/收藏 API（点赞、取消、列表）
- [ ] 管理员 API（禁言、删用户、设积分）
- [ ] 修改密码 API
- [ ] 分页参数验证
- [ ] 速率限制验证
