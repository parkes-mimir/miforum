#!/bin/bash
# MiForum 数据库备份脚本
# 用法: ./scripts/backup-db.sh [备份目录]

set -e

# 默认备份目录
BACKUP_DIR="${1:-./backups}"
DB_PATH="${DB_PATH:-./src/data.db}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/miforum_${TIMESTAMP}.db"

# 检查数据库文件是否存在
if [ ! -f "$DB_PATH" ]; then
  echo "错误: 数据库文件不存在: $DB_PATH"
  exit 1
fi

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 使用 SQLite 的 .backup 命令确保一致性备份
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# 压缩备份
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "备份完成: $BACKUP_FILE"
echo "大小: $(du -h "$BACKUP_FILE" | cut -f1)"

# 清理超过30天的备份
find "$BACKUP_DIR" -name "miforum_*.db.gz" -mtime +30 -delete 2>/dev/null || true

echo "备份已保存到: $BACKUP_DIR"
echo "保留最近30天的备份"
