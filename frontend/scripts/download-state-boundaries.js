/**
 * Script to download and process US state boundaries GeoJSON
 * This script fetches a standard US states GeoJSON file and ensures
 * state codes match our database format (2-letter codes)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// Source: Public GeoJSON file with US state boundaries
// Using a reliable CDN source with 2-letter state codes
const GEOJSON_URL =
  "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json";

// Alternative sources if the above doesn't work:
// - https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json
// - US Census Bureau: https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_us_state_20m.zip

const OUTPUT_DIR = path.join(__dirname, "..", "public", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "us-states.json");

// State name to code mapping (for verification/transformation)
const STATE_CODES = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
};

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading from: ${url}`);

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          fs.writeFileSync(outputPath, data);
          console.log(`✅ Downloaded to: ${outputPath}`);
          resolve(data);
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

function processGeoJSON(geoJSONData) {
  const geoJSON = JSON.parse(geoJSONData);

  console.log(`📊 Processing ${geoJSON.features.length} features...`);

  // Log first feature to see structure
  if (geoJSON.features.length > 0) {
    console.log(
      "Sample feature properties:",
      Object.keys(geoJSON.features[0].properties)
    );
  }

  // Ensure each feature has a 2-letter state code
  geoJSON.features.forEach((feature, index) => {
    const properties = feature.properties;

    // Try to find state code in various property names (case-insensitive)
    let stateCode =
      properties.STUSPS ||
      properties.STATE ||
      properties.STATE_CODE ||
      properties.code ||
      properties.id ||
      properties.abbr ||
      properties.abbrev ||
      properties.NAME ||
      properties.name ||
      properties.STATE_NAME ||
      properties.state;

    // If we have a state name, convert to code
    if (stateCode && stateCode.length > 2) {
      stateCode =
        STATE_CODES[stateCode] || STATE_CODES[stateCode.replace(/\s+/g, " ")];
    }

    // If still no code, try all property values
    if (!stateCode || stateCode.length !== 2) {
      for (const [key, value] of Object.entries(properties)) {
        if (
          typeof value === "string" &&
          value.length === 2 &&
          /^[A-Z]{2}$/.test(value)
        ) {
          stateCode = value;
          break;
        }
        if (typeof value === "string" && STATE_CODES[value]) {
          stateCode = STATE_CODES[value];
          break;
        }
      }
    }

    // Ensure we have a 2-letter code
    if (!stateCode || stateCode.length !== 2) {
      console.warn(
        `⚠️  Feature ${index} missing valid state code. Properties:`,
        Object.keys(properties)
      );
      // Last resort: try to extract from any string property
      for (const value of Object.values(properties)) {
        if (typeof value === "string" && STATE_CODES[value]) {
          stateCode = STATE_CODES[value];
          break;
        }
      }
    }

    // Standardize property to 'STATE_CODE'
    const stateName =
      properties.NAME ||
      properties.name ||
      properties.STATE_NAME ||
      properties.state ||
      Object.values(properties).find(
        (v) => typeof v === "string" && v.length > 2 && STATE_CODES[v]
      ) ||
      "Unknown";

    feature.properties = {
      STATE_CODE: stateCode || "XX",
      NAME:
        typeof stateName === "string" && STATE_CODES[stateName]
          ? stateName
          : stateCode
          ? Object.entries(STATE_CODES).find(
              ([_, code]) => code === stateCode
            )?.[0]
          : "Unknown",
      ...properties,
    };
  });

  const validCodes = geoJSON.features.filter(
    (f) => f.properties.STATE_CODE && f.properties.STATE_CODE !== "XX"
  ).length;
  console.log(
    `✅ Processed ${geoJSON.features.length} features: ${validCodes} with valid state codes`
  );
  return geoJSON;
}

async function main() {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`📁 Created directory: ${OUTPUT_DIR}`);
    }

    // Download GeoJSON
    const rawData = await downloadFile(GEOJSON_URL, OUTPUT_FILE + ".raw");

    // Process and save
    const processed = processGeoJSON(rawData);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(processed, null, 2));

    console.log(`\n✅ Success! GeoJSON saved to: ${OUTPUT_FILE}`);
    console.log(
      `📊 File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`
    );
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Verify state codes match your database`);
    console.log(
      `   2. Test loading in a component: fetch('/data/us-states.json')`
    );
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.log(`\n💡 Alternative: Manually download from:`);
    console.log(
      `   - US Census Bureau: https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_us_state_20m.zip`
    );
    console.log(`   - Or use a GeoJSON converter tool`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { downloadFile, processGeoJSON };
