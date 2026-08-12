#!/bin/bash
set -e

BACKUP_DIR="/var/backups/isa-marathon"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/isa_marathon_$TIMESTAMP.sql.gz"

mkdir -p $BACKUP_DIR

echo "📦 Creating database backup..."
docker exec isa-postgres pg_dump -U isa isa_marathon | gzip > "$BACKUP_FILE"

find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup created: $BACKUP_FILE"
echo "📊 Size: $(du -h $BACKUP_FILE | cut -f1)"
