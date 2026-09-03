# MiForum Dockerfile
# 轻量化 Node.js 论坛应用

FROM docker.m.daocloud.io/library/node:22-slim

# 配置 Debian 国内镜像源
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# 安装编译依赖和 git（更新功能需要）
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制 package.json 并安装依赖（使用 npmmirror）
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com && npm ci --omit=dev

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

# 启动应用
CMD ["node", "src/server.js"]
