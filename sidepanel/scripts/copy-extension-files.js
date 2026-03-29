import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const distDir = path.join(projectRoot, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Create necessary subdirectories
const dirsToCreate = ['icons', 'scripts'];
dirsToCreate.forEach(dir => {
  const dirPath = path.join(distDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Copy manifest.json
const manifestSrc = path.join(projectRoot, 'manifest.json');
const manifestDest = path.join(distDir, 'manifest.json');
fs.copyFileSync(manifestSrc, manifestDest);
console.log('✓ Copied manifest.json');

// Copy icons
const iconsDir = path.join(projectRoot, 'icons');
const iconsDestDir = path.join(distDir, 'icons');
const iconFiles = fs.readdirSync(iconsDir).filter(f => f.endsWith('.png'));
iconFiles.forEach(file => {
  fs.copyFileSync(path.join(iconsDir, file), path.join(iconsDestDir, file));
  console.log(`✓ Copied icon: ${file}`);
});

// Copy background.js
const bgSrc = path.join(projectRoot, 'scripts', 'background.js');
const bgDest = path.join(distDir, 'scripts', 'background.js');
if (fs.existsSync(bgSrc)) {
  fs.copyFileSync(bgSrc, bgDest);
  console.log('✓ Copied background.js');
} else {
  console.warn('⚠ background.js not found');
}

console.log('\n✓ Extension files copied successfully!');
