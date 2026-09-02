# 测试文档

MiForum 测试记录。

## 测试环境

- **Node.js**: v24.14.1
- **better-sqlite3**: ^13.0.3
- **测试方式**: supertest + node.js http 模块

## 运行测试

```bash
npm test
```

---

## 测试结果汇总

| 模块 | 用例数 | 通过 | 失败 |
|------|--------|------|------|
| 认证 API | 10 | 10 | 0 |
| 签到 API | 4 | 4 | 0 |
| 帖子 API | 8 | 8 | 0 |
| 评论 API | 6 | 6 | 0 |
| 点赞/收藏 API | 8 | 8 | 0 |
| 商店 API | 8 | 8 | 0 |
| 用户资料 API | 4 | 4 | 0 |
| 排行榜/标签/分类 | 3 | 3 | 0 |
| 管理员 API | 8 | 8 | 0 |
| 修改密码 API | 4 | 4 | 0 |
| 称号/头像框装备 | 4 | 4 | 0 |
| 速率限制 | 1 | 1 | 0 |
| 安全测试 | 2 | 2 | 0 |
| **总计** | **70** | **70** | **0** |

---

## 认证 API（10 个）

| 测试 | 接口 | 方法 | 预期 | 结果 |
|------|------|------|------|------|
| 注册成功 | /api/register | POST | 200, 返回 id/display_id/exp | ✅ |
| 用户名过短 | /api/register | POST | 400, "用户名 2-20 字" | ✅ |
| 邮箱格式错误 | /api/register | POST | 400, "邮箱格式不正确" | ✅ |
| 密码过短 | /api/register | POST | 400, "密码至少6位" | ✅ |
| 邮箱重复 | /api/register | POST | 400, "邮箱已被注册" | ✅ |
| 登录成功 | /api/login | POST | 200, 返回用户信息 | ✅ |
| 密码错误 | /api/login | POST | 400, "邮箱或密码错误" | ✅ |
| 获取用户信息 | /api/me | GET | 200, 返回完整用户信息 | ✅ |
| 未登录 | /api/me | GET | 200, user: null | ✅ |
| 退出登录 | /api/logout | POST | 200, ok: true | ✅ |

---

## 签到 API（4 个）

| 测试 | 接口 | 方法 | 预期 | 结果 |
|------|------|------|------|------|
| 自动签到 | /api/checkin/auto | POST | 200, newCheckin: true, +10积分 | ✅ |
| 重复签到 | /api/checkin/auto | POST | 200, newCheckin: false | ✅ |
| 今日签到 | /api/checkin/today | GET | 200, checkedIn: true | ✅ |
| 签到历史 | /api/checkin/history | GET | 200, 返回签到统计 | ✅ |

---

## 帖子 API（8 个）

| 测试 | 接口 | 方法 | 预期 | 结果 |
|------|------|------|------|------|
| 发帖成功 | /api/posts | POST | 200, 返回 postId/exp | ✅ |
| 帖子列表 | /api/posts | GET | 200, posts + pagination | ✅ |
| 帖子详情 | /api/posts/:id | GET | 200, 含 author_level_info | ✅ |
| 帖子不存在 | /api/posts/:id | GET | 404 | ✅ |
| 发帖校验 | /api/posts | POST | 400, "请填写标题和正文" | ✅ |
| 分页参数 | /api/posts?page=1&limit=2 | GET | 200, 正确分页 | ✅ |
| 编辑帖子 | /api/posts/:id | PUT | 200, ok: true | ✅ |
| 删除帖子 | /api/posts/:id | DELETE | 200, ok: true | ✅ |

---

## 评论 API（6 个）

| 测试 | 接口 | 方法 | 预期 | 结果 |
|------|------|------|------|------|
| 发评论 | /api/posts/:id/comments | POST | 200, 返回 commentId | ✅ |
| 评论列表 | /api/posts/:id/comments | GET | 200, comments + pagination | ✅ |
| 评论不存在帖子 | /api/posts/:id/comments | POST | 404 | ✅ |
| 编辑评论 | /api/comments/:id | PUT | 200, ok: true | ✅ |
| 置顶评论 | /api/comments/:id/pin | PUT | 200, pinned: true | ✅ |
| 删除评论 | /api/comments/:id | DELETE | 200, ok: true | ✅ |

---

## 点赞/收藏 API（8 个）

| 测试 | 接口 | 方法 | 预期 | 结果 |
|------|------|------|------|------|
| 点赞 | /api/like/:id | POST | 200, ok: true | ✅ |
| 重复点赞 | /api/like/:id | POST | 400, "已点赞" | ✅ |
| 点赞列表 | /api/likes | GET | 200, ids 数组 | ✅ |
| 取消点赞 | /api/like/:id | DELETE | 200, ok: true | ✅ |
| 收藏 | /api/bookmark/:id | POST | 200, ok: true | ✅ |
| 检查收藏 | /api/bookmark/:id | GET | 200, isBookmarked: true | ✅ |
| 收藏列表 | /api/bookmarks | GET | 200, posts + pagination | ✅ |
| 取消收藏 | /api/bookmark/:id | DELETE | 200, ok: true | ✅ |

---

## 商店 API（8 个）

| 测试 | 接口 | 方法 | 预期 | 结果 |
|------|------|------|------|------|
| 商品列表 | /api/shop/items | GET | 200, items 数组 | ✅ |
| 商品详情 | /api/shop/items/:id | GET | 200, 返回商品信息 | ✅ |
| 商品不存在 | /api/shop/exchange | POST | 404 | ✅ |
| 兑换改名卡 | /api/shop/exchange | POST | 200, rename_chances +1 | ✅ |
| 兑换称号 | /api/shop/exchange | POST | 200, title 设置 | ✅ |
| 兑换头像框 | /api/shop/exchange | POST | 200, avatar_frame 设置 | ✅ |
| 兑换记录 | /api/shop/orders | GET | 200, orders 数组 | ✅ |
| 积分不足 | /api/shop/exchange | POST | 400, "积分不足" | ✅ |

---

## 称号/头像框装备（4 个）

| 测试 | 接口 | 方法 | 预期 | 结果 |
|------|------|------|------|------|
| 装备称号 | /api/shop/equip | POST | 200, title 设置 | ✅ |
| 卸下称号 | /api/shop/unequip | POST | 200, title: null | ✅ |
| 装备头像框 | /api/shop/equip | POST | 200, avatar_frame 设置 | ✅ |
| 卸下头像框 | /api/shop/unequip | POST | 200, avatar_frame: null | ✅ |

---

## 用户资料 API（4 个）

| 测试 | 接口 | 方法 | 预期 | 结果 |
|------|------|------|------|------|
| 用户资料 | /api/users/:id | GET | 200, 含 level_info | ✅ |
| 用户不存在 | /api/users/:id | GET | 404 | ✅ |
| 用户帖子 | /api/users/:id/posts | GET | 200, posts + pagination | ✅ |
| 用户点赞 | /api/users/:id/likes | GET | 200, posts + pagination | ✅ |

---

## 排行榜/标签/分类（3 个）

| 测试 | 接口 | 方法 | 预期 | 结果 |
|------|------|------|------|------|
| 等级排行榜 | /api/leaderboard/level | GET | 200, leaderboard 数组 | ✅ |
| 标签列表 | /api/tags | GET | 200, tags 数组 | ✅ |
| 分类列表 | /api/categories | GET | 200, categories 数组 | ✅ |

---

## 管理员 API（8 个）

| 测试 | 接口 | 方法 | 预期 | 结果 |
|------|------|------|------|------|
| 管理员状态 | /api/admin/status | GET | 200, isAdmin: true | ✅ |
| 用户列表 | /api/admin/users | GET | 200, users 数组 | ✅ |
| 禁言用户 | /api/admin/users/:id/mute | PUT | 200, muted: true | ✅ |
| 取消禁言 | /api/admin/users/:id/mute | PUT | 200, muted: false | ✅ |
| 设置积分 | /api/admin/users/:id/points | PUT | 200, points: 500 | ✅ |
| 创建分类 | /api/categories | POST | 200, 返回分类信息 | ✅ |
| 普通用户访问 | /api/admin/users | GET | 403, "需要管理员权限" | ✅ |
| 超管转让 | /api/superadmin/transfer/:id | PUT | 200 | ✅ |

---

## 修改密码 API（4 个）

| 测试 | 接口 | 方法 | 预期 | 结果 |
|------|------|------|------|------|
| 修改密码 | /api/change-password | POST | 200, "密码修改成功" | ✅ |
| 旧密码错误 | /api/change-password | POST | 400, "旧密码错误" | ✅ |
| 新密码过短 | /api/change-password | POST | 400, "新密码至少6位" | ✅ |
| 改密后登录 | /api/login | POST | 200, force_password_change: false | ✅ |

---

## 速率限制（1 个）

| 测试 | 接口 | 方法 | 预期 | 结果 |
|------|------|------|------|------|
| 登录限制 | /api/login | POST | 429, "登录尝试过于频繁" | ✅ |

---

## 安全测试（2 个）

| 测试 | 验证点 | 结果 |
|------|--------|------|
| 权限校验 | 普通用户访问管理员接口返回 403 | ✅ |
| 安全头 | X-Content-Type-Options: nosniff | ✅ |
| 安全头 | X-Frame-Options: SAMEORIGIN | ✅ |
| 安全头 | Strict-Transport-Security | ✅ |

---

## 前端页面可访问性

| 页面 | URL | 状态码 | 结果 |
|------|-----|--------|------|
| 首页 | /forum.html | 200 | ✅ |
| 帖子详情 | /post.html | 200 | ✅ |
| 个人资料 | /profile.html | 200 | ✅ |
| 积分商店 | /shop.html | 200 | ✅ |
| Tailwind CSS | /css/tailwind.css | 200 | ✅ |

---

## 单元测试（jest + supertest）

```
Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
Snapshots:   0 total
Time:        ~2s
```
