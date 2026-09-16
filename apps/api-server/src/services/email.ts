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

// Race day: 6:30 AM IST, 27 Sep 2026 — 6:30-10:00 IST is 01:00-04:30 UTC.
// A Google Calendar link needs no server-generated file and opens in every
// mail client that renders a plain <a>, unlike an .ics attachment which
// several clients strip or refuse to render inline.
const CALENDAR_URL =
  'https://calendar.google.com/calendar/render?action=TEMPLATE' +
  '&text=' + encodeURIComponent('ISA Tech Marathon 2026') +
  '&dates=20260927T010000Z/20260927T043000Z' +
  '&details=' + encodeURIComponent('Race day! Check-in opens early — bring your BIB number and login PIN.') +
  '&location=' + encodeURIComponent('Indore, Madhya Pradesh, India');

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
        <table role="presentation" align="center" style="margin: 14px auto 0;"><tr>
          <td style="padding: 0 6px;">
            <div style="background: #fff; border-radius: 12px; padding: 6px 10px; display: inline-block; border: 1px solid rgba(27,42,91,0.1);">
              <img src="${SITE_URL}/uploads/email/mp-police-logo.png" alt="MP Police — Safety Partner" height="28" style="display: block; height: 28px; width: auto;" />
            </div>
          </td>
          <td style="padding: 0 6px;">
            <div style="background: #fff; border-radius: 12px; padding: 6px 10px; display: inline-block; border: 1px solid rgba(27,42,91,0.1);">
              <img src="${SITE_URL}/uploads/email/imc-logo.png" alt="Indore Municipal Corporation — Green City Partner" height="28" style="display: block; height: 28px; width: auto;" />
            </div>
          </td>
          <td style="padding: 0 6px;">
            <div style="background: #fff; border-radius: 12px; padding: 6px 10px; display: inline-block; border: 1px solid rgba(27,42,91,0.1);">
              <img src="${SITE_URL}/uploads/email/solugenix-logo.png" alt="Solugenix — Co-Sponsor" height="28" style="display: block; height: 28px; width: auto;" />
            </div>
          </td>
        </tr></table>
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
    <div style="text-align: center; margin-top: 20px;">
      <a href="${RUNNER_APP_URL}" target="_blank" style="display: inline-block; background: ${BRAND_NAVY}; color: #fff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 10px;">
        Log In to Runner App
      </a>
    </div>
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(27,42,91,0.08);">
      <p style="margin: 0 0 12px; font-size: 13px; color: ${BRAND_NAVY};">Race starts <strong>6:30 AM, 27th September 2026</strong></p>
      <a href="${CALENDAR_URL}" target="_blank" style="display: inline-block; background: ${BRAND_ORANGE}; color: #fff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 10px;">
        Add to Calendar
      </a>
    </div>
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

const RUNNER_APP_URL = process.env.RUNNER_APP_URL || 'http://localhost:3001';

// Manually triggered by an admin from the Participants view — not automatic
// — for nudging a runner whose registration is still PENDING_PAYMENT. The
// PIN was already emailed at registration regardless of payment status, so
// this just points them back to the Runner App login, which itself blocks
// on PaymentPendingPage until they actually pay. See routes/participants.ts.
export async function sendPaymentReminderEmail(
  to: string,
  name: string,
  bibNumber: string,
  amount: number
): Promise<boolean> {
  console.log('[EMAIL] Sending payment reminder email to:', to);

  const html = wrapEmailTemplate(`
    <p style="margin: 0 0 6px; font-size: 20px; font-weight: 800; color: ${BRAND_NAVY};">Complete Your Registration</p>
    <p style="margin: 0 0 20px; font-size: 14px; color: rgba(27,42,91,0.65);">
      Hello <strong>${name}</strong>, your ISA Marathon registration (BIB <strong>${bibNumber}</strong>) is still pending payment. Log in to the Runner App with your email and PIN to finish paying and secure your spot.
    </p>
    <div style="text-align: center;">
      <div style="display: inline-block; background: ${BRAND_NAVY}; padding: 14px 36px; border-radius: 12px; font-size: 22px; font-weight: 900; color: ${BRAND_ORANGE};">
        Rs. ${amount}
      </div>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${RUNNER_APP_URL}" target="_blank" style="display: inline-block; background: ${BRAND_ORANGE}; color: #fff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px;">
        Complete Payment
      </a>
    </div>
    <p style="margin: 20px 0 0; font-size: 12px; color: rgba(27,42,91,0.45); text-align: center;">If you've already paid, please ignore this email.</p>
  `);

  const tp = getTransporter();
  if (!tp) {
    logger.warn(`[DEV] Payment reminder for ${name} (${to}), BIB: ${bibNumber}, amount: ${amount}`);
    return true;
  }

  try {
    await tp.sendMail({
      from: config.from,
      to,
      subject: `Reminder: Complete Your ISA Marathon Payment — ${bibNumber}`,
      html,
    });
    logger.info(`Payment reminder email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Payment reminder FAILED:', error);
    logger.error('Failed to send payment reminder email:', error);
    return false;
  }
}
