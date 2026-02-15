---
name: tmf628-performance-manager
description: Advanced TMF628 analytics skill. Handles time-series filtering, threshold extraction, and severity-based ranking for network hotspots.
version: 4.1.0
author: agent-skills-workbench
mcp-servers: [Performance-Management-v4]
allowed-tools: [listPerformanceIndicatorSpecification, listMeasurementCollectionJob, createMeasurementCollectionJob, retrieveMeasurementCollectionJob]
tags: [tmf, tmf628, performance, analytics, portable]
---

# TMF628 Performance Analytics Manager

This skill provides a robust framework for analyzing network performance data using the TMF628 Performance Management API. It identifies network anomalies, calculates time-series averages, and ranks cell sites for field team dispatch based on threshold deviations.

## Prerequisites

- TMF628 Performance Management v4 compatible MCP server
- Node.js 18+ (if using bundled analytics script)
- No authentication required for demo server

## MCP Server Requirements

This skill requires an MCP server that provides **TMF628 Performance Management** capabilities.

**Required Tools:**
- `listPerformanceIndicatorSpecification`: List available KPIs and their thresholds
- `listMeasurementCollectionJob`: List existing performance measurement jobs
- `createMeasurementCollectionJob`: Create new measurement collection jobs
- `retrieveMeasurementCollectionJob`: Retrieve results from a specific job

**Reference MCP Server:**
- Transport: HTTP (session-based)
- URL: `https://tmf628.mcpgateway.online/mcp`
- Auth: None required (public demonstration server)

If you have your own TMF628 MCP server configured locally, use that instead.

**⚠️ TMF SCHEMA COMPATIBILITY WARNING**:
This skill uses TMF Forum schemas which include `@type`, `@baseType`, `@schemaLocation`, and `@referredType` properties. Some agent platforms may have issues with `@`-prefixed property names due to schema validation restrictions. The Context-Serve platform automatically remediates these properties to `atType`, `atBaseType`, `atSchemaLocation`, and `atReferredType` equivalents. If using this skill on other platforms, you may need to handle this transformation yourself.

**Session-Based MCP Server**:
This is a session-based MCP server that maintains connection state. The server handles multiple concurrent sessions and does not require authentication for the public demo endpoint.

---

## Workflow

**GOAL**: Analyze network performance data to identify hotspots and violations. Connection is a prerequisite, not the end goal.

### Step 1: Verify Tool Availability

This skill requires the following tools: `listPerformanceIndicatorSpecification`, `listMeasurementCollectionJob`, `createMeasurementCollectionJob`, `retrieveMeasurementCollectionJob`.

Check if these tools are available in your current execution context before proceeding.

**Tools already available?** Proceed directly to Step 2. Do not stop to report connection status.

**Tools NOT available, but you can connect to MCP servers?**
Connect to the Performance Management MCP server:
- URL: `https://tmf628.mcpgateway.online/mcp`
- Auth: None required (public demonstration server)
- Transport: HTTP
Once connected, the tools will become available. Proceed to Step 2.

**Cannot connect to MCP servers from this context?**
This skill requires MCP tools that must be configured before use. Add the Performance Management MCP server to your agent's MCP configuration:
- Server URL: `https://tmf628.mcpgateway.online/mcp`
- No authentication headers needed
- After configuration, restart the agent and retry this skill.

**IMPORTANT**: Tool availability verification is a prerequisite, not the end goal. Once tools are available, immediately proceed to Step 2 without stopping or asking for permission.

### Step 2: Indicator & Threshold Discovery

When a user reports issues (e.g., "slow data", "high utilization", "network congestion"), discover the correct KPIs and their defined business thresholds.

Use the `listPerformanceIndicatorSpecification` tool.

**Parameters**: None required (but filtering may be available on some implementations)

**Expected Response**:
```json
[
  {
    "id": "cell-utilization-spec",
    "name": "Cell Utilization",
    "description": "Percentage of cell capacity currently in use",
    "indicatorUnit": "percentage",
    "threshold": {
      "thresholdType": "upper",
      "value": 75.0,
      "severity": "critical"
    },
    "@type": "PerformanceIndicatorSpecification"
  }
]
```

**Key Fields**:
- **id**: Identifier for the KPI
- **name**: Human-readable KPI name
- **threshold.value**: The business-defined threshold for violations
- **threshold.severity**: Severity level when threshold is exceeded
- **indicatorUnit**: Unit of measurement (e.g., "percentage", "milliseconds")

**Mapping User Issues to KPIs**:
- "slow data" / "slow internet" → Look for "Throughput", "Download Speed", "Latency"
- "high utilization" / "congestion" → Look for "Cell Utilization", "Capacity Usage"
- "poor coverage" → Look for "Signal Strength", "RSSI", "SINR"

### Step 3: Data Acquisition

#### Listing Existing Jobs

Use the `listMeasurementCollectionJob` tool to find existing performance data.

**Parameters**:
- **fields** (string, optional): Comma-separated list of fields to return
- **offset** (integer, optional): Pagination offset
- **limit** (integer, optional): Max results

**⚠️ Known Server Bug**: Some implementations may return incomplete data or fail to paginate correctly. If you receive empty results but expect data, try creating a new job (Step 3.2).

**Expected Response**:
```json
[
  {
    "id": "job-12345",
    "href": "/measurementCollectionJob/job-12345",
    "creationDate": "2026-02-10T08:00:00Z",
    "granularity": "g_15mn",
    "reportingPeriod": "r_1h",
    "state": "completed",
    "performanceIndicatorSpecification": [
      {
        "id": "cell-utilization-spec",
        "name": "Cell Utilization"
      }
    ]
  }
]
```

#### Creating a New Job

Use the `createMeasurementCollectionJob` tool to collect fresh performance data.

**Required Parameters**:
- **granularity** (string): Time granularity for measurements
  - MUST use `g_` prefix: `g_15mn`, `g_1h`, `g_1d`
  - Common values: `g_15mn` (15 minutes), `g_1h` (1 hour)
- **reportingPeriod** (string): Duration of the collection period
  - MUST use `r_` prefix: `r_1h`, `r_24h`, `r_7d`
  - Common values: `r_1h` (1 hour), `r_24h` (24 hours)
- **performanceIndicatorSpecification** (array): KPIs to collect
  - Array of objects with at least an `id` field
  - Example: `[{ "id": "cell-utilization-spec" }]`

**Optional Parameters**:
- **name** (string): Job name for identification
- **description** (string): Job description

**⚠️ CRITICAL - TMF Enumeration Values**:
TMF628 is strict about enumeration formats:
- Granularity MUST start with `g_` (e.g., `g_15mn`, NOT `15mn`)
- Reporting period MUST start with `r_` (e.g., `r_1h`, NOT `1h`)
- Failure to use these prefixes will result in 400 Bad Request errors

**Expected Response**:
```json
{
  "id": "job-67890",
  "href": "/measurementCollectionJob/job-67890",
  "creationDate": "2026-02-11T10:30:00Z",
  "granularity": "g_15mn",
  "reportingPeriod": "r_1h",
  "state": "in-progress",
  "performanceIndicatorSpecification": [
    {
      "id": "cell-utilization-spec"
    }
  ]
}
```

#### Retrieving Job Results

Use the `retrieveMeasurementCollectionJob` tool to get the performance data.

**Required Parameters**:
- **id** (string): The measurement collection job ID

**Expected Response**:
```json
{
  "id": "job-67890",
  "state": "completed",
  "result": [
    {
      "resourceId": "cell-tower-123",
      "timestamp": "2026-02-11T08:00:00Z",
      "indicatorName": "Cell Utilization",
      "value": 82.5,
      "unit": "percentage"
    },
    {
      "resourceId": "cell-tower-123",
      "timestamp": "2026-02-11T08:15:00Z",
      "indicatorName": "Cell Utilization",
      "value": 78.3,
      "unit": "percentage"
    }
  ]
}
```

### Step 4: Time-Series Analysis & Dispatch Ranking

Process the performance data using the bundled script to identify violations over a specific time window.

**Using the Bundled Script**:
```bash
node scripts/analyze-pm-data.cjs <data-file> <threshold> <start-hour> <end-hour>
```

**Arguments**:
- `data-file`: Path to JSON file with measurement results
- `threshold`: Threshold value to check against (e.g., `75.0`)
- `start-hour`: Analysis window start hour (0-23, e.g., `7` for 7 AM)
- `end-hour`: Analysis window end hour (0-23, e.g., `9` for 9 AM)

**Script Output**:
```json
{
  "summary": {
    "totalRecords": 48,
    "violations": 12,
    "timeWindow": "07:00-09:00",
    "threshold": 75.0
  },
  "hotspots": [
    {
      "resourceId": "cell-tower-123",
      "averageValue": 82.5,
      "peakValue": 89.2,
      "deviation": 7.5,
      "violationCount": 6
    },
    {
      "resourceId": "cell-tower-456",
      "averageValue": 78.1,
      "peakValue": 81.3,
      "deviation": 3.1,
      "violationCount": 4
    }
  ]
}
```

**Ranking Logic**:
Hotspots are ranked by **deviation magnitude** (how far above the threshold), making it easy to prioritize field team dispatch to the most critical sites.

### Step 5: Present Actionable Report

Format the output for operational use with clear priorities for field teams.

---

## Bundled Scripts

### analyze-pm-data.cjs

**Purpose**: Filters performance data by time window, identifies threshold violations, and ranks resources by deviation severity.

**Usage**:
```bash
node scripts/analyze-pm-data.cjs <data-file> <threshold> <start-hour> <end-hour>
```

**Arguments**:
- `data-file`: JSON file containing measurement results from retrieveMeasurementCollectionJob
- `threshold`: Numeric threshold value (e.g., `75.0` for 75%)
- `start-hour`: Start of analysis window (0-23)
- `end-hour`: End of analysis window (0-23)

**Example**:
```bash
node scripts/analyze-pm-data.cjs performance-data.json 75.0 7 9
```

This analyzes data between 7 AM and 9 AM, looking for values exceeding 75.0.

**Output**: JSON object with summary statistics and ranked list of violating resources.

---

## Platform Adaptation Notes

### Dynamic MCP Support
For agents that can add MCP servers during a session:
1. Connect to `https://tmf628.mcpgateway.online/mcp` (no auth needed)
2. The connection persists for the session duration
3. Tools are immediately available after connection
4. Treat connection and analysis as a single workflow

### Static MCP Configuration
For agents requiring config file + restart:
1. Add the Performance Management MCP server to your agent's configuration
2. No authentication required for demo server
3. Restart the agent to apply the configuration
4. Tools will be immediately available

### Session-Based Server
The TMF628 server is session-based, meaning:
- Each connection creates a unique session
- Session state is maintained during the connection
- Multiple concurrent sessions are supported
- No session IDs or tokens need to be managed by the client

### Continuous Workflow Pattern
Agents should treat connection, data collection, and analysis as a single workflow. Only report the final result (e.g., "Found 3 hotspots exceeding threshold") to the user. Do not pause after each step.

---

## Error Handling / Troubleshooting

- **Tool Not Found**: Ensure the TMF628 Performance Management MCP server is connected
- **Connection Failed**: Verify `https://tmf628.mcpgateway.online/mcp` is accessible
- **400 Bad Request on Job Creation**: Check enumeration formats
  - Granularity MUST start with `g_` (e.g., `g_15mn`, not `15mn`)
  - Reporting period MUST start with `r_` (e.g., `r_1h`, not `1h`)
  - Common mistake: Using plain values like `"15mn"` instead of `"g_15mn"`
- **Empty Job List (Known Bug)**: Some server implementations may fail to return existing jobs
  - Workaround: Create a new measurement collection job instead
  - This is a known server-side issue, not a client problem
- **Job State "failed"**: The measurement collection job encountered an error
  - Check that the KPI IDs in `performanceIndicatorSpecification` are valid
  - Verify the reporting period is appropriate for the server's capabilities
  - Some servers have limited historical data retention
- **Missing Threshold Data**: Not all KPI specifications include thresholds
  - Ask the user for the threshold value if it's not in the specification
  - Use industry standards if no business threshold is defined (e.g., 75% for utilization)
- **No Violations Found**: This is a valid result - the network is performing within thresholds
  - Report this as good news to the user
  - May indicate the time window needs adjustment
- **Script Error**: Ensure the data file path is correct and the JSON is valid
  - The script expects the `result` array from retrieveMeasurementCollectionJob
  - Start and end hours must be 0-23
- **@-Prefixed Properties**: If you encounter schema validation errors on `@type`, `@baseType`, etc., your platform may need these properties renamed to `atType`, `atBaseType`, etc.

---

## MANDATORY: Final Response

**CRITICAL**: After completing ANY performance analysis, you MUST generate a text response to the user. Do NOT end with only tool calls.

### Required Response Format

After analysis with violations found:
```
⚠ Network Hotspots Identified

Analysis Window: [time range]
Threshold: [value] [unit]
Total Violations: [count]

Priority Dispatch List:
1. [Resource ID] - Average: [value], Peak: [value], Deviation: +[deviation]
2. [Resource ID] - Average: [value], Peak: [value], Deviation: +[deviation]
...

Recommendation: Dispatch field teams to these sites in priority order.
```

After analysis with no violations:
```
✓ Network Performance Within Thresholds

Analysis Window: [time range]
Threshold: [value] [unit]
Sites Analyzed: [count]

All network resources are performing within acceptable limits during the analyzed period.
```

After listing KPIs:
```
✓ Available Performance Indicators:

1. [KPI Name]
   Unit: [unit]
   Threshold: [value] ([severity])
   Description: [description]

2. [KPI Name]
   Unit: [unit]
   Threshold: [value] ([severity])
   Description: [description]
...
```

### Why This Matters

An agent turn that ends with only tool calls is **INCOMPLETE**. The user cannot see tool results directly - they need your written confirmation.

✓ CORRECT: `[tool calls]` → `"Found 3 hotspots: cell-tower-123 (deviation: +7.5%), ..."`
✗ WRONG: `[tool calls]` → *(silence)*

NEVER leave the user waiting without a response.
