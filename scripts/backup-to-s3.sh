#!/bin/bash

# Simple script to backup Docker volumes to S3 using AWS CLI
# Assumes AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION set
# and docker-compose.production.yml volumes defined

set -e

BACKUP_BUCKET="${S3_BACKUP_BUCKET:-daorsagro-backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/backup_$TIMESTAMP"

mkdir -p $BACKUP_DIR

# Function to backup a volume
backup_volume() {
  local volume_name=$1
  local backup_file="$BACKUP_DIR/${volume_name}.tar.gz"
  docker run --rm -v $volume_name:/data -v $BACKUP_DIR:/backup alpine sh -c "tar czf /backup/${volume_name}.tar.gz -C /data ."
}

# Backup critical volumes
backup_volume postgres_data
backup_volume mongodb_data
backup_volume redis_data
backup_volume elasticsearch_data
backup_volume kafka_data
backup_volume zookeeper_data
backup_volume document_storage

# Upload to S3
aws s3 sync $BACKUP_DIR s3://$BACKUP_BUCKET/backups/$TIMESTAMP/

echo "Backup completed to s3://$BACKUP_BUCKET/backups/$TIMESTAMP/"

# Cleanup
rm -rf $BACKUP_DIR