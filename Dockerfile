# MiForum Dockerfile
# 轻量化 Node.js 论坛应用

FROM node:20-alpine

# 安装 better-sqlite3 编译依赖
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 复制 package.json 并安装依赖
COPY package.json package-lock.json ./
RUN npm ci --production && npm cache clean --force

# 复制源码
COPY src/ ./src/
COPY public/ ./public/
COPY docs/ ./docs/
COPY tailwind.config.js ./

# 创建数据目录
RUN mkdir -p /data/db /data/uploads

# 环境变量
ENV PORT=3000
ENV NODE_ENV=production
ENV DB_PATH=/data/db/data.db
ENV UPLOADS_PATH=/data/uploads

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# 启动应用
CMD ["node", "src/server.js"]
