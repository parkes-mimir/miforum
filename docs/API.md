# API 文档

MiForum REST API 完整参考。

**基础信息**
- 服务地址：`http://localhost:3000`
- 认证方式：Session（Cookie）
- 数据格式：JSON
- 错误响应：`{ "error": "错误信息" }`

---

## 快速入门

### 1. 使用 curl 调用 API

**注册账号**
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"123456"}' \
  -c cookies.txt
```

**登录**
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}' \
  -c cookies.txt
```

**获取帖子列表**
```bash
curl http://localhost:3000/api/posts
```

**发帖（需要登录）**
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","content":"World","category":"tech"}' \
  -b cookies.txt
```

### 2. 使用 JavaScript fetch 调用

**注册账号**
```javascript
const res = await fetch('/api/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // 必须，用于发送 Cookie
  body: JSON.stringify({
    username: 'testuser',
    email: 'test@example.com',
    password: '123456'
  })
});
const data = await res.json();
console.log(data);  // { user: { id: 1, username: "testuser", ... } }
```

**登录**
```javascript
const res = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: '123456'
  })
});
const { user } = await res.json();
console.log(user.points);  // 0
```

**获取帖子列表**
```javascript
const res = await fetch('/api/posts');
const { posts } = await res.json();
console.log(posts);  // [{ id: 1, title: "...", ... }, ...]
```

**发帖**
```javascript
const res = await fetch('/api/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    title: '帖子标题',
    content: '帖子内容',
    category: 'tech',
    tags: ['javascript', 'nodejs']
  })
});
const { postId } = await res.json();
console.log(postId);  // 1
```

### 3. 上传图片

**使用 FormData 上传**
```javascript
const formData = new FormData();
formData.append('title', '有图的帖子');
formData.append('content', '看看这些图');
formData.append('category', 'tech');
formData.append('images', fileInput.files[0]);  // 单张图片
formData.append('images', fileInput.files[1]);  // 多张图片

const res = await fetch('/api/posts', {
  method: 'POST',
  credentials: 'include',
  body: formData  // 不要设置 Content-Type，浏览器会自动设置
});
```

### 4. 认证说明

**Session 认证流程**
1. 调用 `/api/register` 或 `/api/login`
2. 服务器返回 Set-Cookie
3. 后续请求自动携带 Cookie（需要 `credentials: 'include'`）
4. 调用 `/api/logout` 退出登录

**curl 参数说明**
- `-c cookies.txt` - 保存 Cookie 到文件
- `-b cookies.txt` - 从文件读取 Cookie
- `-X POST` - 指定请求方法
- `-H "Content-Type: application/json"` - 设置请求头
- `-d '{"key":"value"}'` - 发送 JSON 数据

### 5. 常见场景

**场景 1：用户注册 → 登录 → 发帖**
```javascript
// 1. 注册
await fetch('/api/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ username: 'user1', email: 'user1@test.com', password: '123456' })
});

// 2. 登录
await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email: 'user1@test.com', password: '123456' })
});

// 3. 发帖
const res = await fetch('/api/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ title: '我的第一帖', content: 'Hello World!', category: 'tech' })
});
const { postId } = await res.json();
```

**场景 2：签到 + 领积分**
```javascript
// 自动签到（页面加载时调用）
const res = await fetch('/api/checkin/auto', {
  method: 'POST',
  credentials: 'include'
});
const { checkedIn, points, newCheckin } = await res.json();
if (newCheckin) {
  console.log(`签到成功！当前积分：${points}`);
}
```

**场景 3：兑换商品**
```javascript
// 兑换改名卡（itemId: 1）
const res = await fetch('/api/shop/exchange', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ itemId: 1 })
});
const { ok, message, rename_chances } = await res.json();
console.log(message);  // "成功兑换 改名卡"
console.log(rename_chances);  // 1
```

### 6. 错误处理

```javascript
try {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ title: '', content: '' })
  });
  
  if (!res.ok) {
    const { error } = await res.json();
    console.error('请求失败：', error);
    return;
  }
  
  const data = await res.json();
  console.log('成功：', data);
} catch (err) {
  console.error('网络错误：', err);
}
```

**常见错误码**
| 状态码 | 说明 | 处理方式 |
|--------|------|----------|
| 400 | 参数错误 | 检查请求体格式 |
| 401 | 未登录 | 调用登录接口 |
| 403 | 权限不足 | 检查用户角色 |
| 404 | 资源不存在 | 检查 ID 是否正确 |
| 500 | 服务器错误 | 查看服务器日志 |

### 7. 使用 Postman 测试

1. 打开 Postman
2. 创建新请求
3. 选择请求方法（GET/POST/PUT/DELETE）
4. 输入 URL：`http://localhost:3000/api/posts`
5. 在 Headers 中添加：`Content-Type: application/json`
6. 在 Body 中选择 `raw`，输入 JSON 数据
7. 点击 Send 发送请求

**注意**：Postman 中需要手动管理 Cookie，建议使用 curl 或 JavaScript 进行测试。

---

## 认证

### 发送验证码

```
POST /api/send-code
```

**请求体**
```json
{
  "email": "string",
  "type": "register"
}
```

**响应**
```json
{ "ok": true, "message": "验证码已发送" }
```

**说明**
- 验证码 10 分钟有效
- 60秒内只能发送一次
- 需要配置 SMTP 环境变量（见 .env.example）

---

### 注册

```
POST /api/register
```

**请求体**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "code": "string"
}
```

**响应**
```json
{
  "user": {
    "id": 1,
    "display_id": "001",
    "username": "testuser",
    "email": "test@example.com",
    "points": 0
  }
}
```

### 登录

```
POST /api/login
```

**请求体**
```json
{
  "email": "string",
  "password": "string"
}
```

**响应**
```json
{
  "user": {
    "id": 1,
    "display_id": "001",
    "username": "testuser",
    "email": "test@example.com",
    "points": 0,
    "role": "user"
  }
}
```

### 退出

```
POST /api/logout
```

**响应**
```json
{ "ok": true }
```

### 获取当前用户

```
GET /api/me
```

**响应**
```json
{
  "user": {
    "id": 1,
    "display_id": "001",
    "username": "testuser",
    "email": "test@example.com",
    "avatar_url": "/uploads/avatar.png",
    "bio": "个人简介",
    "location": "北京",
    "website": "https://example.com",
    "profile_public": true,
    "points": 100,
    "muted": false,
    "role": "user",
    "title": "新手上路",
    "avatar_frame": "gold",
    "rename_chances": 1
  }
}
```

---

## 帖子

### 获取帖子列表

```
GET /api/posts
```

**查询参数**
- `category` - 分类筛选（可选）
- `tag` - 标签筛选（可选）
- `search` - 关键词搜索（可选）

**响应**
```json
{
  "posts": [
    {
      "id": 1,
      "title": "帖子标题",
      "content": "帖子内容",
      "category": "tech",
      "tags": ["javascript", "nodejs"],
      "author_id": 1,
      "author_display_id": "001",
      "images": ["/uploads/img1.png"],
      "pinned": false,
      "created_at": "2026-09-01T12:00:00.000Z",
      "updated_at": null,
      "author_name": "testuser",
      "author_avatar_url": "/uploads/avatar.png",
      "author_title": "新手上路",
      "author_avatar_frame": "gold",
      "likes_count": 5,
      "comments_count": 3,
      "bookmarks_count": 2
    }
  ]
}
```

### 获取单个帖子

```
GET /api/posts/:id
```

**响应**
```json
{
  "post": {
    "id": 1,
    "title": "帖子标题",
    "content": "帖子内容",
    "category": "tech",
    "tags": ["javascript"],
    "author_id": 1,
    "author_display_id": "001",
    "images": ["/uploads/img1.png"],
    "pinned": false,
    "created_at": "2026-09-01T12:00:00.000Z",
    "updated_at": null,
    "author_name": "testuser",
    "author_avatar_url": "/uploads/avatar.png",
    "author_title": "新手上路",
    "author_avatar_frame": "gold",
    "likes_count": 5,
    "comments_count": 3,
    "bookmarks_count": 2
  }
}
```

### 发帖

```
POST /api/posts
```

**请求体**（FormData）
- `title` - 标题（必填）
- `content` - 内容（必填）
- `category` - 分类（默认 `tech`）
- `tags` - 标签数组或逗号分隔字符串（可选）
- `images[]` - 图片文件（最多 30 张，10MB/张）

**响应**
```json
{
  "postId": 1,
  "points": 5
}
```

### 编辑帖子

```
PUT /api/posts/:id
```

**请求体**（FormData）
- `title` - 标题（必填）
- `content` - 内容（必填）
- `category` - 分类（可选）
- `tags` - 标签（可选）
- `images[]` - 新增图片（可选）
- `removeImages` - 要删除的图片 URL 数组（JSON 字符串）

**响应**
```json
{ "ok": true }
```

### 删除帖子

```
DELETE /api/posts/:id
```

**响应**
```json
{ "ok": true }
```

### 置顶帖子

```
PUT /api/posts/:id/pin
```

**权限**：管理员

**响应**
```json
{ "ok": true, "pinned": true }
```

---

## 评论

### 获取帖子评论

```
GET /api/posts/:id/comments
```

**响应**
```json
{
  "comments": [
    {
      "id": 1,
      "post_id": 1,
      "author_id": 2,
      "author_display_id": "002",
      "content": "评论内容",
      "images": ["/uploads/img.png"],
      "pinned": false,
      "created_at": "2026-09-01T12:00:00.000Z",
      "author_name": "user2",
      "author_avatar_url": null,
      "author_title": null,
      "author_avatar_frame": null,
      "floor": 1,
      "is_post_owner": false
    }
  ],
  "postOwnerId": 1
}
```

### 发表评论

```
POST /api/posts/:id/comments
```

**请求体**（FormData）
- `content` - 内容（与图片至少填一个）
- `images[]` - 图片文件（最多 3 张）

**响应**
```json
{ "commentId": 1 }
```

### 编辑评论

```
PUT /api/comments/:id
```

**请求体**（FormData）
- `content` - 内容（与图片至少填一个）
- `images[]` - 新增图片（可选）
- `removeImages` - 要删除的图片 URL 数组（JSON 字符串）

**响应**
```json
{ "ok": true }
```

### 删除评论

```
DELETE /api/comments/:id
```

**权限**：评论作者 / 帖主 / 管理员

**响应**
```json
{ "ok": true }
```

### 置顶评论

```
PUT /api/comments/:id/pin
```

**权限**：帖主

**响应**
```json
{ "ok": true, "pinned": true }
```

---

## 签到

### 获取今日签到状态

```
GET /api/checkin/today
```

**响应**
```json
{ "checkedIn": true }
```

### 获取签到历史

```
GET /api/checkin/history
```

**响应**
```json
{
  "checkinDates": ["2026-09-01", "2026-08-31"],
  "currentStreak": 2,
  "longestStreak": 5,
  "totalDays": 10,
  "missedDays": ["2026-08-30", "2026-08-29"],
  "retroactiveCost": 10,
  "retroactiveTotal": 20,
  "points": 100
}
```

### 自动签到

```
POST /api/checkin/auto
```

**响应**
```json
{
  "checkedIn": true,
  "points": 110,
  "newCheckin": true
}
```

### 手动签到

```
POST /api/checkin
```

**响应**
```json
{ "ok": true, "points": 110 }
```

### 补签

```
POST /api/checkin/retroactive
```

**请求体**
```json
{ "date": "2026-08-30" }
```

**响应**
```json
{ "ok": true, "points": 90, "date": "2026-08-30" }
```

---

## 点赞

### 获取点赞列表

```
GET /api/likes
```

**响应**
```json
{ "ids": [1, 3, 5] }
```

### 点赞帖子

```
POST /api/like/:postId
```

**响应**
```json
{ "ok": true }
```

### 取消点赞

```
DELETE /api/like/:postId
```

**响应**
```json
{ "ok": true }
```

---

## 收藏

### 收藏帖子

```
POST /api/bookmark/:postId
```

**响应**
```json
{ "ok": true }
```

### 取消收藏

```
DELETE /api/bookmark/:postId
```

**响应**
```json
{ "ok": true }
```

### 检查是否已收藏

```
GET /api/bookmark/:postId
```

**响应**
```json
{ "isBookmarked": true }
```

### 获取收藏列表

```
GET /api/bookmarks
```

**响应**
```json
{
  "posts": [
    {
      "id": 1,
      "title": "帖子标题",
      "content": "帖子内容",
      "author_display_id": "001",
      "author_name": "testuser",
      "bookmarked_at": "2026-09-01T12:00:00.000Z"
    }
  ]
}
```

---

## 标签

### 获取热门标签

```
GET /api/tags
```

**响应**
```json
{
  "tags": [
    { "name": "javascript", "count": 10 },
    { "name": "nodejs", "count": 5 }
  ]
}
```

---

## 分类

### 获取所有分类

```
GET /api/categories
```

**响应**
```json
{
  "categories": [
    {
      "id": 1,
      "name": "tech",
      "label": "技术",
      "color": "bg-blue-100 text-blue-700",
      "order": 1
    }
  ]
}
```

### 创建分类

```
POST /api/categories
```

**权限**：管理员

**请求体**
```json
{
  "name": "tech",
  "label": "技术",
  "color": "bg-blue-100 text-blue-700"
}
```

**响应**
```json
{
  "ok": true,
  "category": {
    "id": 4,
    "name": "tech",
    "label": "技术",
    "color": "bg-blue-100 text-blue-700",
    "order": 4
  }
}
```

### 编辑分类

```
PUT /api/categories/:id
```

**权限**：管理员

**请求体**
```json
{
  "label": "新名称",
  "color": "bg-red-100 text-red-700",
  "order": 2
}
```

**响应**
```json
{ "ok": true, "category": { ... } }
```

### 删除分类

```
DELETE /api/categories/:id
```

**权限**：管理员

**响应**
```json
{ "ok": true }
```

---

## 用户资料

### 获取用户公开资料

```
GET /api/users/:id
```

**响应**
```json
{
  "user": {
    "id": 1,
    "display_id": "001",
    "username": "testuser",
    "avatar_url": "/uploads/avatar.png",
    "role": "user",
    "title": "新手上路",
    "avatar_frame": "gold",
    "created_at": "2026-08-28T12:00:00.000Z",
    "posts_count": 10,
    "comments_count": 20,
    "bio": "个人简介",
    "location": "北京",
    "website": "https://example.com",
    "points": 100,
    "profile_public": true
  }
}
```

### 修改个人资料

```
PUT /api/profile
```

**请求体**（FormData）
- `avatar` - 头像文件（可选）
- `username` - 用户名（需改名卡）
- `bio` - 简介（最多 200 字）
- `location` - 所在地
- `website` - 个人网站
- `profile_public` - 隐私设置（`"true"` 或 `"false"`）

**响应**
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "display_id": "001",
    "username": "newname",
    "email": "test@example.com",
    "avatar_url": "/uploads/avatar.png",
    "bio": "新简介",
    "location": "上海",
    "website": "https://example.com",
    "profile_public": true,
    "points": 100,
    "title": "新手上路",
    "avatar_frame": "gold",
    "rename_chances": 0
  }
}
```

### 获取用户帖子

```
GET /api/users/:id/posts
```

**响应**
```json
{
  "posts": [
    {
      "id": 1,
      "title": "帖子标题",
      "content": "帖子内容",
      "author_display_id": "001",
      "author_name": "testuser",
      "author_avatar_url": "/uploads/avatar.png",
      "author_title": "新手上路",
      "author_avatar_frame": "gold",
      "likes_count": 5,
      "comments_count": 3
    }
  ]
}
```

### 获取用户点赞

```
GET /api/users/:id/likes
```

**响应**
```json
{
  "posts": [
    {
      "id": 2,
      "title": "点赞的帖子",
      "content": "帖子内容",
      "author_display_id": "002",
      "author_name": "user2",
      "likes_count": 10,
      "comments_count": 5
    }
  ]
}
```

---

## 管理员

### 获取用户列表

```
GET /api/admin/users
```

**权限**：管理员

**响应**
```json
{
  "users": [
    {
      "id": 1,
      "display_id": "000",
      "username": "超级管理员",
      "email": "admin@example.com",
      "points": 0,
      "muted": false,
      "role": "super_admin",
      "created_at": "2026-08-28T12:00:00.000Z",
      "posts_count": 0,
      "comments_count": 0
    },
    {
      "id": 2,
      "display_id": "001",
      "username": "testuser",
      "email": "test@example.com",
      "points": 100,
      "muted": false,
      "role": "user",
      "created_at": "2026-08-28T12:00:00.000Z",
      "posts_count": 10,
      "comments_count": 20
    }
  ]
}
```

### 禁言/取消禁言

```
PUT /api/admin/users/:id/mute
```

**权限**：管理员

**响应**
```json
{ "ok": true, "muted": true }
```

### 删除用户

```
DELETE /api/admin/users/:id
```

**权限**：管理员

**响应**
```json
{ "ok": true }
```

### 设置用户积分

```
PUT /api/admin/users/:id/points
```

**权限**：管理员

**请求体**
```json
{ "points": 500 }
```

**响应**
```json
{ "ok": true, "points": 500 }
```

### 授予管理员

```
PUT /api/superadmin/grant-admin/:id
```

**权限**：超级管理员

**响应**
```json
{ "ok": true, "role": "admin" }
```

### 撤销管理员

```
PUT /api/superadmin/revoke-admin/:id
```

**权限**：超级管理员

**响应**
```json
{ "ok": true, "role": "user" }
```

### 转让超管

```
PUT /api/superadmin/transfer/:id
```

**权限**：超级管理员

**响应**
```json
{ "ok": true, "message": "已将超级管理员转让给 targetuser" }
```

---

## 积分商店

### 获取商品列表

```
GET /api/shop/items
```

**响应**
```json
{
  "items": [
    {
      "id": 1,
      "name": "改名卡",
      "description": "修改一次用户名",
      "icon": "✏️",
      "type": "rename_card",
      "value": null,
      "price": 100,
      "stock": -1,
      "enabled": 1
    }
  ]
}
```

### 兑换商品

```
POST /api/shop/exchange
```

**请求体**
```json
{ "itemId": 1 }
```

**响应**
```json
{
  "ok": true,
  "message": "成功兑换 改名卡",
  "order": {
    "item_id": 1,
    "item_name": "改名卡",
    "item_type": "rename_card",
    "price": 100
  },
  "points": 0,
  "rename_chances": 1,
  "title": null,
  "avatar_frame": null
}
```

### 获取兑换记录

```
GET /api/shop/orders
```

**响应**
```json
{
  "orders": [
    {
      "id": 1,
      "user_id": 1,
      "item_id": 1,
      "item_name": "改名卡",
      "item_type": "rename_card",
      "price": 100,
      "status": "completed",
      "created_at": "2026-09-01T12:00:00.000Z",
      "item_icon": "✏️"
    }
  ]
}
```

---

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未登录 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |
