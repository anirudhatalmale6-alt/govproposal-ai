#!/usr/bin/env bash
# ============================================================
# GovProposal AI — Database & Data Backup Script
# ============================================================
# Usage:
#   ./scripts/backup.sh                     # Full backup
#   ./scripts/backup.sh --db-only           # Database only
#   BACKUP_DIR=/mnt/backups ./scripts/backup.sh  # Custom path
# ============================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="govproposal_backup_${TIMESTAMP}"
DB_PATH="$PROJECT_DIR/backend/data/govproposal.db"
UPLOADS_PATH="$PROJECT_DIR/backend/data/uploads"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()   { echo -e "${GREEN}[BACKUP]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Create backup directory
mkdir -p "$BACKUP_DIR"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
mkdir -p "$BACKUP_PATH"

log "Starting backup: $BACKUP_NAME"
log "Backup directory: $BACKUP_PATH"

# 1. Backup SQLite database
if [ -f "$DB_PATH" ]; then
    log "Backing up SQLite database..."
    cp "$DB_PATH" "$BACKUP_PATH/govproposal.db"
    log "Database backup: $(du -h "$BACKUP_PATH/govproposal.db" | cut -f1)"
else
    warn "Database file not found at $DB_PATH — skipping"
fi

# 2. Backup uploads (unless --db-only)
if [ "${1:-}" != "--db-only" ] && [ -d "$UPLOADS_PATH" ]; then
    log "Backing up uploaded files..."
    cp -r "$UPLOADS_PATH" "$BACKUP_PATH/uploads"
    log "Uploads backup: $(du -sh "$BACKUP_PATH/uploads" | cut -f1)"
fi

# 3. Backup .env files (sanitized — strip secret values)
if [ -f "$PROJECT_DIR/backend/.env" ]; then
    log "Backing up environment config (keys only, no secrets)..."
    sed 's/=.*/=<REDACTED>/' "$PROJECT_DIR/backend/.env" > "$BACKUP_PATH/backend.env.keys"
fi

# 4. Create compressed archive
log "Compressing backup..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_PATH"

ARCHIVE_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
log "Backup complete: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz ($ARCHIVE_SIZE)"

# 5. Clean up old backups (keep last 10)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/govproposal_backup_*.tar.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
    REMOVE_COUNT=$((BACKUP_COUNT - 10))
    log "Cleaning up old backups ($REMOVE_COUNT to remove)..."
    ls -1t "$BACKUP_DIR"/govproposal_backup_*.tar.gz | tail -n "$REMOVE_COUNT" | xargs rm -f
fi

log "Done!"
