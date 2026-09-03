# MiForum Dockerfile
# 轻量化 Node.js 论坛应用

FROM node:22-slim

# 安装编译依赖
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制 package.json 并安装依赖
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 复制源码
COPY src/ ./src/
COPY public/ ./public/
COPY docs/ ./docs/
COPY tailwind.config.js ./

# 环境变量
ENV PORT=3000
ENV NODE_ENV=production
ENV DB_PATH=/data/db/data.db
ENV UPLOADS_PATH=/data/uploads

# 暴露端口
EXPOSE 3000

# 启动时自动创建数据目录
CMD ["sh", "-c", "mkdir -p /data/db /data/uploads && node src/server.js"]
