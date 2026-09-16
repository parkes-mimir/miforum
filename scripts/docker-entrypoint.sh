#!/bin/sh
# Docker启动脚本：检查并应用更新

DATA_DIR="${DB_PATH:-/data/db}"
UPDATE_DIR="$(dirname "$DATA_DIR")/update"
VERSION_FILE="$UPDATE_DIR/version.txt"

if [ -d "$UPDATE_DIR" ] && [ -f "$VERSION_FILE" ]; then
  echo "发现待应用的更新，正在恢复..."
  
  # 复制更新文件到应用目录
  for item in src public package.json package-lock.json; do
    if [ -e "$UPDATE_DIR/$item" ]; then
      rm -rf "/app/$item"
      cp -r "$UPDATE_DIR/$item" "/app/$item"
      echo "  已恢复: $item"
    fi
  done
  
  # 安装依赖
  cd /app
  npm install --omit=dev 2>/dev/null || true
  
  VERSION=$(cat "$VERSION_FILE")
  echo "已应用更新: $VERSION"
  
  # 清理更新目录
  rm -rf "$UPDATE_DIR"
fi

# 启动应用
exec node src/server.js
