/**
 * Source Definitions
 * 
 * Defines what metrics we want to extract from each source.
 * Each source has:
 * - id: Unique identifier
 * - name: Display name
 * - url: Base URL for fetching
 * - source_type: How we access it
 * - metrics: What we want to extract
 * 
 * Sources are categorized by what they provide:
 * - ecological: CO2, energy, water metrics
 * - social: Labor practices, data ethics, colonialism
 * - supply_chain: Conflict minerals, geopolitics
 */

import { Source } from '../db/schema';

// Source definitions - what data we want from each source
export const SOURCE_DEFINITIONS: Record<string, {
  source: Omit<Source, 'last_fetched' | 'fetch_status' | 'error_message' | 'created_at' | 'updated_at'>;
  metrics: {
    id: string;
    category: 'ecological' | 'social' | 'supply_chain';
    metric_type: string;
    description: string;
    extraction_hint: string; // How to extract from this source
    expected_format?: string; // e.g., 'number', 'percentage', 'rating'
  }[];
}> = {
  'rmi': {
    source: {
      id: 'rmi',
      name: 'Responsible Minerals Initiative',
      url: 'https://www.responsiblemineralsinitiative.org',
      source_type: 'webpage',
      description: 'Tracking 3TG (Tantalum, Tin, Tungsten, Gold) and other minerals in electronics supply chains. Provides data on smelters, refiners, and conflict-affected areas.',
    },
    metrics: [
      {
        id: 'conflict_minerals_risk_score',
        category: 'supply_chain',
        metric_type: 'conflict_minerals_risk',
        description: 'Risk score for mineral sourcing in conflict zones',
        extraction_hint: 'Look for RMI Risk Readiness Assessment scores or conflict mineral reports',
        expected_format: 'number (0-100)',
      },
      {
        id: 'smelter_certification_rate',
        category: 'supply_chain',
        metric_type: 'certification_rate',
        description: 'Percentage of certified smelters/refiners',
        extraction_hint: 'Check RMI audit reports for certification percentages',
        expected_format: 'percentage',
      },
    ],
  },
  
  'z2data': {
    source: {
      id: 'z2data',
      name: 'Z2Data Conflict Minerals Insights',
      url: 'https://www.z2data.com',
      source_type: 'webpage',
      description: 'Connects electronic components supply chain with conflict zones. Tracks smelters and refiners linked to conflict regions.',
    },
    metrics: [
      {
        id: 'conflict_linked_smelters',
        category: 'supply_chain',
        metric_type: 'conflict_exposure',
        description: 'Number or percentage of smelters linked to conflict zones',
        extraction_hint: 'Search for conflict minerals dashboard or risk heatmap',
        expected_format: 'number or percentage',
      },
    ],
  },
  
  'wef': {
    source: {
      id: 'wef',
      name: 'World Economic Forum',
      url: 'https://www.weforum.org',
      source_type: 'webpage',
      description: 'Reports on critical raw materials (gallium, germanium), export restrictions, and supply chain vulnerabilities.',
    },
    metrics: [
      {
        id: 'critical_minerals_supply_risk',
        category: 'supply_chain',
        metric_type: 'supply_risk_index',
        description: 'Supply risk index for critical minerals used in AI hardware',
        extraction_hint: 'Look for WEF Global Risks Report or critical minerals assessment',
        expected_format: 'index or rating',
      },
      {
        id: 'export_restriction_impact',
        category: 'supply_chain',
        metric_type: 'export_restriction_impact',
        description: 'Impact of export restrictions (China gallium/germanium) on AI hardware',
        extraction_hint: 'Search for export control news and supply chain impact analysis',
        expected_format: 'qualitative or percentage',
      },
    ],
  },
  
  'datacentre_magazine': {
    source: {
      id: 'datacentre_mag',
      name: 'Data Centre Magazine / DC Byte',
      url: 'https://www.datacentremagazine.com',
      source_type: 'webpage',
      description: 'Coverage of data center vulnerabilities, attacks on AI infrastructure, and geopolitical risks.',
    },
    metrics: [
      {
        id: 'data_center_incidents',
        category: 'social',
        metric_type: 'infrastructure_incidents',
        description: 'Number or severity of data center attacks/disruptions',
        extraction_hint: 'Search for data center attacks, drone strikes on AWS/Azure facilities',
        expected_format: 'count or severity rating',
      },
    ],
  },
  
  'techpolicy': {
    source: {
      id: 'techpolicy',
      name: 'TechPolicy.Press',
      url: 'https://techpolicy.press',
      source_type: 'webpage',
      description: 'Analysis of drone attacks on AI infrastructure and role of hyperscalers in armed conflicts.',
    },
    metrics: [
      {
        id: 'ai_infrastructure_militarization',
        category: 'social',
        metric_type: 'militarization_index',
        description: 'Level of AI infrastructure involvement in military conflicts',
        extraction_hint: 'Search for drone attacks on AI data centers, hypersealer complicity',
        expected_format: 'qualitative assessment',
      },
    ],
  },
  
  'giz': {
    source: {
      id: 'giz',
      name: 'GIZ - Konfliktfreie Rohstoffe',
      url: 'https://www.giz.de/de/konfliktfreie-rohstoffe',
      source_type: 'webpage',
      description: 'German development agency coverage of conflict minerals from Great Lakes region Africa.',
    },
    metrics: [
      {
        id: 'african_conflict_minerals_exposure',
        category: 'supply_chain',
        metric_type: 'conflict_exposure_africa',
        description: 'Exposure of AI hardware supply chain to African conflict minerals',
        extraction_hint: 'Look for GIZ reports on responsible sourcing from Great Lakes region',
        expected_format: 'qualitative or percentage',
      },
    ],
  },
  
  'eco_liot': {
    source: {
      id: 'eco_liot',
      name: 'EcoLogits / LLMemissions.com',
      url: 'https://llmemissions.com',
      source_type: 'webpage',
      description: 'LLM carbon footprint calculator based on scientific studies (UC Riverside). Estimates CO2 and water per token.',
    },
    metrics: [
      {
        id: 'co2_per_token_by_model',
        category: 'ecological',
        metric_type: 'co2_per_million_tokens',
        description: 'CO2 emissions per million tokens by model',
        extraction_hint: 'Use their calculator or published figures for GPT-4, Claude, etc.',
        expected_format: 'gCO2 per 1M tokens',
      },
      {
        id: 'water_per_token_by_model',
        category: 'ecological',
        metric_type: 'water_per_million_tokens',
        description: 'Water consumption per million tokens (cooling)',
        extraction_hint: 'Look for water footprint data from LLMemissions.com',
        expected_format: 'ml per 1M tokens',
      },
      {
        id: 'energy_per_token_by_model',
        category: 'ecological',
        metric_type: 'energy_per_million_tokens',
        description: 'Energy consumption per million tokens',
        extraction_hint: 'Energy per token data from EcoLogits benchmarks',
        expected_format: 'kWh per 1M tokens',
      },
    ],
  },
  
  'fairphone': {
    source: {
      id: 'fairphone',
      name: 'Fairphone - Fair Materials Sourcing',
      url: 'https://www.fairphone.com/en/our-impact/materials',
      source_type: 'webpage',
      description: 'Transparency on conflict minerals (cobalt, copper) in electronics supply chain. Good proxy for general hardware supply chain issues.',
    },
    metrics: [
      {
        id: 'conflict_minerals_transparency',
        category: 'supply_chain',
        metric_type: 'transparency_score',
        description: 'Transparency score for conflict mineral tracking',
        extraction_hint: 'Fairphone reports on cobalt and copper sourcing transparency',
        expected_format: 'qualitative or score',
      },
    ],
  },
};

// Get all source IDs
export function getAllSourceIds(): string[] {
  return Object.keys(SOURCE_DEFINITIONS);
}

// Get source definition
export function getSourceDefinition(sourceId: string) {
  return SOURCE_DEFINITIONS[sourceId];
}

// Get all metrics for a source
export function getMetricsForSource(sourceId: string) {
  const def = SOURCE_DEFINITIONS[sourceId];
  return def?.metrics || [];
}
