# 测试文档

MiForum 测试记录。

## 测试环境

- **Node.js**: v22+
- **better-sqlite3**: ^13.0.3
- **测试方式**: jest + supertest
- **测试环境**: NODE_ENV=test（禁用速率限制、跳过验证码）

## 运行测试

```bash
npm test
```

---

## 测试结果汇总

| 模块 | 用例数 | 通过 |
|------|--------|------|
| 认证 API | 10 | ✅ |
| 签到 API | 4 | ✅ |
| 帖子 API | 7 | ✅ |
| 评论 API | 6 | ✅ |
| 点赞/收藏 API | 8 | ✅ |
| 商店 API | 4 | ✅ |
| 用户资料 API | 3 | ✅ |
| 标签/分类 API | 2 | ✅ |
| 管理员 API | 6 | ✅ |
| 安全测试 | 3 | ✅ |
| **总计** | **53** | **53** |

---

## 认证 API（10 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 注册成功 | POST /api/register | 200, 返回 id/display_id/exp | ✅ |
| 用户名过短 | POST /api/register | 400, "用户名" | ✅ |
| 邮箱格式错误 | POST /api/register | 400, "邮箱" | ✅ |
| 密码过短 | POST /api/register | 400, "密码" | ✅ |
| 邮箱重复 | POST /api/register | 400, "邮箱已被注册" | ✅ |
| 登录成功 | POST /api/login | 200, 返回用户信息 | ✅ |
| 密码错误 | POST /api/login | 400, "邮箱或密码错误" | ✅ |
| 获取用户信息 | GET /api/me | 200, 返回完整信息 | ✅ |
| 未登录 | GET /api/me | 200, user: null | ✅ |
| 退出登录 | POST /api/logout | 200, ok: true | ✅ |

---

## 签到 API（4 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 自动签到 | POST /api/checkin/auto | 200, newCheckin: true | ✅ |
| 重复签到 | POST /api/checkin/auto | 200, newCheckin: false | ✅ |
| 今日签到 | GET /api/checkin/today | 200, checkedIn: true | ✅ |
| 签到历史 | GET /api/checkin/history | 200, 返回统计 | ✅ |

---

## 帖子 API（7 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 发帖成功 | POST /api/posts | 200, postId/points/exp | ✅ |
| 未登录 | POST /api/posts | 401 | ✅ |
| 帖子列表 | GET /api/posts | 200, posts + pagination | ✅ |
| 分页 | GET /api/posts?page=1&limit=1 | 200, 正确分页 | ✅ |
| 帖子详情 | GET /api/posts/:id | 200, author_level_info | ✅ |
| 帖子不存在 | GET /api/posts/:id | 404 | ✅ |
| 编辑帖子 | PUT /api/posts/:id | 200, ok: true | ✅ |

---

## 评论 API（6 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 发评论 | POST /api/posts/:id/comments | 200, commentId | ✅ |
| 帖子不存在 | POST /api/posts/:id/comments | 404 | ✅ |
| 评论列表 | GET /api/posts/:id/comments | 200, pagination | ✅ |
| 编辑评论 | PUT /api/comments/:id | 200 | ✅ |
| 置顶评论 | PUT /api/comments/:id/pin | 200, pinned: true | ✅ |
| 删除评论 | DELETE /api/comments/:id | 200 | ✅ |

---

## 点赞/收藏 API（8 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 点赞 | POST /api/like/:id | 200 | ✅ |
| 重复点赞 | POST /api/like/:id | 400, "已点赞" | ✅ |
| 点赞列表 | GET /api/likes | 200, ids 包含 postId | ✅ |
| 取消点赞 | DELETE /api/like/:id | 200 | ✅ |
| 收藏 | POST /api/bookmark/:id | 200 | ✅ |
| 检查收藏 | GET /api/bookmark/:id | 200, isBookmarked: true | ✅ |
| 收藏列表 | GET /api/bookmarks | 200, pagination | ✅ |
| 取消收藏 | DELETE /api/bookmark/:id | 200 | ✅ |

---

## 商店 API（4 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 商品列表 | GET /api/shop/items | 200, 非空 | ✅ |
| 商品详情 | GET /api/shop/items/:id | 200, name | ✅ |
| 积分不足 | POST /api/shop/exchange | 400, "积分" | ✅ |
| 商品不存在 | POST /api/shop/exchange | 404 | ✅ |

---

## 用户资料 API（3 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 用户资料 | GET /api/users/:id | 200, display_id/level_info | ✅ |
| 用户不存在 | GET /api/users/:id | 404 | ✅ |
| 用户帖子 | GET /api/users/:id/posts | 200, pagination | ✅ |

---

## 标签/分类 API（2 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 标签列表 | GET /api/tags | 200, tags | ✅ |
| 分类列表 | GET /api/categories | 200, 非空 | ✅ |

---

## 管理员 API（6 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 管理员状态 | GET /api/admin/status | 200, isAdmin: true | ✅ |
| 用户列表 | GET /api/admin/users | 200, display_id | ✅ |
| 禁言 | PUT /api/admin/users/:id/mute | 200, muted: true | ✅ |
| 取消禁言 | PUT /api/admin/users/:id/mute | 200, muted: false | ✅ |
| 设置积分 | PUT /api/admin/users/:id/points | 200, points | ✅ |
| 等级排行榜 | GET /api/leaderboard/level | 200, leaderboard | ✅ |

---

## 安全测试（3 个）

| 测试 | 验证点 | 结果 |
|------|--------|------|
| 权限校验 | 普通用户访问管理员接口返回 403 | ✅ |
| 未登录保护 | 未登录不能发帖返回 401 | ✅ |
| 安全头 | X-Content-Type-Options: nosniff | ✅ |

---

## 测试技巧

### 使用 request.agent() 保持会话
```javascript
const agent = request.agent(app);
await agent.post('/api/login').send({ email, password });
// 后续请求自动携带 cookie
const res = await agent.get('/api/me');
```

### 测试环境配置
```javascript
process.env.NODE_ENV = 'test';  // 禁用速率限制、跳过验证码
```

### 超管强制改密处理
```javascript
// 登录后检查 force_password_change，自动改密
if (loginRes.body.user?.force_password_change) {
  await agent.post('/api/change-password').send({ old_password: '123456', new_password: 'admin123' });
  await agent.post('/api/login').send({ email: 'root@miforum.local', password: 'admin123' });
}
```
