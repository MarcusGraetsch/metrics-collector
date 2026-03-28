/**
 * Metrics Research Agent
 * 
 * This agent is responsible for:
 * 1. Fetching data from defined sources
 * 2. Extracting structured metrics from raw data
 * 3. Validating and storing metrics
 * 
 * Usage:
 *   npx ts-node src/agents/researcher.ts [--source rm] [--category ecological]
 * 
 * The agent will:
 * - Accept a source ID or "all" as argument
 * - Fetch the latest data from that source
 * - Extract metrics according to the source definition
 * - Store in metrics.db with proper attribution
 */

import { getSources, updateSourceStatus, getDb, Metric } from '../db/schema';
import { SOURCE_DEFINITIONS, getMetricsForSource } from '../lib/sources';
import { randomUUID } from 'crypto';

interface ResearchResult {
  source_id: string;
  source_name: string;
  metrics_extracted: number;
  errors: string[];
  data_points: {
    metric_id: string;
    metric_type: string;
    value: number;
    unit: string;
    confidence: string;
    notes: string;
  }[];
}

// ================== Data Fetching ==================

/**
 * Fetch data from a source
 * 
 * This is a placeholder - in production, you'd implement actual fetching
 * based on source_type (API, webpage, etc.)
 */
async function fetchSourceData(sourceId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const sourceDef = SOURCE_DEFINITIONS[sourceId];
  
  if (!sourceDef) {
    return { success: false, error: `Unknown source: ${sourceId}` };
  }
  
  try {
    // For web sources, we'd use web_fetch
    // For APIs, we'd use the appropriate API client
    // For now, this is a stub that returns structured data based on known values
    
    // In production, implement actual fetching here
    console.log(`Fetching data from ${sourceDef.source.name} (${sourceDef.source.url})`);
    
    // Placeholder - return success without actual data fetch
    // Real implementation would call web APIs or scrape web pages
    return { success: true, data: null };
    
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ================== Metric Extraction ==================

/**
 * Extract metrics from fetched data
 * 
 * This parses the raw data and extracts structured metrics
 * according to the source definition.
 */
function extractMetrics(sourceId: string, rawData: any): {
  metrics: ResearchResult['data_points'];
  errors: string[];
} {
  const sourceMetrics = getMetricsForSource(sourceId);
  const extracted: ResearchResult['data_points'] = [];
  const errors: string[] = [];
  
  for (const metricDef of sourceMetrics) {
    try {
      // This is where you'd parse the actual data
      // For now, we document what we'd extract if we had data
      
      // Example extraction logic (pseudo-code):
      // const value = rawData[metricDef.metric_type] 
      // if (value !== undefined) {
      //   extracted.push({
      //     metric_id: metricDef.id,
      //     metric_type: metricDef.metric_type,
      //     value: parseFloat(value),
      //     unit: metricDef.expected_format,
      //     confidence: 'estimated',
      //     notes: `Extracted from ${sourceId}`
      //   });
      // }
      
      console.log(`  Would extract: ${metricDef.metric_type} (${metricDef.description})`);
      
    } catch (error: any) {
      errors.push(`Error extracting ${metricDef.metric_type}: ${error.message}`);
    }
  }
  
  return { metrics: extracted, errors };
}

// ================== Storage ==================

/**
 * Store extracted metrics in the database
 */
function storeMetrics(
  sourceId: string,
  dataPoints: ResearchResult['data_points']
): number {
  const db = getDb();
  let stored = 0;
  
  const now = new Date().toISOString();
  
  for (const point of dataPoints) {
    try {
      const id = randomUUID();
      
      db.prepare(`
        INSERT INTO metrics (
          id, source_id, category, metric_type, 
          value, value_unit, confidence,
          source_note, fetched_at, valid_from
        ) VALUES (?, ?, (
          SELECT category FROM (
            SELECT category FROM metrics WHERE metric_type = ? LIMIT 1
          )
        ), ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        sourceId,
        point.metric_type,
        point.value,
        point.unit,
        point.confidence,
        point.notes,
        now,
        now
      );
      
      stored++;
    } catch (error: any) {
      console.error(`Error storing metric ${point.metric_id}: ${error.message}`);
    }
  }
  
  return stored;
}

// ================== Main Research Loop ==================

/**
 * Run research for a specific source or all sources
 */
export async function runResearch(
  sourceId?: string,
  category?: string
): Promise<ResearchResult[]> {
  const results: ResearchResult[] = [];
  
  // Determine which sources to research
  const sourceIds = sourceId && sourceId !== 'all'
    ? [sourceId]
    : Object.keys(SOURCE_DEFINITIONS);
  
  for (const srcId of sourceIds) {
    const sourceDef = SOURCE_DEFINITIONS[srcId];
    
    if (!sourceDef) {
      console.error(`Unknown source: ${srcId}`);
      continue;
    }
    
    // Filter by category if specified
    if (category) {
      const hasCategory = sourceDef.metrics.some(m => m.category === category);
      if (!hasCategory) continue;
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Research: ${sourceDef.source.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`URL: ${sourceDef.source.url}`);
    console.log(`Description: ${sourceDef.source.description}`);
    console.log(`Metrics to extract: ${sourceDef.metrics.length}`);
    
    const result: ResearchResult = {
      source_id: srcId,
      source_name: sourceDef.source.name,
      metrics_extracted: 0,
      errors: [],
      data_points: [],
    };
    
    // Step 1: Fetch data
    console.log(`\n[1/3] Fetching data...`);
    const fetchResult = await fetchSourceData(srcId);
    
    if (!fetchResult.success) {
      console.error(`Fetch failed: ${fetchResult.error}`);
      updateSourceStatus(srcId, 'failed', fetchResult.error);
      result.errors.push(`Fetch error: ${fetchResult.error}`);
      results.push(result);
      continue;
    }
    
    // Step 2: Extract metrics
    console.log(`[2/3] Extracting metrics...`);
    const extractResult = extractMetrics(srcId, fetchResult.data);
    result.errors.push(...extractResult.errors);
    result.data_points = extractResult.metrics;
    
    // Step 3: Store metrics
    console.log(`[3/3] Storing metrics...`);
    if (extractResult.metrics.length > 0) {
      const stored = storeMetrics(srcId, extractResult.metrics);
      result.metrics_extracted = stored;
      console.log(`Stored ${stored} metrics`);
    }
    
    updateSourceStatus(srcId, 'success');
    results.push(result);
  }
  
  return results;
}

// ================== CLI ==================

async function main() {
  const args = process.argv.slice(2);
  
  let sourceId: string | undefined;
  let category: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      sourceId = args[i + 1];
      i++;
    } else if (args[i] === '--category' && args[i + 1]) {
      category = args[i + 1];
      i++;
    }
  }
  
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           Metrics Research Agent                                   ║
║           Ecological & Social Impact Data Collection               ║
╚══════════════════════════════════════════════════════════════════╝
  `);
  
  const startTime = Date.now();
  const results = await runResearch(sourceId, category);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                      Research Complete                            ║
╠══════════════════════════════════════════════════════════════════╣`);
  
  let totalMetrics = 0;
  for (const result of results) {
    console.log(`║ ${result.source_name}`);
    console.log(`║   Extracted: ${result.metrics_extracted} metrics`);
    if (result.errors.length > 0) {
      console.log(`║   Errors: ${result.errors.length}`);
    }
    totalMetrics += result.metrics_extracted;
  }
  
  console.log(`╠══════════════════════════════════════════════════════════════════╣`);
  console.log(`║ Total: ${totalMetrics} metrics extracted in ${duration}s`);
  console.log(`╚══════════════════════════════════════════════════════════════════╝`);
}

main().catch(console.error);
