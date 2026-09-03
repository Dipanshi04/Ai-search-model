import nodemailer from 'nodemailer';
import { logger } from '../config/logger.js';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

const config: EmailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  from: process.env.SMTP_FROM || 'ISA Marathon <noreply@isa-marathon.com>',
};

console.log('[EMAIL CONFIG]', {
  host: config.host,
  port: config.port,
  secure: config.secure,
  user: config.auth.user ? 'SET' : 'MISSING',
  pass: config.auth.pass ? 'SET' : 'MISSING',
  from: config.from
});

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  if (!config.auth.user || !config.auth.pass) {
    logger.warn('SMTP credentials not configured — email disabled');
    return null;
  }

  console.log('[EMAIL] Creating transporter...');
  transporter = nodemailer.createTransport(config);

  transporter.verify((err: Error | null) => {
    if (err) {
      console.error('[EMAIL] Transporter verification FAILED:', err);
    } else {
      console.log('[EMAIL] Transporter verified successfully');
    }
  });

return transporter;
  }

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: { to: string; subject: string; html: string; text?: string }): Promise<boolean> {
  const tp = getTransporter();
  if (!tp) {
    logger.warn(`[DEV] Email to ${to}: ${subject}`);
    return true;
  }

  console.log('[EMAIL] Sending email to:', to);

  try {
    const info = await tp.sendMail({
      from: config.from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
    console.log('[EMAIL] Send successful:', info.messageId);
    logger.info(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Send FAILED:', error);
    logger.error('Failed to send email:', error);
    return false;
  }
}

// Same brand as the site: navy/orange/cream, ISA + NRC Group (main
// sponsor) logos side by side, same lockup as the site's own page header.
// Logos are served as stable, unhashed static files (apps/api-server/
// uploads/email/) rather than the Vite-bundled ones the site uses — those
// get a new hash on every rebuild, which would break the image in any
// email already sent before the next deploy.
const BRAND_NAVY = '#1B2A5B';
const BRAND_ORANGE = '#F5821F';
const BRAND_CREAM = '#F5F1EA';
const SITE_URL = process.env.PUBLIC_WEB_URL || 'https://marathon.theisa.in';

function wrapEmailTemplate(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: ${BRAND_CREAM};">
      <div style="padding: 28px 24px 20px; text-align: center;">
        <table role="presentation" align="center" style="margin: 0 auto;"><tr>
          <td style="padding: 0 8px;">
            <div style="background: #fff; border-radius: 16px; padding: 10px 14px; display: inline-block; border: 1px solid rgba(27,42,91,0.1);">
              <img src="${SITE_URL}/uploads/email/nrc-logo.png" alt="NRC Group" height="44" style="display: block; height: 44px; width: auto;" />
            </div>
          </td>
          <td style="padding: 0 8px;">
            <div style="background: #fff; border-radius: 16px; padding: 10px 14px; display: inline-block; border: 1px solid rgba(27,42,91,0.1);">
              <img src="${SITE_URL}/uploads/email/isa-logo.png" alt="ISA Marathon" height="44" style="display: block; height: 44px; width: auto;" />
            </div>
          </td>
        </tr></table>
        <p style="margin: 12px 0 0; font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: ${BRAND_NAVY};">
          Indore Software Association
        </p>
      </div>

      <div style="background: #fff; border-radius: 20px; margin: 0 16px; padding: 32px 28px; border: 1px solid rgba(27,42,91,0.08);">
        ${bodyHtml}
      </div>

      <div style="padding: 20px 24px 28px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: rgba(27,42,91,0.5);">&copy; 2026 ISA Marathon. All rights reserved.</p>
      </div>
    </div>
  `;
}

export async function sendPinEmail(
  to: string,
  name: string,
  pin: string
): Promise<boolean> {
  console.log('[EMAIL] Sending PIN email to:', to);

  const html = wrapEmailTemplate(`
    <p style="margin: 0 0 6px; font-size: 20px; font-weight: 800; color: ${BRAND_NAVY};">Your Race PIN</p>
    <p style="margin: 0 0 20px; font-size: 14px; color: rgba(27,42,91,0.65);">
      Hello <strong>${name}</strong>, use this 4-digit PIN with your email to log into the ISA Marathon Runner App.
    </p>
    <div style="text-align: center;">
      <div style="display: inline-block; background: ${BRAND_NAVY}; padding: 16px 48px; border-radius: 14px; letter-spacing: 10px; font-size: 32px; font-weight: 900; color: ${BRAND_ORANGE}; font-family: 'Courier New', monospace;">
        ${pin}
      </div>
    </div>
    <p style="margin: 20px 0 0; font-size: 12px; color: rgba(27,42,91,0.45); text-align: center;">This PIN is valid until you reset it. Do not share it with anyone.</p>
  `);

  const tp = getTransporter();
  if (!tp) {
    console.log('[DEV] PIN for', name, '(', to, '):', pin);
    return true;
  }

  console.log('[EMAIL] Sending PIN email to:', to);

  try {
    const info = await tp.sendMail({
      from: config.from,
      to,
      subject: 'Your ISA Marathon Race PIN',
      html,
    });
    console.log('[EMAIL] Send successful:', info.messageId);
    logger.info(`PIN email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Send FAILED:', error);
    logger.error('Failed to send PIN email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  bibNumber: string,
  category: string
): Promise<boolean> {
  console.log('[EMAIL] Sending welcome email to:', to);

  const html = wrapEmailTemplate(`
    <p style="margin: 0 0 6px; font-size: 20px; font-weight: 800; color: ${BRAND_NAVY};">Registration Confirmed!</p>
    <p style="margin: 0 0 20px; font-size: 14px; color: rgba(27,42,91,0.65);">
      Hello <strong>${name}</strong>, you're registered for the ISA Marathon. Your BIB number is:
    </p>
    <div style="text-align: center;">
      <div style="display: inline-block; background: ${BRAND_NAVY}; padding: 14px 36px; border-radius: 12px; letter-spacing: 5px; font-size: 26px; font-weight: 900; color: ${BRAND_ORANGE}; font-family: 'Courier New', monospace;">
        ${bibNumber}
      </div>
    </div>
    <p style="margin: 18px 0 0; font-size: 14px; color: rgba(27,42,91,0.65); text-align: center;">Category: <strong style="color: ${BRAND_NAVY};">${category}</strong></p>
    <p style="margin: 20px 0 0; font-size: 12px; color: rgba(27,42,91,0.45); text-align: center;">Your PIN was sent in a separate email — use it to log into the Runner App.</p>
  `);

  const tp = getTransporter();
  if (!tp) {
    logger.warn(`[DEV] Welcome email for ${name} (${to}), BIB: ${bibNumber}`);
    return true;
  }

  try {
    await tp.sendMail({
      from: config.from,
      to,
      subject: `ISA Marathon Registration Confirmed — ${bibNumber}`,
      html,
    });
    logger.info(`Welcome email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Welcome email FAILED:', error);
    logger.error('Failed to send welcome email:', error);
    return false;
  }
}
