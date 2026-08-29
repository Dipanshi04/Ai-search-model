import { Router } from 'express';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import { generateCertificate } from '../jobs/certificateWorker.js';

export const certificateRouter: Router = Router();

certificateRouter.get('/:id', async (_req, res) => {
  res.json({ success: true, data: { certificateUrl: '/certificates/test.pdf' } });
});

certificateRouter.post('/generate', authenticate, async (req, res) => {
  try {
    const { participantId } = req.body;
    if (!participantId) {
      res.status(400).json({ success: false, message: 'participantId is required' });
      return;
    }

    const participant = await prisma.participant.findUnique({ where: { id: participantId } });
    if (!participant) {
      res.status(404).json({ success: false, message: 'Participant not found' });
      return;
    }
    if (participant.userId !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'Not your certificate' });
      return;
    }
    if (participant.status !== 'FINISHED') {
      res.status(400).json({ success: false, message: 'Certificate is available after finishing the race' });
      return;
    }

    if (participant.certificateUrl) {
      res.json({ success: true, data: { pdfUrl: participant.certificateUrl } });
      return;
    }

    const pdfUrl = await generateCertificate(participantId);
    res.json({ success: true, data: { pdfUrl } });
  } catch (error) {
    logger.error('Certificate generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate certificate' });
  }
});
