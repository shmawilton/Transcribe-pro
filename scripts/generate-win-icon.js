/**
 * Generates a 256x256 Windows .ico from public/logo.png.
 * electron-builder requires the Windows icon to be at least 256x256.
 * Run: node scripts/generate-win-icon.js
 */
const path = require('path');
const fs = require('fs');

async function main() {
  let sharp;
  let pngToIco;
  try {
    sharp = require('sharp');
    pngToIco = (await import('png-to-ico')).default;
  } catch (e) {
    console.error('Missing dependencies. Run: npm install --save-dev sharp png-to-ico');
    process.exit(1);
  }

  const projectRoot = path.resolve(__dirname, '..');
  const pngPath = path.join(projectRoot, 'public', 'logo.png');
  const icoPath = path.join(projectRoot, 'public', 'logo.ico');

  if (!fs.existsSync(pngPath)) {
    console.error('public/logo.png not found');
    process.exit(1);
  }

  const tempPath = path.join(projectRoot, 'public', 'logo-256-temp.png');
  try {
    // Resize to 256x256 (required by electron-builder for Windows)
    await sharp(pngPath)
      .resize(256, 256)
      .png()
      .toFile(tempPath);

    const icoBuffer = await pngToIco(tempPath);
    fs.writeFileSync(icoPath, icoBuffer);
    fs.unlinkSync(tempPath);
    console.log('Generated public/logo.ico (256x256)');
  } catch (err) {
    if (fs.existsSync(tempPath)) try { fs.unlinkSync(tempPath); } catch (_) {}
    console.error('Failed to generate icon:', err.message);
    process.exit(1);
  }
}

main();
