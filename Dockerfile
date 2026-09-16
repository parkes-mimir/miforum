# MiForum Dockerfile
# 轻量化 Node.js 论坛应用（多阶段构建）

# 镜像源可配置（海外构建时传入 --build-arg MIRROR=""）
ARG NODE_IMAGE=docker.m.daocloud.io/library/node:22-slim
ARG APT_MIRROR=mirrors.aliyun.com
ARG NPM_REGISTRY=https://registry.npmmirror.com

# ============================================================
# 阶段 1：构建（安装编译依赖，编译原生模块）
# ============================================================
FROM ${NODE_IMAGE} AS builder

ARG APT_MIRROR
RUN if [ -n "$APT_MIRROR" ]; then sed -i "s/deb.debian.org/$APT_MIRROR/g" /etc/apt/sources.list.d/debian.sources; fi

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ARG NPM_REGISTRY
COPY package.json package-lock.json ./
RUN npm config set registry $NPM_REGISTRY && npm ci --omit=dev

# ============================================================
# 阶段 2：生产（仅运行时依赖，无编译工具）
# ============================================================
FROM ${NODE_IMAGE}

ARG APT_MIRROR
RUN if [ -n "$APT_MIRROR" ]; then sed -i "s/deb.debian.org/$APT_MIRROR/g" /etc/apt/sources.list.d/debian.sources; fi

# git 保留（自动更新功能需要）
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 从构建阶段复制已安装的 node_modules
COPY --from=builder /app/node_modules ./node_modules

# 复制源码
COPY package.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY views/ ./views/

# 创建数据目录
RUN mkdir -p /data/db /data/uploads

# 环境变量
ENV PORT=3000
ENV NODE_ENV=production
ENV DB_PATH=/data/db/data.db
ENV UPLOADS_PATH=/data/uploads
ENV DOCKER_CONTAINER=true

# 复制启动脚本
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 暴露端口
EXPOSE 3000

# 启动应用
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
