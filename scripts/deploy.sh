#!/usr/bin/env bash
# ============================================================
# GovProposal AI — Deployment Script
# ============================================================
# Usage:
#   ./scripts/deploy.sh              # Build & deploy locally
#   ./scripts/deploy.sh --docker     # Build & deploy via Docker
#   ./scripts/deploy.sh --restart    # Restart running service
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()   { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

MODE="${1:-local}"

# ── Docker deployment ───────────────────────────────────────
if [ "$MODE" = "--docker" ]; then
    log "Building Docker image..."
    cd "$PROJECT_DIR"
    docker compose build

    log "Starting services..."
    docker compose up -d

    log "Waiting for health check..."
    for i in $(seq 1 30); do
        if curl -sf http://localhost:${PORT:-8000}/api/health > /dev/null 2>&1; then
            log "Application is healthy!"
            docker compose ps
            exit 0
        fi
        sleep 2
    done
    error "Health check failed after 60 seconds"
fi

# ── Restart running service ─────────────────────────────────
if [ "$MODE" = "--restart" ]; then
    log "Restarting service..."
    if command -v docker &> /dev/null && docker compose ps 2>/dev/null | grep -q "app"; then
        docker compose restart app
        log "Docker service restarted"
    else
        # Find and restart uvicorn process
        PID=$(pgrep -f "uvicorn main:app" || true)
        if [ -n "$PID" ]; then
            kill "$PID"
            sleep 2
            cd "$BACKEND_DIR"
            nohup python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} > server.log 2>&1 &
            log "Restarted uvicorn (PID: $!)"
        else
            warn "No running service found"
        fi
    fi
    exit 0
fi

# ── Local deployment ────────────────────────────────────────
log "Starting local deployment..."

# 1. Backend dependencies
log "Installing backend dependencies..."
cd "$BACKEND_DIR"
if [ -d "venv" ]; then
    source venv/bin/activate 2>/dev/null || true
fi
pip install -q -r requirements.txt

# 2. Frontend build
log "Building frontend..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    npm ci --no-audit
fi
npm run build
log "Frontend built: $(du -sh dist | cut -f1)"

# 3. Run backup before deploy
log "Running pre-deploy backup..."
bash "$SCRIPT_DIR/backup.sh" --db-only || warn "Backup failed, continuing deploy"

# 4. Start backend
log "Starting backend server..."
cd "$BACKEND_DIR"

# Kill existing if running
PID=$(pgrep -f "uvicorn main:app" || true)
if [ -n "$PID" ]; then
    log "Stopping existing server (PID: $PID)..."
    kill "$PID"
    sleep 2
fi

nohup python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} > server.log 2>&1 &
NEW_PID=$!
log "Server started (PID: $NEW_PID)"

# 5. Wait for health check
log "Waiting for health check..."
for i in $(seq 1 20); do
    if curl -sf http://localhost:${PORT:-8000}/api/health > /dev/null 2>&1; then
        log "Deployment successful! Server running on port ${PORT:-8000}"
        exit 0
    fi
    sleep 2
done

error "Health check failed after 40 seconds. Check $BACKEND_DIR/server.log"
