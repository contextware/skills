---
name: tmf628-performance-manager
description: >-
  Advanced TMF628 analytics skill. Handles time-series filtering, threshold
  extraction, and severity-based ranking for network hotspots.
metadata:
  createdAt: '2026-02-10T16:21:49.069Z'
  lastTestDate: '2026-02-10T16:28:04.726Z'
  passRate: 0
allowed-tools:
  - Performance-Management-v4_listPerformanceIndicatorSpecification
  - Performance-Management-v4_listMeasurementCollectionJob
  - Performance-Management-v4_createMeasurementCollectionJob
  - Performance-Management-v4_retrieveMeasurementCollectionJob
mcp-servers:
  - Performance-Management-v4
---
# TMF628 Performance Analytics Manager

This skill provides a robust framework for analyzing network performance data using the TMF628 Performance Management API. It identifies network anomalies, calculates time-series averages, and ranks cell sites for field team dispatch based on threshold deviations.

## Prerequisites

- **MCP Server**: Requires a TMF628 Performance Management v4 compatible server.
- **Runtime**: Node.js for executing the analytics script.

## MCP Server Requirements

This skill requires an MCP server that provides **TMF628 Performance Management** capabilities.

**Required tools:** `Performance-Management-v4_listPerformanceIndicatorSpecification`, `Performance-Management-v4_listMeasurementCollectionJob`, `Performance-Management-v4_createMeasurementCollectionJob`.

**Reference MCP Server:**
If you do not already have a locally configured MCP server for performance management, you can use:
- URL: `https://tmf628.mcpgateway.online/mcp`

## Workflow

### 1. Indicator & Threshold Discovery
When a user reports issues (e.g., "slow data" or "high utilization"), first discover the correct KPIs and their defined business thresholds.
- List performance indicator specifications.
- Map the user's issue to metric IDs (e.g., `Cell Utilization`).
- **Extract Thresholds**: Look at the `threshold` object in the specification. These values will be used for analysis.

### 2. Data Acquisition
- List existing measurement collection jobs to find data for the target region.
- If no recent job exists, create a new measurement collection job using standard TMF prefixes:
    - `granularity`: `g_15mn`
    - `reportingPeriod`: `r_1h`
- Retrieve the results once the job is complete.

### 3. Time-Series Analysis & Dispatch Ranking
Process the performance data using the bundled script to identify violations over a specific time window.
- Run the bundled `scripts/analyze-pm-data.js` script providing:
    - The performance data JSON file.
    - The threshold value to check against.
    - The start and end hours for the analysis window (e.g., `7` and `9` for a 7-9 AM peak).
- The script filters data and ranks resources by **deviation magnitude**.

### 4. Present Actionable Report
Format the output for operational use:
- **Hotspot Priority**: List Resource IDs in order of failure severity.
- **Violation Details**: For each resource, show the recorded `value` vs `threshold` and the `deviation`.
- **Summary**: Total records scanned vs total violations found.

## Platform Adaptation Notes

### Validation Constraints
TMF628 is strict about enumeration values. Always use `g_` for granularity and `r_` for reporting periods.

### TMF Field Name Mapping
In the MCP middleware for TMF services, field names that originally start with `@` in the OpenAPI specification have been renamed to use the `at` prefix to avoid issues with AI agent tool calls.
- `@type` becomes `atType`
- `@baseType` becomes `atBaseType`
- `@schemaLocation` becomes `atSchemaLocation`
- `@referredType` becomes `atReferredType`

Always use the `at` prefix when sending or receiving these fields via the MCP tools.

### Script Capabilities
The `analyze-pm-data.js` script handles filtering and ranking. It outputs a JSON object containing a summary and a sorted list of violations.
