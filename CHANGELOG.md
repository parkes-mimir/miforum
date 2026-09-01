# 更新日志 (Changelog)

本文档记录 MiForum 项目的所有重要更改。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [0.5.1] - 2026-09-01

### ✨ 新增 (Added)
- **收藏功能**
  - 帖子列表页添加收藏按钮
  - 帖子详情页添加收藏按钮
  - 个人中心新增"TA的收藏"标签页
  - 收藏列表页面显示用户收藏的所有帖子

### 🔧 API 接口 (Added)
- `POST /api/bookmark/:postId` - 添加收藏
- `DELETE /api/bookmark/:postId` - 取消收藏
- `GET /api/bookmarks` - 获取用户收藏列表
- `GET /api/bookmark/:postId` - 检查帖子是否已收藏

### 📝 数据库 (Added)
- 新增 `bookmarks` 数据表
- 新增 `nextId.bookmarks` 计数器

---

## [0.5.0] - 2026-08-31

### ✨ 新增 (Added)
- 用户认证系统（注册、登录、登出）
- 帖子 CRUD 功能
- 评论系统
- 签到系统
- 点赞功能
- 管理员功能
- 超级管理员权限管理
- 图片上传功能
- 个人资料编辑

### 🎨 界面 (Added)
- 响应式设计
- 暗色/亮色主题
- 移动端适配

---

## [0.4.0] - 2026-08-30

### ✨ 新增 (Added)
- 权限体系重构
- API 文档更新
- 贡献者声明

---

## [0.3.0] - 2026-08-29

### ✨ 新增 (Added)
- 基础论坛功能
- 用户系统
- 帖子发布

---

## 版本说明

- **主版本号 (MAJOR)**: 不兼容的 API 更改
- **次版本号 (MINOR)**: 向后兼容的功能新增
- **修订号 (PATCH)**: 向后兼容的问题修复

---

*最后更新: 2026-09-01*

