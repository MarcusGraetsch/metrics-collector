# Metrics Collector

> Automatisiertes System zur Sammlung ökologischer und sozialer Metriken für das Rook Dashboard.

## Überblick

Dieses System sammelt automatisch Daten aus verschiedenen Quellen zu:
- **Ökologischen Impact** (CO₂, Energie, Wasser)
- **Sozialen Metriken** (Arbeitsbedingungen, Datenethik, Kolonialismus-Index)
- **Supply Chain** (Konfliktmineralien, geopolitische Risiken)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Quellen                                  │
│  (RMI, Z2Data, WEF, EcoLogits, DataCentre Mag, TechPolicy)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Research Agent                                │
│  - Fetched Daten von Quellen                                     │
│  - Extrahiert strukturierte Metriken                            │
│  - Validiert und speichert                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      metrics.db                                  │
│  (SQLite - Metriken mit Source-Attribution)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Dashboard                                   │
│  (🌱 Ecology Page - Visualisierung)                             │
└─────────────────────────────────────────────────────────────────┘
```

## Schnellstart

```bash
# Dependencies installieren
npm install

# Datenbank initialisieren
./scripts/collect-metrics.sh --init

# Alle Quellen aktualisieren
./scripts/collect-metrics.sh

# Spezifische Quelle
./scripts/collect-metrics.sh --source eco_liot

# Nach Kategorie
./scripts/collect-metrics.sh --category social
```

## Quellen

### Ökologisch

| Quelle | ID | Beschreibung |
|--------|-----|-------------|
| EcoLogits / LLMemissions | `eco_liot` | CO₂, Energie, Wasser pro Token (basierend auf UC Riverside Studien) |

### Sozial

| Quelle | ID | Beschreibung |
|--------|-----|-------------|
| Data Centre Magazine | `datacentre_mag` | Rechenzentrum-Angriffe, geopolitische Risiken |
| TechPolicy.Press | `techpolicy` | KI-Infrastruktur im Krieg, Militärische Nutzung |

### Supply Chain

| Quelle | ID | Beschreibung |
|--------|-----|-------------|
| Responsible Minerals Initiative | `rmi` | 3TG Mineralien in Lieferketten |
| Z2Data | `z2data` | Smelter/Refiner in Konfliktzonen |
| WEF | `wef` | Kritische Rohstoffe (Gallium, Germanium), Exportbeschränkungen |
| GIZ | `giz` | Konfliktmineralien Afrika (Great Lakes) |
| Fairphone | `fairphone` | Transparente Lieferketten für Kobalt, Kupfer |

## Datenbank

### Schema

```sql
-- Quellen
sources (
  id, name, url, source_type,
  last_fetched, fetch_status, error_message
)

-- Metriken
metrics (
  id, source_id, category, metric_type,
  provider, model_id, value, value_unit,
  confidence, source_url, source_note,
  fetched_at, valid_from, valid_until
)

-- History für Trends
metric_history (
  id, metric_id, snapshot_date, value
)
```

### Kategorien

- `ecological` - Ökologischer Impact (CO₂, Energie, Wasser)
- `social` - Soziale Metriken (Arbeitsbedingungen, Datenethik)
- `supply_chain` - Lieferketten-Risiken (Konfliktmineralien, Geopolitik)

## Cron-Job einrichten

```bash
# Täglich um 3 Uhr
0 3 * * * /root/.openclaw/workspace/engineering/metrics-collector/scripts/collect-metrics.sh >> /var/log/metrics-collector.log 2>&1

# Wöchentlich Sonntag 3 Uhr
0 3 * * 0 /root/.openclaw/workspace/engineering/metrics-collector/scripts/collect-metrics.sh >> /var/log/metrics-collector.log 2>&1
```

## Metrik-Typen

### Ökologisch

| Metrik | Einheit | Beschreibung |
|--------|---------|-------------|
| `co2_per_million_tokens` | gCO₂ | CO₂ Emissionen pro Million Tokens |
| `water_per_million_tokens` | ml | Wasserverbrauch (Kühlung) |
| `energy_per_million_tokens` | kWh | Energieverbrauch |
| `co2_per_kwh` | gCO₂ | CO₂ pro kWh (Grid-abhängig) |

### Sozial

| Metrik | Einheit | Beschreibung |
|--------|---------|-------------|
| `labor_rating` | A-F | Arbeitsbedingungen Bewertung |
| `data_ethics_rating` | A-F | Datenethik Bewertung |
| `colonialism_index` | 0-10 | Kolonialismus-Expositions-Index |
| `infrastructure_incidents` | count | Rechenzentrum-Vorfälle |
| `militarization_index` | rating | KI-Militärisierung |

### Supply Chain

| Metrik | Einheit | Beschreibung |
|--------|---------|-------------|
| `conflict_minerals_risk` | score | Risiko-Score für Konfliktmineralien |
| `conflict_exposure` | % | Anteil an Konfliktzonen-Lieferkette |
| `certification_rate` | % | Zertifizierte Smelter/Refiner |
| `supply_risk_index` | index | Versorgungsrisiko-Index |

## Metriken erweitern

Um neue Quellen oder Metriken hinzuzufügen:

1. **Source Definition** in `src/lib/sources.ts` hinzufügen:
```typescript
'my_source': {
  source: {
    id: 'my_source',
    name: 'My Source Name',
    url: 'https://example.com',
    source_type: 'webpage',
    description: 'Description...',
  },
  metrics: [
    {
      id: 'my_new_metric',
      category: 'social', // oder 'ecological', 'supply_chain'
      metric_type: 'my_metric_type',
      description: 'What this metric measures',
      extraction_hint: 'How to extract from the source',
      expected_format: 'number, percentage, rating...',
    },
  ],
},
```

2. **Extraction Logic** in `src/agents/researcher.ts` implementieren:
```typescript
// In extractMetrics() function
if (metricDef.id === 'my_new_metric') {
  const value = parseDataFromSource(rawData);
  extracted.push({
    metric_id: metricDef.id,
    metric_type: metricDef.metric_type,
    value: value,
    unit: metricDef.expected_format,
    confidence: 'estimated', // oder 'high', 'medium', 'low'
    notes: 'Extracted from my_source'
  });
}
```

3. **Testen**:
```bash
./scripts/collect-metrics.sh --source my_source
```

## Troubleshooting

### Keine Daten gefunden
- Quellen-URL prüfen (noch aktiv?)
- `fetch_status` in DB prüfen
- Log-Datei: `/var/log/metrics-collector.log`

### Daten veraltet
- Cron-Job läuft?
- `last_fetched` in DB prüfen
- Manuell aktualisieren: `./scripts/collect-metrics.sh --all`

### Neue Quelle funktioniert nicht
- `source_type` korrekt? (`api`, `webpage`, `report`, `manual`)
- Fetch-Log prüfen
- Extraction hint prüfen

## Lizenz

Eigenes Projekt - MIT License

## Autoren

Entwickelt für Rook Dashboard System
