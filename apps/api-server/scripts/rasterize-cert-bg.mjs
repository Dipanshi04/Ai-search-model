import puppeteer from 'puppeteer';
import sharp from 'sharp';
import fs from 'fs';
import { fileURLToPath } from 'url';

const SCALE = 2; // 2x for crisp print quality
const W = 1684, H = 1191;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: SCALE });
await page.goto('http://localhost:8899/isa_certificate.svg', { waitUntil: 'networkidle0' });
const pngBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
await browser.close();

const outPath = fileURLToPath(new URL('../assets/certificate-bg.jpg', import.meta.url));
await sharp(pngBuffer).jpeg({ quality: 85 }).toFile(outPath);
const stats = fs.statSync(outPath);
console.log('Saved certificate-bg.jpg:', (stats.size / 1024).toFixed(0), 'KB');
