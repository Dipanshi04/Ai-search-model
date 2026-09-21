import { Worker, Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import { PACKAGE_ROOT } from '../config/paths.js';

const connection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? parseInt(new URL(process.env.REDIS_URL).port || '6379') : 6379,
};

const CERT_DIR = path.join(PACKAGE_ROOT, 'certificates');
fs.mkdir(CERT_DIR, { recursive: true }).catch(() => {});

function formatFinishTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

    const trees = participant.treesCount;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1120px; height: 790px;
      font-family: 'Georgia', serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
    }
    .border-frame {
      border: 3px solid #10b981;
      padding: 40px;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .title { font-size: 20px; color: #10b981; letter-spacing: 6px; text-transform: uppercase; margin-bottom: 8px; }
    .event-name { font-size: 42px; font-weight: bold; color: white; margin-bottom: 30px; }
    .cert-text { font-size: 16px; color: #94a3b8; margin-bottom: 20px; }
    .runner-name { font-size: 52px; font-weight: bold; color: #10b981; margin-bottom: 20px; text-align: center; }
    .details { display: flex; gap: 40px; margin-bottom: 30px; }
    .detail-item { text-align: center; }
    .detail-value { font-size: 28px; font-weight: bold; color: white; }
    .detail-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; }
    .green-impact {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 15px 30px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .green-text { font-size: 14px; color: #10b981; }
    .footer { font-size: 11px; color: #64748b; margin-top: auto; }
    .bib { position: absolute; top: 20px; right: 30px; font-size: 14px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="border-frame">
    <div class="bib">${participant.bibNumber}</div>
    <div class="title">Certificate of Completion</div>
    <div class="event-name">${participant.event.name}</div>
    <div class="cert-text">This is to certify that</div>
    <div class="runner-name">${participant.name || participant.user.name}</div>
    <div class="cert-text">successfully completed the ${participant.category.replace('RUN_', '').replace('_', ' ')} on ${new Date(participant.event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    <div class="details">
      <div class="detail-item">
        <div class="detail-value">${formatFinishTime(participant.finishTime)}</div>
        <div class="detail-label">Finish Time</div>
      </div>
      <div class="detail-item">
        <div class="detail-value">${participant.totalDistance.toFixed(2)} km</div>
        <div class="detail-label">Distance</div>
      </div>
      <div class="detail-item">
        <div class="detail-value">${participant.pace ? `${Math.floor(participant.pace)}:${String(Math.floor((participant.pace % 1) * 60)).padStart(2, '0')}` : '--:--'}</div>
        <div class="detail-label">Pace /km</div>
      </div>
    </div>
    <div class="green-impact">
      <div class="green-text">Green Impact: ${trees} trees planted - ${(trees * 22).toLocaleString()} kg CO2 offset per year</div>
    </div>
    <div class="footer">
      ${participant.company?.name ? `Representing ${participant.company.name} - ` : ''}
      3 KM = 1 Tree - Run for a Greener Tomorrow
    </div>
  </div>
</body>
</html>`;

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const filename = `${participant.bibNumber}.pdf`;
      const filepath = path.join(CERT_DIR, filename);

      await page.pdf({
        path: filepath,
        width: '1120px',
        height: '790px',
        printBackground: true,
      });

      await browser.close();

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