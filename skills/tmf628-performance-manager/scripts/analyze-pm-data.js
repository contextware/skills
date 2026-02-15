const fs = require('fs');

/**
 * Script to analyze TMF628 Performance Data.
 * Filters by time window and threshold.
 * Input: JSON file with measurements, threshold value, start hour, end hour.
 * Output: JSON summary of violations ranked by deviation.
 */
function analyzePMData() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error('Usage: node analyze-pm-data.js <data_file> <threshold_value> <start_hour> <end_hour>');
        process.exit(1);
    }

    const [dataFile, threshold, startHour, endHour] = args;
    const thresholdVal = parseFloat(threshold);
    const hStart = parseInt(startHour);
    const hEnd = parseInt(endHour);

    let rawData;
    try {
        rawData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    } catch (e) {
        console.error(JSON.stringify({ error: `Error reading data file: ${e.message}` }));
        process.exit(1);
    }

    const results = [];
    const measurements = rawData.measurements || [];

    measurements.forEach(m => {
        const date = new Date(m.timestamp);
        const hour = date.getUTCHours();
        
        // Filter by peak window (UTC)
        if (hour >= hStart && hour < hEnd) {
            if (m.value > thresholdVal) {
                results.push({
                    resourceId: m.resourceId,
                    timestamp: m.timestamp,
                    value: m.value,
                    deviation: parseFloat((m.value - thresholdVal).toFixed(2))
                });
            }
        }
    });

    // Rank by deviation magnitude (highest first)
    results.sort((a, b) => b.deviation - a.deviation);

    console.log(JSON.stringify({
        summary: {
            totalAnalyzed: measurements.length,
            violationsFound: results.length,
            thresholdUsed: thresholdVal,
            peakWindow: `${hStart}:00 - ${hEnd}:00 UTC`
        },
        violations: results
    }, null, 2));
}

analyzePMData();
