/**
 * Metrics Database Schema
 * 
 * Stores ecological and social metrics extracted from research sources.
 * Each data point is traceable to its source with timestamp.
 * 
 * Tables:
 * - metrics: Raw metric values with source attribution
 * - sources: Source definitions and last-fetch timestamps
 * - history: Historical metric snapshots for trend analysis
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.METRICS_DB_PATH || path.join(process.cwd(), 'data', 'metrics.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema() {
  const database = db!;
  
  database.exec(`
    -- Source definitions and metadata
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      source_type TEXT NOT NULL, -- 'api', 'webpage', 'report', 'manual'
      description TEXT,
      last_fetched TEXT, -- ISO timestamp
      fetch_status TEXT, -- 'success', 'failed', 'pending'
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Raw metrics extracted from sources
    CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      category TEXT NOT NULL, -- 'ecological', 'social', 'economic'
      metric_type TEXT NOT NULL, -- e.g., 'co2_per_token', 'labor_rating', 'conflict_minerals'
      provider TEXT, -- e.g., 'OpenAI', 'Anthropic', 'MiniMax'
      model_id TEXT, -- e.g., 'gpt-4', 'claude-3-5-sonnet'
      value REAL NOT NULL,
      value_unit TEXT NOT NULL, -- e.g., 'gCO2', 'kWh', 'rating', 'index'
      confidence TEXT, -- 'high', 'medium', 'low', 'estimated'
      source_url TEXT, -- Direct URL to data point
      source_note TEXT, -- Additional context from source
      fetched_at TEXT NOT NULL, -- When we fetched this data
      valid_from TEXT NOT NULL, -- Data valid from date
      valid_until TEXT, -- Data valid until (NULL = unknown)
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (source_id) REFERENCES sources(id)
    );

    -- Historical snapshots for trend analysis
    CREATE TABLE IF NOT EXISTS metric_history (
      id TEXT PRIMARY KEY,
      metric_id TEXT NOT NULL,
      snapshot_date TEXT NOT NULL, -- Date this snapshot was taken
      value REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (metric_id) REFERENCES metrics(id)
    );

    -- Indexes for efficient queries
    CREATE INDEX IF NOT EXISTS idx_metrics_category ON metrics(category);
    CREATE INDEX IF NOT EXISTS idx_metrics_provider ON metrics(provider);
    CREATE INDEX IF NOT EXISTS idx_metrics_model ON metrics(model_id);
    CREATE INDEX IF NOT EXISTS idx_metrics_fetched ON metrics(fetched_at);
    CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(source_type);
  `);
}

// ================== Types ==================

export interface Source {
  id: string;
  name: string;
  url: string;
  source_type: 'api' | 'webpage' | 'report' | 'manual';
  description?: string;
  last_fetched?: string;
  fetch_status?: 'success' | 'failed' | 'pending';
  error_message?: string;
}

export interface Metric {
  id: string;
  source_id: string;
  category: 'ecological' | 'social' | 'economic';
  metric_type: string;
  provider?: string;
  model_id?: string;
  value: number;
  value_unit: string;
  confidence: 'high' | 'medium' | 'low' | 'estimated';
  source_url?: string;
  source_note?: string;
  fetched_at: string;
  valid_from: string;
  valid_until?: string;
}

export interface MetricHistory {
  id: string;
  metric_id: string;
  snapshot_date: string;
  value: number;
}

// ================== Queries ==================

/**
 * Get the latest metric value for a given type, provider, and model
 */
export function getLatestMetric(
  category: string,
  metricType: string,
  provider?: string,
  modelId?: string
): Metric | null {
  const db = getDb();
  
  let query = `
    SELECT * FROM metrics 
    WHERE category = ? AND metric_type = ?
  `;
  const params: any[] = [category, metricType];
  
  if (provider) {
    query += ` AND provider = ?`;
    params.push(provider);
  }
  if (modelId) {
    query += ` AND model_id = ?`;
    params.push(modelId);
  }
  
  query += ` ORDER BY fetched_at DESC LIMIT 1`;
  
  return db.prepare(query).get(...params) as Metric | null;
}

/**
 * Get all latest metrics for a category
 */
export function getLatestMetricsByCategory(category: string): Metric[] {
  const db = getDb();
  
  const query = `
    SELECT * FROM metrics 
    WHERE category = ?
    ORDER BY provider, model_id, metric_type
  `;
  
  return db.prepare(query).all(category) as Metric[];
}

/**
 * Get metric history for trend analysis
 */
export function getMetricHistory(
  metricId: string,
  days: number = 30
): MetricHistory[] {
  const db = getDb();
  
  const query = `
    SELECT * FROM metric_history
    WHERE metric_id = ?
    AND snapshot_date >= date('now', '-' || ? || ' days')
    ORDER BY snapshot_date DESC
  `;
  
  return db.prepare(query).all(metricId, days) as MetricHistory[];
}

/**
 * Get all sources
 */
export function getSources(): Source[] {
  const db = getDb();
  return db.prepare('SELECT * FROM sources ORDER BY name').all() as Source[];
}

/**
 * Update source fetch status
 */
export function updateSourceStatus(
  sourceId: string,
  status: 'success' | 'failed' | 'pending',
  errorMessage?: string
) {
  const db = getDb();
  
  db.prepare(`
    UPDATE sources 
    SET fetch_status = ?, 
        error_message = ?,
        last_fetched = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(status, errorMessage || null, sourceId);
}
