import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pages = [
  'about.html',
  'contact.html',
  'messages.html',
  'notifications.html',
  'profile.html',
  'services.html',
  'testimonials.html',
  'users.html'
];

const distDir = path.join(__dirname, '..', 'dist');
const srcDir = path.join(__dirname, '..');

// Copy each HTML page to dist
pages.forEach(page => {
  const srcPath = path.join(srcDir, page);
  const distPath = path.join(distDir, page);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, distPath);
    console.log(`Copied ${page} to dist/`);
  } else {
    console.warn(`Warning: ${page} not found in source directory`);
  }
});

// Copy images folder if it exists
const imagesSrc = path.join(srcDir, 'images');
const imagesDist = path.join(distDir, 'images');

if (fs.existsSync(imagesSrc)) {
  if (!fs.existsSync(imagesDist)) {
    fs.mkdirSync(imagesDist, { recursive: true });
  }
  fs.readdirSync(imagesSrc).forEach(file => {
    const srcPath = path.join(imagesSrc, file);
    const distPath = path.join(imagesDist, file);
    fs.copyFileSync(srcPath, distPath);
  });
  console.log('Copied images folder to dist/');
}

// Copy icons folder if it exists
const iconsSrc = path.join(srcDir, 'icons');
const iconsDist = path.join(distDir, 'icons');

if (fs.existsSync(iconsSrc)) {
  if (!fs.existsSync(iconsDist)) {
    fs.mkdirSync(iconsDist, { recursive: true });
  }
  fs.readdirSync(iconsSrc).forEach(file => {
    const srcPath = path.join(iconsSrc, file);
    const distPath = path.join(iconsDist, file);
    fs.copyFileSync(srcPath, distPath);
  });
  console.log('Copied icons folder to dist/');
}

console.log('All pages and assets copied successfully!');
