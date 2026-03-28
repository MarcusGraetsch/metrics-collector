#!/bin/bash
# Metrics Collector CLI
# Fetches latest ecological and social metrics from research sources
#
# Usage:
#   ./collect-metrics.sh            # Fetch all sources
#   ./collect-metrics.sh --source rm  # Fetch specific source
#   ./collect-metrics.sh --category ecological  # Fetch by category
#
# Cron example (weekly on Sunday at 3am):
#   0 3 * * 0 /root/.openclaw/workspace/engineering/metrics-collector/scripts/collect-metrics.sh >> /var/log/metrics-collector.log 2>&1

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"
LOG_FILE="${LOG_FILE:-/var/log/metrics-collector.log}"

# Ensure data directory exists
mkdir -p "$DATA_DIR"

# Export database path
export METRICS_DB_PATH="$DATA_DIR/metrics.db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    log "${GREEN}✓${NC} $1"
}

log_warn() {
    log "${YELLOW}⚠${NC} $1"
}

log_error() {
    log "${RED}✗${NC} $1"
}

# Check dependencies
check_deps() {
    local missing=()
    
    if ! command -v node &> /dev/null; then
        missing+=(node)
    fi
    
    if ! command -v npm &> /dev/null; then
        missing+=(npm)
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing[*]}"
        log "Install with: npm install"
        exit 1
    fi
}

# Install dependencies if needed
install_deps() {
    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        log "Installing dependencies..."
        cd "$PROJECT_DIR"
        npm install
        log_success "Dependencies installed"
    fi
}

# Initialize database
init_db() {
    log "Initializing database..."
    
    # Create a simple init script that runs the schema
    node -e "
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.METRICS_DB_PATH || path.join(process.cwd(), 'data', 'metrics.db');
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(\`
  CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    source_type TEXT NOT NULL,
    description TEXT,
    last_fetched TEXT,
    fetch_status TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    category TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    provider TEXT,
    model_id TEXT,
    value REAL NOT NULL,
    value_unit TEXT NOT NULL,
    confidence TEXT,
    source_url TEXT,
    source_note TEXT,
    fetched_at TEXT NOT NULL,
    valid_from TEXT NOT NULL,
    valid_until TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (source_id) REFERENCES sources(id)
  );

  CREATE TABLE IF NOT EXISTS metric_history (
    id TEXT PRIMARY KEY,
    metric_id TEXT NOT NULL,
    snapshot_date TEXT NOT NULL,
    value REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (metric_id) REFERENCES metrics(id)
  );

  CREATE INDEX IF NOT EXISTS idx_metrics_category ON metrics(category);
  CREATE INDEX IF NOT EXISTS idx_metrics_provider ON metrics(provider);
  CREATE INDEX IF NOT EXISTS idx_metrics_model ON metrics(model_id);
  CREATE INDEX IF NOT EXISTS idx_metrics_fetched ON metrics(fetched_at);
\`);

console.log('Database initialized at:', DB_PATH);
" || log_error "Database initialization failed"
}

# Run the research agent
run_research() {
    log "Starting metrics collection..."
    
    cd "$PROJECT_DIR"
    
    # Run with npx to use local TypeScript
    npx ts-node src/agents/researcher.ts "$@"
    
    if [ $? -eq 0 ]; then
        log_success "Metrics collection completed"
    else
        log_error "Metrics collection failed"
        exit 1
    fi
}

# Show help
show_help() {
    echo "
Metrics Collector CLI

Usage: $(basename "$0") [OPTIONS]

Options:
    --source SOURCE     Fetch from specific source (rm, z2data, wef, etc.)
    --category CAT      Fetch by category (ecological, social, supply_chain)
    --all               Fetch from all sources (default)
    --init              Initialize database
    --help              Show this help

Examples:
    $(basename "$0")                      # Fetch all sources
    $(basename "$0") --source eco_liot   # Fetch only EcoLogits
    $(basename "$0") --category social   # Fetch only social metrics
    $(basename "$0") --init              # Initialize database

Cron Setup:
    # Weekly collection every Sunday at 3am
    0 3 * * 0 $PROJECT_DIR/scripts/collect-metrics.sh >> /var/log/metrics-collector.log 2>&1

Environment:
    METRICS_DB_PATH    Path to SQLite database (default: ./data/metrics.db)
    LOG_FILE           Path to log file (default: /var/log/metrics-collector.log)
"
}

# Parse arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --init|-i)
        check_deps
        init_db
        exit 0
        ;;
    *)
        check_deps
        install_deps
        init_db 2>/dev/null || true
        run_research "$@"
        ;;
esac
