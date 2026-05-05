const sharp = require('sharp');
const path = require('path');

async function check(file) {
  const filepath = path.join(__dirname, 'public/branding', file);
  const { data, info } = await sharp(filepath).raw().toBuffer({ resolveWithObject: true });
  
  // Top-left pixel
  const r = data[0];
  const g = data[1];
  const b = data[2];
  const a = info.channels === 4 ? data[3] : 255;
  console.log(`${file} background: R:${r} G:${g} B:${b} A:${a}`);
}

check('logo-light.png').then(() => check('logo-dark.png')).catch(console.error);
