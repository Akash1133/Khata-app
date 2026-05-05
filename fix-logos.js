const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function makeTransparent(filename, bgR, bgG, bgB, tolerance = 15) {
  const filepath = path.join(__dirname, 'public/branding', filename);
  const { data, info } = await sharp(filepath).raw().toBuffer({ resolveWithObject: true });
  
  // Ensure we output RGBA
  const outData = Buffer.alloc(info.width * info.height * 4);
  
  let pIn = 0;
  let pOut = 0;
  
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[pIn];
    const g = data[pIn + 1];
    const b = data[pIn + 2];
    const a = info.channels === 4 ? data[pIn + 3] : 255;
    
    outData[pOut] = r;
    outData[pOut + 1] = g;
    outData[pOut + 2] = b;
    outData[pOut + 3] = a;
    
    // Check if pixel is close to the background color
    if (Math.abs(r - bgR) <= tolerance && Math.abs(g - bgG) <= tolerance && Math.abs(b - bgB) <= tolerance) {
      outData[pOut + 3] = 0; // Transparent
    }
    
    pIn += info.channels;
    pOut += 4;
  }

  await sharp(outData, {
    raw: { width: info.width, height: info.height, channels: 4 }
  }).png().toFile(filepath + '.new');
  
  fs.renameSync(filepath + '.new', filepath);
  console.log(`Made ${filename} transparent!`);
}

async function run() {
  await makeTransparent('logo-light.png', 255, 255, 255, 5);
  await makeTransparent('logo-dark.png', 15, 23, 42, 20); // slightly higher tolerance to catch anti-aliasing edges
}

run().catch(console.error);
