/**
 * Verification script for US state boundaries GeoJSON
 * Checks that state codes match database format
 */

const fs = require('fs');
const path = require('path');

const GEOJSON_FILE = path.join(__dirname, '..', 'public', 'data', 'us-states.json');

// Expected state codes (50 states + DC)
const EXPECTED_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

function verifyGeoJSON() {
  try {
    const data = JSON.parse(fs.readFileSync(GEOJSON_FILE, 'utf8'));
    
    console.log('='.repeat(60));
    console.log('US State Boundaries Verification');
    console.log('='.repeat(60));
    console.log();
    
    // Check structure
    if (data.type !== 'FeatureCollection') {
      console.error('❌ Invalid GeoJSON: Expected FeatureCollection');
      return false;
    }
    
    if (!Array.isArray(data.features)) {
      console.error('❌ Invalid GeoJSON: Missing features array');
      return false;
    }
    
    console.log(`📊 Found ${data.features.length} features`);
    console.log();
    
    // Check state codes
    const foundCodes = [];
    const missingCodes = [];
    const invalidFeatures = [];
    
    data.features.forEach((feature, index) => {
      const code = feature.properties?.STATE_CODE;
      
      if (!code || code.length !== 2) {
        invalidFeatures.push({
          index,
          name: feature.properties?.NAME || feature.properties?.name || 'Unknown',
          code: code || 'MISSING'
        });
      } else {
        foundCodes.push(code);
        if (!EXPECTED_CODES.includes(code)) {
          console.warn(`⚠️  Unexpected state code: ${code} (feature ${index})`);
        }
      }
    });
    
    // Report results
    console.log('✅ Valid state codes found:', foundCodes.length);
    console.log('   Codes:', foundCodes.sort().join(', '));
    console.log();
    
    if (invalidFeatures.length > 0) {
      console.log('⚠️  Features with invalid/missing codes:', invalidFeatures.length);
      invalidFeatures.forEach(f => {
        console.log(`   - Feature ${f.index}: ${f.name} (code: ${f.code})`);
      });
      console.log();
    }
    
    // Check coverage
    const missing = EXPECTED_CODES.filter(code => !foundCodes.includes(code));
    if (missing.length > 0) {
      console.log('⚠️  Missing state codes:', missing.join(', '));
      console.log();
    } else {
      console.log('✅ All expected state codes present!');
      console.log();
    }
    
    // File size
    const fileSize = fs.statSync(GEOJSON_FILE).size;
    const fileSizeKB = (fileSize / 1024).toFixed(2);
    console.log(`📦 File size: ${fileSizeKB} KB`);
    
    if (fileSize > 2 * 1024 * 1024) {
      console.warn('⚠️  File is larger than 2MB - consider simplifying');
    } else {
      console.log('✅ File size is reasonable');
    }
    console.log();
    
    // Summary
    console.log('='.repeat(60));
    if (foundCodes.length >= 50 && invalidFeatures.length === 0) {
      console.log('✅ Verification PASSED');
      console.log('   GeoJSON is ready for use in choropleth maps');
    } else {
      console.log('⚠️  Verification completed with warnings');
      console.log('   Review invalid features above');
    }
    console.log('='.repeat(60));
    
    return foundCodes.length >= 50;
    
  } catch (error) {
    console.error('❌ Error reading GeoJSON file:', error.message);
    return false;
  }
}

if (require.main === module) {
  verifyGeoJSON();
}

module.exports = { verifyGeoJSON };

