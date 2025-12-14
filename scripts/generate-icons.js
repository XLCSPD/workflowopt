/**
 * PWA Icon Generator Script
 * 
 * This script generates PWA icons from the base SVG.
 * Run with: node scripts/generate-icons.js
 * 
 * Prerequisites:
 *   npm install sharp --save-dev
 * 
 * Or use an online tool like:
 *   - https://realfavicongenerator.net/
 *   - https://www.pwabuilder.com/imageGenerator
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.log(`
=== PWA Icon Generation ===

To generate PNG icons from the SVG, you have two options:

Option 1: Install sharp and run this script
  npm install sharp --save-dev
  node scripts/generate-icons.js

Option 2: Use an online tool
  1. Go to https://www.pwabuilder.com/imageGenerator
  2. Upload public/icons/icon.svg
  3. Download the generated icons
  4. Extract to public/icons/

Required icon sizes:
  - icon-192x192.png
  - icon-512x512.png
  - icon-maskable-192x192.png (with padding for safe area)
  - icon-maskable-512x512.png (with padding for safe area)
  - apple-touch-icon.png (180x180)
  - favicon.ico (multiple sizes in one file)
`);
  process.exit(0);
}

const ICONS_DIR = path.join(__dirname, '../public/icons');
const SVG_PATH = path.join(ICONS_DIR, 'icon.svg');

const SIZES = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'icon-maskable-192x192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function generateIcons() {
  console.log('Generating PWA icons...');

  if (!fs.existsSync(SVG_PATH)) {
    console.error('Error: icon.svg not found at', SVG_PATH);
    process.exit(1);
  }

  for (const { name, size, maskable } of SIZES) {
    const outputPath = path.join(ICONS_DIR, name);
    
    try {
      let image = sharp(SVG_PATH).resize(size, size);
      
      // For maskable icons, add padding (10% safe zone)
      if (maskable) {
        const padding = Math.floor(size * 0.1);
        const innerSize = size - (padding * 2);
        
        image = sharp(SVG_PATH)
          .resize(innerSize, innerSize)
          .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 16, g: 42, b: 67, alpha: 1 } // #102A43
          });
      }
      
      await image.png().toFile(outputPath);
      console.log(`  ✓ Generated ${name}`);
    } catch (error) {
      console.error(`  ✗ Failed to generate ${name}:`, error.message);
    }
  }

  console.log('\nDone! Icons saved to public/icons/');
}

generateIcons().catch(console.error);

