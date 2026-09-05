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
| 帖子高级功能 | 6 | ✅ |
| 评论高级功能 | 4 | ✅ |
| 商店高级功能 | 5 | ✅ |
| 管理员高级功能 | 8 | ✅ |
| 通知 API | 8 | ✅ |
| 私信 API | 9 | ✅ |
| 私密帖子 | 5 | ✅ |
| 帖子排序 | 3 | ✅ |
| 用户资料补充 | 4 | ✅ |
| 签到补签 | 2 | ✅ |
| 管理员用户管理 | 7 | ✅ |
| 安全测试补充 | 2 | ✅ |
| **总计** | **115** | **115** |

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

## 帖子高级功能（6 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 创建帖子 | POST /api/posts | 200, postId | ✅ |
| 搜索帖子 | GET /api/posts?search=Test | 200, 非空 | ✅ |
| 分类筛选 | GET /api/posts?category=tech | 200 | ✅ |
| 标签筛选 | GET /api/posts?tag=js | 200 | ✅ |
| 分页参数校验 | GET /api/posts?page=0&limit=100 | 200, limit<=50 | ✅ |
| 帖子不存在 | GET /api/posts/999 | 404 | ✅ |

---

## 评论高级功能（4 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 创建评论 | POST /api/posts/:id/comments | 200, commentId | ✅ |
| 分页 | GET /api/posts/:id/comments?page=1&limit=10 | 200, pagination | ✅ |
| 置顶评论 | PUT /api/comments/:id/pin | 200, pinned: true | ✅ |
| 删除评论 | DELETE /api/comments/:id | 200 | ✅ |

---

## 商店高级功能（5 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 商品不存在 | POST /api/shop/exchange | 404 | ✅ |
| 缺少商品ID | POST /api/shop/exchange | 400 | ✅ |
| 未购买装备 | POST /api/shop/equip | 403 | ✅ |
| 无效类型卸下 | POST /api/shop/unequip | 400 | ✅ |
| 订单列表 | GET /api/shop/orders | 200 | ✅ |

---

## 管理员高级功能（8 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 奖励积分 | PUT /api/admin/users/:id/points/add | 200 | ✅ |
| 无效金额 | PUT /api/admin/users/:id/points/add | 400 | ✅ |
| 创建分类 | POST /api/categories | 200 | ✅ |
| 重复分类 | POST /api/categories | 400 | ✅ |
| 编辑分类 | PUT /api/categories/:id | 200 | ✅ |
| 删除分类 | DELETE /api/categories/:id | 200 | ✅ |
| 排行榜 | GET /api/leaderboard/level | 200 | ✅ |
| 管理员状态 | GET /api/admin/status | 200 | ✅ |

---

## 通知 API（8 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 通知列表 | GET /api/notifications | 200, notifications | ✅ |
| 未读数量 | GET /api/notifications/unread-count | 200, unread/likes/comments/bookmarks | ✅ |
| 标记已读 | PUT /api/notifications/:id/read | 200 | ✅ |
| 全部已读 | PUT /api/notifications/read-all | 200 | ✅ |
| 按类型筛选 | GET /api/notifications?type=like | 200 | ✅ |
| 按类型已读 | PUT /api/notifications/read-all?type=comment | 200 | ✅ |
| 权限校验 | PUT /api/notifications/:id/read（他人） | 403 | ✅ |
| 通知不存在 | PUT /api/notifications/999/read | 404 | ✅ |

---

## 私信 API（9 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 会话列表 | GET /api/conversations | 200, conversations | ✅ |
| 创建会话 | POST /api/conversations | 200, conversation.id | ✅ |
| 查找已有会话 | POST /api/conversations（重复） | 200, 返回已有 | ✅ |
| 获取消息 | GET /api/conversations/:id/messages | 200, messages | ✅ |
| 发送消息 | POST /api/conversations/:id/messages | 200, messageId | ✅ |
| 未读数量 | GET /api/messages/unread-count | 200, unread | ✅ |
| 非参与者拒绝 | GET /api/conversations/:id/messages | 403 | ✅ |
| 空消息拒绝 | POST /api/conversations/:id/messages | 400 | ✅ |
| 无效用户 | POST /api/conversations | 400 | ✅ |

---

## 私密帖子（5 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 创建私密帖子 | POST /api/posts (private=true) | 200 | ✅ |
| 列表过滤私密 | GET /api/posts | 200, 不含他人私密 | ✅ |
| 详情拒绝他人 | GET /api/posts/:id | 404 | ✅ |
| 作者可见 | GET /api/posts/:id | 200 | ✅ |
| 管理员可见 | GET /api/posts/:id | 200 | ✅ |

---

## 帖子排序（3 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 最新排序 | GET /api/posts?sort=newest | 200 | ✅ |
| 最早排序 | GET /api/posts?sort=oldest | 200 | ✅ |
| 最多赞排序 | GET /api/posts?sort=most_liked | 200 | ✅ |

---

## 用户资料补充（4 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 用户点赞列表 | GET /api/users/:id/likes | 200 | ✅ |
| 隐私设置过滤 | GET /api/users/:id/posts | 403（私密） | ✅ |
| 管理员可查看 | GET /api/users/:id/posts | 200 | ✅ |
| 修改密码 | POST /api/change-password | 200 | ✅ |

---

## 签到补签（2 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 补签成功 | POST /api/checkin/retroactive | 200 | ✅ |
| 积分不足 | POST /api/checkin/retroactive | 400 | ✅ |

---

## 管理员用户管理（7 个）

| 测试 | 接口 | 预期 | 结果 |
|------|------|------|------|
| 授权管理员 | PUT /api/superadmin/grant-admin/:id | 200 | ✅ |
| 撤销管理员 | PUT /api/superadmin/revoke-admin/:id | 200 | ✅ |
| 删除用户 | DELETE /api/admin/users/:id | 200 | ✅ |
| 禁言超管拒绝 | PUT /api/admin/users/:id/mute | 403 | ✅ |
| 删除超管拒绝 | DELETE /api/admin/users/:id | 403 | ✅ |
| 修改超管角色拒绝 | PUT /api/superadmin/grant-admin/:id | 400 | ✅ |
| 积分上限 | PUT /api/admin/users/:id/points | 400 | ✅ |

---

## 安全测试补充（2 个）

| 测试 | 验证点 | 结果 |
|------|--------|------|
| CSRF 校验 | 跨域 POST 返回 403 | ✅ |
| 速率限制 | 存在 ratelimit-limit 头 | ✅ |

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

### 测试数据库隔离
```javascript
// 每个测试文件使用独立数据库路径
process.env.DB_PATH = path.join(__dirname, 'test.db');
```

### 签到测试日期处理
```javascript
// 签到使用本地日期，测试时注意时区
// helpers.js 的 todayStr() 使用 sv-SE 格式
```
