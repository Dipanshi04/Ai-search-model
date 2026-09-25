import { Worker, Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import puppeteer from 'puppeteer';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { PACKAGE_ROOT } from '../config/paths.js';

const connection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? parseInt(new URL(process.env.REDIS_URL).port || '6379') : 6379,
};

const CERT_DIR = path.join(PACKAGE_ROOT, 'certificates');
fs.mkdir(CERT_DIR, { recursive: true }).catch(() => {});

const ASSETS_DIR = path.join(PACKAGE_ROOT, 'assets');
const CERT_BG_PATH = path.join(ASSETS_DIR, 'certificate-bg.jpg');
const FONT_REGULAR_PATH = path.join(ASSETS_DIR, 'fonts', 'Poppins-Regular.ttf');
const FONT_MEDIUM_PATH = path.join(ASSETS_DIR, 'fonts', 'Poppins-Medium.ttf');

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function generateCertificate(participantId: string): Promise<string> {
    logger.info(`[Certificate] Generating for ${participantId}`);

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        user: { select: { name: true, email: true } },
        company: { select: { name: true } },
        event: { select: { name: true, date: true } },
      },
    });

    if (!participant || !participant.finishedAt || !participant.finishTime) {
      throw new Error(`Participant ${participantId} not eligible for certificate`);
    }

    const runnerName = escapeHtml(participant.name || participant.user.name);

    // Design is a single flattened background image (see
    // scripts/rasterize-cert-bg.mjs — the branded artwork was a 3MB SVG with
    // an embedded 4800px photo; baking it down to one JPEG once means every
    // certificate render (2000+ at a time) only has to load ~570KB instead
    // of re-parsing that SVG). The only dynamic element is the runner's name,
    // overlaid at the same position the artwork's own placeholder occupied —
    // a white patch covers "RUNNER-1" and a redrawn underline/name sit on top.
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @font-face {
      font-family: 'Poppins';
      font-weight: 400;
      src: url('file://${FONT_REGULAR_PATH}') format('truetype');
    }
    @font-face {
      font-family: 'Poppins';
      font-weight: 500;
      src: url('file://${FONT_MEDIUM_PATH}') format('truetype');
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Poppins', Arial, sans-serif; }
    #cert {
      position: relative;
      width: 1684px;
      height: 1191px;
      background: url('file://${CERT_BG_PATH}') no-repeat center/contain;
    }
    #patch {
      position: absolute;
      left: 490px; top: 744px;
      width: 505px; height: 64px;
      background: #ffffff;
    }
    #line {
      position: absolute;
      left: 278px; top: 807px;
      width: 707px; height: 2px;
      background: #8e8e8e;
    }
    #runnerName {
      position: absolute;
      left: 490px; top: 744px;
      width: 505px; height: 64px;
      display: flex; align-items: center; justify-content: center;
      font-size: 38px;
      font-weight: 500;
      letter-spacing: 5px;
      color: #7d7d7d;
      white-space: nowrap;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="cert">
    <div id="patch"></div>
    <div id="line"></div>
    <div id="runnerName">${runnerName}</div>
  </div>
</body>
</html>`;

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      // A page.setContent() document's origin can't load local file://
      // resources (the background image and fonts here) — writing to a real
      // file and navigating to it with page.goto() gives it an actual
      // file:// origin, which can.
      const tmpHtmlPath = path.join(os.tmpdir(), `cert-${participantId}-${Date.now()}.html`);
      await fs.writeFile(tmpHtmlPath, html);

      const page = await browser.newPage();
      await page.goto(`file://${tmpHtmlPath}`, { waitUntil: 'networkidle0' });

      // Long names shrink to fit the same box the artwork sized for
      // "RUNNER-1" — mirrors the auto-fit behavior in the original reference
      // page, just run once server-side instead of on every keystroke.
      await page.evaluate(() => {
        // Runs in the browser page, not this Node process — `document`
        // isn't in this file's TS lib config, hence the cast.
        const doc = (globalThis as any).document;
        const el = doc.getElementById('runnerName');
        if (!el) return;
        let size = 38;
        el.style.fontSize = size + 'px';
        while (el.scrollWidth > el.clientWidth && size > 14) {
          size -= 1;
          el.style.fontSize = size + 'px';
        }
      });

      const filename = `${participant.bibNumber}.pdf`;
      const filepath = path.join(CERT_DIR, filename);

      await page.pdf({
        path: filepath,
        width: '1684px',
        height: '1191px',
        printBackground: true,
      });

      await browser.close();
      await fs.unlink(tmpHtmlPath).catch(() => {});

      const certificateUrl = `/certificates/${filename}`;
      await prisma.participant.update({
        where: { id: participantId },
        data: { certificateUrl },
      });

      logger.info(`[Certificate] PDF generated: ${filename}`);
      return certificateUrl;
    } catch (error) {
      if (browser) await browser.close();
      throw error;
    }
}

export const certificateWorker = new Worker(
  'certificates',
  async (job: Job) => generateCertificate(job.data.participantId),
  { connection, concurrency: 2 }
);

certificateWorker.on('failed', (job, err) => {
  logger.error(`[Certificate] Job ${job?.id} failed:`, err.message);
});