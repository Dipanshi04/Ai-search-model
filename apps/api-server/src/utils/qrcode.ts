import QRCode from 'qrcode';
import { logger } from '../config/logger.js';

export async function generateQRCode(bibNumber: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(bibNumber, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });

    return dataUrl;
  } catch (error) {
    logger.error('QR generation error:', error);
    throw error;
  }
}

export async function generateQRCodeBuffer(bibNumber: string): Promise<Buffer> {
  try {
    const buffer = await QRCode.toBuffer(bibNumber, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    return buffer;
  } catch (error) {
    logger.error('QR buffer generation error:', error);
    throw error;
  }
}