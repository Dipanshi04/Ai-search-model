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

export async function sendPinEmail(
  to: string,
  name: string,
  pin: string
): Promise<boolean> {
  console.log('[EMAIL] Sending PIN email to:', to);
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #E91E8C 0%, #9C27B0 50%, #2196F3 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ISA MARATHON</h1>
      </div>
      <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
        <p style="margin: 0 0 16px; font-size: 18px; color: #1e293b;">Your Race PIN</p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">Hello <strong>${name}</strong>,</p>
        <p style="margin: 0 0 24px; font-size: 14px; color: #64748b;">Use this 4-digit PIN to log into the ISA Marathon Runner App</p>
        <div style="display: inline-block; background: linear-gradient(135deg, #E91E8C 0%, #9C27B0 50%, #2196F3 100%); padding: 16px 48px; border-radius: 12px; letter-spacing: 8px; font-size: 32px; font-weight: 900; color: #fff; font-family: monospace;">
          ${pin}
        </div>
        <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">This PIN is valid until you reset it. Do not share it with anyone.</p>
      </div>
      <p style="margin: 24px 0 0; text-align: center; font-size: 12px; color: #94a3b8;">© 2026 ISA Marathon. All rights reserved.</p>
    </div>
  `;

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

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #E91E8C 0%, #9C27B0 50%, #2196F3 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ISA MARATHON</h1>
      </div>
      <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
        <p style="margin: 0 0 16px; font-size: 18px; color: #1e293b;">Registration Confirmed!</p>
        <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">Hello <strong>${name}</strong>,</p>
        <p style="margin: 0 0 24px; font-size: 14px; color: #64748b;">You're registered for the ISA Marathon. Your BIB number is:</p>
        <div style="display: inline-block; background: linear-gradient(135deg, #E91E8C 0%, #9C27B0 50%, #2196F3 100%); padding: 12px 32px; border-radius: 10px; letter-spacing: 4px; font-size: 24px; font-weight: 900; color: #fff; font-family: monospace;">
          ${bibNumber}
        </div>
        <p style="margin: 16px 0 0; font-size: 14px; color: #64748b;">Category: <strong>${category}</strong></p>
        <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">Your PIN will be sent in a separate email. Use it to log into the Runner App.</p>
      </div>
      <p style="margin: 24px 0 0; text-align: center; font-size: 12px; color: #94a3b8;">© 2026 ISA Marathon. All rights reserved.</p>
    </div>
  `;

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