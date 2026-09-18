# 更新日志

本项目遵循 [语义化版本](https://semver.org/)。

---

## [1.5.0] - 2026-09-16 - parkes-mimir

### 新增
- BOT自动发帖功能：支持RSS源拉取，自动创建帖子
- BOT管理界面：管理员可添加/编辑/删除/启禁用BOT
- 游戏管理功能：管理员可配置在线游戏
- 游戏管理界面：管理面板新增游戏标签页
- 游戏新增字段：作者、游戏类型（单机/联机）、源码类型（开源/闭源）

### 改进
- BOT管理界面优化：板块选择改为动态加载，显示RSS地址
- 游戏列表显示类型标签
- 侧边栏游戏弹窗从数据库加载

### 修复
- BOT用户独立化：每个BOT使用独立的用户账号发帖
- 修复display_id重复导致BOT用户创建失败

### 变更
- 配置8个中文RSS源BOT，覆盖5种板块
- 技术：少数派、IT之家
- 新闻：人民日报、中国新闻网
- 游戏：触乐、机核
- 生活：Unsplash
- 体育：环球体育

---

## [1.4.2] - 2026-09-16 - parkes-mimir

### 新增
- 忘记密码功能：通过邮箱验证码重置密码
- 登录弹窗新增"找回密码"标签页
- 登录页面添加"忘记密码？"快捷链接

---

## [1.4.1] - 2026-09-16 - parkes-mimir

### 修复
- 修复Docker更新重启后丢失：恢复挂载整个项目目录
- 简化启动脚本和更新逻辑

---

## [1.4.0] - 2026-09-16 - parkes-mimir

### 新增
- 在线游戏功能：侧边栏添加"在线游戏"入口
- 游戏弹窗：支持iframe嵌入游戏，可全屏打开
- 多游戏配置：支持配置多个游戏（JSON数组格式）
- 支持接入RPG Maker H5游戏

### 变更
- GAMES环境变量替代GAME_URL，支持多游戏配置
- 游戏入口从积分商店移至侧边栏独立按钮

---

## [1.3.3] - 2026-09-16 - parkes-mimir

### 修复
- 修复Docker更新重启后丢失：更新保存到持久化卷，容器启动时自动恢复

---

## [1.3.2] - 2026-09-16 - parkes-mimir

### 新增
- 移除频道成员：频道主可移除普通成员和管理员
- 频道设置中显示删除频道按钮（仅频道主和超管可见）
- Docker启动脚本：容器重启时自动应用更新

### 修复
- 修复管理页面用户头像不显示
- 修复热门帖子搜索和标签筛选
- 修复热门帖子置顶不显示在第一位
- 修复Docker更新重启后丢失问题
- 热门分类隐藏排序选项（使用独立算法）

### 安全
- 修复板块可见性漏洞：帖子列表和详情API过滤仅频道成员可见的板块帖子
- 修复热门帖子算法：同样过滤无权查看的板块帖子
- 未登录用户不能看到 members/selected 可见性的板块帖子

### 变更
- 删除"全部话题"，默认显示"热门"板块

---

## [1.3.0] - 2026-09-15 - parkes-mimir

### 新增
- 频道板块管理：频道主/管理员可在频道设置中添加、编辑、删除板块
- 板块编辑弹窗：支持修改名称、简介、图标、可见性、发帖权限
- 板块可见成员管理：选择"指定成员"可见性后可添加/移除可见成员
- 频道加入功能：支持直接加入（open）和审核加入（verify）两种模式
- 频道加入申请表：存储审核申请记录
- 加入频道弹窗：审核模式下可填写申请理由
- 审核申请管理：频道主/管理员可批准或拒绝申请
- 频道列表显示加入按钮（非成员）和审核按钮（有待审核申请时）
- PM2 进程管理：自动重启、开机自启、日志管理
- 新增 npm scripts：prod、stop、restart、logs

### 修复
- 修复服务器重启后登录状态丢失：session secret 存储路径改为与数据库同目录
- 修复更新功能：更新前暂存本地更改，更新后自动重启服务器
- 更新功能支持多种部署方式：Docker、PM2、systemd

### 变更
- PM2 加入项目依赖，npm install 自动安装
- README.md 添加 PM2 部署说明和常用命令
- 技术栈表格添加 PM2 进程管理

---

## [1.2.7] - 2026-09-15 - parkes-mimir

### 新增
- 创建频道权限限制：签到满10天且积分>=500才可创建频道（补签计入签到天数）
- 创建频道成功后扣除500积分

### 删除
- 管理员奖励积分功能（已有兑换码系统替代）

---

## [1.2.6] - 2026-09-15 - parkes-mimir

### 新增
- 管理面板标签页切换：6 个标签页（用户管理、商品管理、兑换码、兑换记录、邮箱设置、关于）
- 管理面板移动端适配：自动换行布局、增大点击区域、精简标签文字
- 商品表单输入描述：每个输入框下方显示灰色提示文字
- 兑换码表单输入描述：积分值、使用次数、过期时间说明
- 关于页面 GitHub 项目链接：带图标和外部链接标识

### 修复
- 修复管理面板 2x3 网格布局在小屏幕显示为 1x6（lg:grid-cols-2 不在预编译 CSS 中）
- 修复管理面板表单 grid-cols-4 在移动端过于拥挤（改为 auto-fit 响应式）
- 修复管理面板操作按钮在移动端难以点击（增大至 px-2 py-1）

---

## [1.2.5] - 2026-09-08 - parkes-mimir

### 新增
- 帖子草稿功能：发布弹窗关闭时自动保存草稿到 localStorage，重新打开时恢复
- 草稿自动保存：编辑内容时每 5 秒自动保存，防止意外丢失
- 草稿恢复提示：有草稿时显示"有草稿"标签，支持手动清除草稿
- 草稿过期机制：超过 7 天的草稿自动清除
- 防误触保护：发布弹窗有内容时，点击背景自动保存草稿并关闭（不再弹确认框）
- 积分商店管理功能：管理员可创建/编辑/删除/上下架商品
- 兑换记录查看：管理员可查看所有用户的兑换记录（含用户名、商品、积分）
- 404 页面：自定义 404 页面，API 返回 JSON，页面渲染友好提示
- Open Graph 标签：帖子分享到微信显示图文卡片
- Speculation Rules：鼠标悬停链接时浏览器预渲染下一页
- PWA 支持：manifest.json + Service Worker（缓存分层）
- 主题持久化：登录用户主题存数据库，换设备自动同步

### 修复
- 修复发布弹窗 confirm 弹窗导致页面卡死（勾选"忽略弹窗"后无法操作）
- 修复刷新过快被踢出登录（load() 捕获 429 限频错误误清空用户状态）
- 修复 API 限频过低（100/min → 300/min）
- 修复发布弹窗点击背景直接关闭导致内容丢失
- 修复按 Escape 直接关闭发布弹窗导致内容丢失
- 修复 404 页面返回 500 错误（getUserTheme 作用域问题）
- 修复 404 处理器拦截 API 路由（移至路由注册之后）
- 修复 emoji picker XSS：image_url 未转义
- 修复前后端连接崩溃：admin-system.js 缺失 decryptText 导入
- 修复 logout 回调未处理
- 修复侧边栏 section_type 与 API 返回 sectionType 不一致
- 修复 emoji 搜索逻辑错误
- 修复用户删除时孤立会话未清理
- 修复用户删除时验证码表未清理
- 修复帖子图片 URL 未转义
- 修复 insertImageAtCursor 使用全局选择器
- 修复后端未校验图片总数
- 修复密码修改无 loading 状态
- 修复称号/头像框无长度限制
- 修复所在地/网站字段无长度限制
- 修复商店兑换响应命名不统一
- 修复收藏标签页显示他人收藏
- 修复 profile.js 全部 toast() 统一为 Alpine.store

---

## [1.2.4] - 2026-09-08 - parkes-mimir

### 新增
- 搜索功能：侧边栏搜索输入框，支持回车搜索、清除按钮、URL 同步
- 404 页面：API 返回 JSON，页面渲染友好 404 提示
- 每日 EXP 上限感知：addExp 返回 capped 状态，调用方可感知截断
- EXP 日志自动清理：30 天前记录自动删除，防止表无限增长

### 修复
- 修复注册无密码最大长度限制（>72 位 bcrypt 截断导致登录失败）
- 修复注册验证码提示不明确（"请填写所有字段"改为"请填写验证码"）
- 修复 Emoji picker XSS：image_url 未转义注入 onclick 处理器
- 修复前后端连接崩溃：admin-system.js 缺失 decryptText 导入（SMTP 测试报错）
- 修复 logout 回调未处理（响应在 session 销毁前发送）
- 修复侧边栏 section_type 与 API 返回 sectionType 不一致
- 修复 Emoji 搜索逻辑错误（filter 回调参数未使用）
- 修复用户删除时孤立会话未清理（对方看到空会话）
- 修复用户删除时验证码表未清理
- 修复帖子图片 URL 未转义（XSS 风险）
- 修复 insertImageAtCursor 使用全局选择器（可能选错元素）
- 修复后端未校验图片总数（仅前端限制 30 张）
- 修复密码修改无 loading 状态（可重复点击）
- 修复称号/头像框无长度限制
- 修复所在地/网站字段无长度限制
- 修复商店兑换响应 rename_chances 命名不统一（改为 camelCase）
- 修复帖子/评论/私信内容长度限制与搜索 LIKE 转义
- 修复帖子编辑分类标签显示原始 key 而非中文名称
- 修复收藏标签页显示他人收藏（改为仅自己可见）
- 修复 profile.js 全部 toast() 统一为 Alpine.store('toast').show()
- 修复 head.ejs 添加 manifest.json 链接
- 修复 404 处理器注册顺序（移到路由之后）

### 变更
- 密码最大长度统一为 72 位（注册 + 修改密码）
- 头像框预览改用 FRAME_STYLES gradient（与 common.js 一致）
- 分类管理 label 限制统一为 20 字
- verify codes 表随用户删除自动清理

---

## [1.2.3] - 2026-09-08 - parkes-mimir

### 新增
- 主题持久化：登录用户主题存数据库，换设备自动同步，EJS 服务端直出零闪烁
- Speculation Rules：鼠标悬停链接时浏览器预渲染下一页，点击零延迟
- PWA 支持：manifest.json + Service Worker（静态资源 Cache First，页面 Network First）
- 用户偏好 API：`GET/PUT /api/preferences` 端点
- 数据库备份脚本：`npm run backup`（SQLite .backup + gzip + 30天自动清理）
- 覆盖率报告：`npm run test:coverage`
- API 版本号：`/api/v1/*` 自动映射到 `/api/*`，向后兼容
- CONTRIBUTING.md 贡献指南
- ESLint + Prettier + Husky pre-commit 代码质量工具链
- 可访问性：所有模态框添加 ARIA 属性（role="dialog"、aria-modal="true"）和 Escape 键关闭
- Toast 通知添加 role="alert" 属性

### 修复
- 修复 6 个 XSS 漏洞（头像 URL、emoji 注入、更新结果、个人网站 javascript: 协议）
- 修复私密帖子隐私过滤绕过（profile.js 使用 isAdmin 函数引用而非调用）
- 修复用户删除外键约束失败（补全 13 张关联表的级联清理）
- 修复帖子编辑表单不显示自定义板块（改为动态加载分类）
- 修复帖子详情页和用户主页分类标签显示原始 key 而非中文名称
- 修复管理员徽章缺少 text-white 导致文字不可见
- 修复 force_password_change 弹窗元素缺失时报错
- 修复帖子/评论/私信无内容长度限制
- 修复签到逻辑代码重复（提取公共 doCheckin 函数）
- 修复标签聚合全量加载（限制 30 天 + top 20）
- 修复通知未读计数 4 次独立查询（合并为 1 次）
- 修复补签积分硬编码（改为从 API 动态读取）
- 修复签到/发帖 toast 积分数值硬编码
- 修复 SMTP 配置读取代码重复（统一使用 getSmtpRawConfig）
- 修复 parsePagination 未统一使用（5 个文件改为调用共享函数）
- 修复 isAdmin() 未统一调用（3 处内联改为函数调用）
- 修复 posts.js 标签解析代码重复（提取 parseTags 函数）
- 修复前端 avatarHtml/frameStyles/catLabel 代码重复
- 修复 relTime 包装函数冗余
- 修复注入脚本模板在 5 个 EJS 页面重复（移至 scripts.ejs）

### 安全
- Session 再生成防 fixation 攻击（登录后 session ID 刷新）
- CSRF 生产环境严格模式（有 Cookie 但无 Origin 时拒绝）
- 上传文件 MIME 类型双重校验（扩展名 + mimetype）
- 邮箱格式校验加强（RFC 5322 简化版）
- 外键添加 ON DELETE CASCADE（11 个引用 profiles 的表）
- 新增 7 个数据库索引（created_at、private、role、type、sender 等）
- 死代码清理：requireAuthWithUserCheck、EXP_REWARDS.comment（改为 vote）

### 变更
- Dockerfile 改为多阶段构建（生产镜像不含 python3/make/g++）
- CI 添加 npm audit 安全扫描步骤
- SESSION_SECRET 占位符统一为 change-me-in-production
- .gitignore 补全（backups、.update-tmp、IDE、OS 文件）
- 测试数量：154 → 160

---

## [1.2.2] - 2026-09-08 - parkes-mimir

### 修复
- 主题色按钮因 Tailwind button reset 显示为白色
- 立即更新按钮点击无响应（移除 confirm 弹窗阻塞）

### 变更
- 主题 CSS 变量命名精简，减少选择器数量提升性能

---

## [1.2.1] - 2026-09-08 - parkes-mimir

### 新增
- 亮色/暗色模式切换，跟随系统偏好，支持手动切换
- 5 种主题色可选（紫、蓝、绿、橙、玫红），偏好持久化到 localStorage
- 导航栏显示管理员/超管身份标签，所有页面可见
- 移动端汉堡菜单按钮恢复

### 修复
- 积分商店兑换按钮点击无反应
- 表情选择器插入后评论框不同步
- 等级徽章在三个页面显示不一致
- 管理面板按钮在非主页点击无反应
- 上传头像在导航栏显示尺寸异常
- JS/CSS 文件被浏览器缓存导致更新不生效

### 变更
- 默认主题色从蓝色改为紫色
- 管理面板入口移至导航栏（退出按钮旁）

---

## [1.2.0] - 2026-09-07 - parkes-mimir, phppi561, jxwzx, XY20-hub, sakesenqiu1

### 新增
- 公共 EJS partials（head/header/scripts），消除 ~420 行重复 HTML
- Alpine.js 全局状态管理（auth + toast store）
- 交互组件注入机制（登录弹窗、Toast、修改密码、图片查看器）
- 静态资源 ETag 缓存（JS/CSS 1小时，图片 7 天）
- 点赞/收藏失败时自动回滚 UI 状态
- 测试报告文档 docs/TEST-REPORT.md

### 安全
- 移除硬编码加密密钥，未设置 SESSION_SECRET 时启动警告
- 管理员自动更新添加路径白名单验证，防止 shell 注入
- 验证码锁定持久化到数据库（code_lockouts 表），重启不重置

### 变更
- 数据库路径统一：支持 DB_PATH 环境变量，自动选择可用路径

### 重大变更
- 前端架构重构：内联 JS 迁移至 Alpine.js，HTML 迁移至 EJS 模板
- 后端服务层拆分：提取 services/（level、postHelper、notification、poll、hotPosts）
- admin.js 拆分为 4 个模块（users/categories/system/superadmin）
- 数据库模块化：schema/seeds/connection 分离
- 新增中央路由映射 routes/index.js（79 个 API 端点）
- Session 改用 SQLite 持久化存储，重启不丢失登录状态

### 删除
- 移除 public/*.html（迁移到 views/*.ejs）
- 移除未使用的组件（poll-card.js、旧 auth-modal.js）
- 代码量从 ~9,800 行精简至 ~5,200 行

---

## [1.1.9] - 2026-09-06 - parkes-mimir

### 修复
- 登录状态重启后丢失（session 密钥持久化到 data/.session-secret）
- 表情选择器在移动端溢出屏幕（宽度改为自适应）
- 签到时区问题（凌晨0点无法签到，改用 TZ_OFFSET 环境变量）

---

## [1.1.8] - 2026-09-06 - parkes-mimir

### 新增
- 图片拖拽排序 + 光标位置插入（支持文字-图片交错排版）
- 编辑模式图片管理（新增图片也有插入按钮）

### 修复
- 图片文件名冲突导致覆盖（加随机后缀）
- 图片插入按钮改为始终可见

---

## [1.1.7] - 2026-09-05 - parkes-mimir

### 新增
- 帖子分享功能（原生 Web Share API + 复制链接回退）

---

## [1.1.6] - 2026-09-05 - parkes-mimir

### 新增
- 自定义表情系统（默认 emoji + 上传自定义图片 + 一键收藏）
- Docker 更新镜像支持 GITHUB_MIRROR 环境变量

### 修复
- JSON body 限制提升至 2MB（修复表情上传失败）
- 表情压缩尺寸改为 300×300

---

## [1.1.5] - 2026-09-05 - parkes-mimir

### 新增
- 板块重构：公告/热门/普通板块，用户可创建自定义板块
- 热门帖子个性化推荐算法（Discourse 启发）

---

## [1.1.4] - 2026-09-05 - parkes-mimir

### 新增
- 帖子投票（单选/多选、时间限制、自动过期、进度条动画）
- 帖子编辑支持投票管理（删除/新建）

---

## [1.1.3] - 2026-09-04 - parkes-mimir

### 新增
- 消息中心（B站风格侧边栏：私信/回复/点赞/收藏通知）
- 通知系统（点赞/评论/收藏自动触发通知）
- 私信系统（1对1聊天，轮询刷新）
- 消息徽标（右上角信封图标显示总未读数）

---

## [1.1.2] - 2026-09-04 - parkes-mimir

### 新增
- 私密帖子（仅作者和管理员可见）
- 帖子排序（最新/最多赞/最早）

---

## [1.1.1] - 2026-09-04 - parkes-mimir

### 修复
- HTTP 环境登录状态丢失（secure: isProduction → COOKIE_SECURE 环境变量）
- 积分商店不同称号/头像框可分别购买
- Dockerfile 移除不存在的 docs/ COPY 指令

---

## [1.1.0] - 2026-09-04 - parkes-mimir

### 新增
- 前端公共函数库 common.js（esc、toast、relTime、api、avatarHtml）
- multer 配置提取为共享模块 upload.js
- 测试用例扩展至 25 个

### 安全
- 21 项安全审计修复（XSS、CSRF、SMTP 加密、验证码防暴力破解、路径遍历等）

---

## [1.0.9] - 2026-09-03 - parkes-mimir

### 安全
- Lightbox XSS 防护：验证 URL 必须以 /uploads/ 开头

### 修复
- 帖子详情页注册表单添加验证码和密码强度指示器

---

## [1.0.8] - 2026-09-03 - parkes-mimir

### 安全
- CORS 策略改为白名单模式（CORS_ORIGINS 环境变量）
- SQL 注入防护：字段名白名单校验
- 验证码使用 crypto.randomInt（密码学安全）
- Session Cookie 生产环境强制 HTTPS

---

## [1.0.7] - 2026-09-03 - parkes-mimir

### 变更
- Docker 挂载项目目录，支持容器内自动更新
- 数据库和上传目录使用 named volume 持久化

---

## [1.0.6] - 2026-09-03 - parkes-mimir

### 修复
- 纯图片评论无法编辑
- 帖子详情页标签横排显示 + 展开/收起按钮
- 多评论编辑独立状态（互不干扰）
- 管理员奖励积分按钮

---

## [1.0.5] - 2026-09-03 - parkes-mimir

### 变更
- 标签展开/收起按钮文案优化
- 移动端帖子标签显示优化

---

## [1.0.4] - 2026-09-03 - parkes-mimir

### 修复
- 手机端发帖弹窗可滚动，发布按钮固定在底部
- 图片上传路径支持环境变量（Docker 兼容）

---

## [1.0.3] - 2026-09-03 - parkes-mimir

### 修复
- 禁用 CSP upgrade-insecure-requests（解决局域网 HTTP 访问问题）

---

## [1.0.2] - 2026-09-03 - parkes-mimir

### 修复
- 禁用 HSTS（解决浏览器强制跳转 HTTPS）

---

## [1.0.1] - 2026-09-03 - parkes-mimir

### 修复
- 添加 CORS 支持，允许局域网跨域访问
- 放宽 CSP 策略（connectSrc/imgSrc 允许 http/https）

---

## [1.0.0] - 2026-09-03 - parkes-mimir, jxwzx, phppi561

### 重大变更
首个正式版本发布。

**功能**：用户系统（注册/登录/强制改密）、帖子/评论 CRUD、签到、点赞/收藏、积分商店、等级系统（Lv1~Lv10）、管理后台、Docker 部署、CI/CD

**技术栈**：Node.js + Express + SQLite（better-sqlite3）+ Tailwind CSS + 原生 JS

**测试**：53 个用例全部通过

---

## [0.9.9] - 2026-09-03 - parkes-mimir

### 变更
- 经验值系统优化：每日经验上限 100，经验值获取数值调整
- 等级曲线调整：Lv10 需要 30000 经验（10个月满级）

---

## [0.9.8] - 2026-09-03 - parkes-mimir

### 新增
- 邮箱验证（SMTP 发送验证码）
- 管理面板 SMTP 配置（支持测试连接）

---

## [0.9.7] - 2026-09-02 - parkes-mimir

### 新增
- Docker 支持（Dockerfile + docker-compose.yml）
- CI/CD（GitHub Actions 自动测试 + 镜像构建）

---

## [0.9.6] - 2026-09-02 - parkes-mimir

### 变更
- 统一 display_id 为六位数（000000-999999）
- 移除商店「无头像框」商品

---

## [0.9.5] - 2026-09-02 - parkes-mimir

### 变更
- 点赞和收藏仅本人可见（隐私保护）

---

## [0.9.4] - 2026-09-02 - parkes-mimir

### 新增
- 分页加载（帖子/评论/收藏/用户帖子/点赞）
- 密码强度指示器（4档：非常弱→非常强）
- 显示本机 IP 地址

---

## [0.9.3] - 2026-09-02 - parkes-mimir

### 新增
- 环境变量管理（dotenv）
- 安全加固（helmet、express-rate-limit）
- 强制修改密码（超管首次登录）
- 单元测试（jest + supertest，16 个用例）

---

## [0.9.2] - 2026-09-02 - parkes-mimir

### 重大变更
- 项目结构重构：采用 NodeBB 风格模块化架构（controllers/middleware/utils）
- ESLint 代码规范配置

### 修复
- 管理员中间件调用（requireAdmin 需传 db 参数）
- tailwind.css 路径（改为 css/tailwind.css）

---

## [0.9.1] - 2026-09-02 - parkes-mimir

### 修复
- selectTitle/selectFrame 使用隐式 event 对象
- shop.html 的 esc() 缺少单引号转义

---

## [0.9.0] - 2026-09-02 - jxwzx

### 新增
- 活跃度等级系统（Lv1~Lv10，星星→月亮→太阳→皇冠）
- 经验值系统（注册+50、签到+10、发帖+20、评论+5）
- 积分商店装备/卸下功能

### 修复
- 等级徽章字体白色在白色背景上不可见
- 头像框/等级徽章不显示（Tailwind 预编译 CSS 缺少动态渐变类）

---

## [0.8.4] - 2026-09-02 - jxwzx

### 变更
- 称号和头像框不可重复购买（永久物品限制）
- 编辑资料新增称号/头像框选择

---

## [0.8.3] - 2026-09-01 - parkes-mimir

### 安全
- 路径遍历漏洞：deleteFile 限制只能删除 uploads 目录下的文件
- Session 安全：crypto.randomBytes 生成密钥，httpOnly/sameSite 属性

### 修复
- 添加 /api/admin/status 端点
- 评论前检查帖子是否存在

---

## [0.8.2] - 2026-09-01 - parkes-mimir

### 新增
- PWA meta 标签（theme-color、apple-mobile-web-app）
- 移动端触摸优化（:active 状态反馈）

---

## [0.8.1] - 2026-09-01 - parkes-mimir

### 新增
- 用户 display_id 系统（三位数用户标识 000-999）

---

## [0.8.0] - 2026-09-01 - parkes-mimir, jxwzx

### 重大变更
- 数据库从 JSON 文件迁移至 SQLite（better-sqlite3）
- Tailwind CSS 本地化，移除 CDN 依赖

---

## [0.7.1] - 2026-09-01 - parkes-mimir

### 新增
- 头像框/称号兑换预览效果

---

## [0.7.0] - 2026-09-01 - parkes-mimir, jxwzx

### 新增
- 积分商店系统（称号、头像框、改名卡）

---

## [0.6.0] - 2026-09-01 - parkes-mimir

### 新增
- 帖子标签系统、动态分类管理

---

## [0.5.2] - 2026-09-01 - parkes-mimir, jxwzx

### 新增
- 收藏功能（帖子列表/详情页收藏按钮，个人资料「TA的收藏」Tab）

---

## [0.5.1] - 2026-09-01 - jxwzx

### 新增
- 收藏 API（POST/DELETE /api/bookmark/:postId、GET /api/bookmarks）

---

## [0.5.0] - 2026-08-31 - parkes-mimir

### 新增
- 个人资料页（头像裁剪、简介、隐私设置）
- 帖子/评论 API 返回 author_avatar_url

---

## [0.4.0] - 2026-08-31 - parkes-mimir, phppi561

### 新增
- 三级角色体系（超管/管理/普通用户）
- 帖子置顶、禁言/解禁用户

---

## [0.3.1] - 2026-08-30 - parkes-mimir

### 变更
- 全部代码添加中文注释
- 提取 deleteFile/deleteImages 辅助函数

---

## [0.3.0] - 2026-08-30 - parkes-mimir

### 新增
- 帖子新标签页、图片 Lightbox
- 评论多图片、楼层号、置顶评论
- 自动签到

### 修复
- multer Unexpected field 错误处理

---

## [0.2.1] - 2026-08-29 - phppi561

### 修复
- 签到 API 时区修复（addDays 改用 UTC）

---

## [0.2.0] - 2026-08-29 - parkes-mimir

### 新增
- 365 天签到日历（月历视图、左右翻页、月份选择器）
- 端口占用自动杀旧进程重启

---

## [0.1.0] - 2026-08-28 - parkes-mimir

初始版本：用户注册/登录、帖子/评论 CRUD、点赞、签到、搜索、Flarum 风格 UI

---

## 贡献者

- [parkes-mimir](https://github.com/parkes-mimir)
- [phppi561](https://github.com/phppi561)
- [jxwzx](https://github.com/jxwzx)
- [XY20-hub](https://github.com/XY20-hub)
- [sakesenqiu1](https://github.com/sakesenqiu1)
