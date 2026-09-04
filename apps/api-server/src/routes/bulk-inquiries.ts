import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';

// Leads from the homepage's "Buy 25 passes and get 50% OFF" bulk offer card
// — same shape and admin-triage flow as sponsors.ts's inquiry endpoints,
// just a separate CTA/table so the two lead types don't mix in one list.
export const bulkInquiriesRouter: Router = Router();

bulkInquiriesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, companyName, passCount, message } = req.body;
    if (!name || !email || !companyName) {
      res.status(400).json({ success: false, message: 'Name, email, and company are required' });
      return;
    }

    const inquiry = await prisma.bulkInquiry.create({
      data: {
        name,
        email,
        phone: phone || null,
        companyName,
        passCount: passCount ? Number(passCount) : null,
        message: message || null,
      },
    });

    res.status(201).json({ success: true, data: inquiry });
  } catch (error) {
    console.error('Create bulk inquiry error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit inquiry' });
  }
});

bulkInquiriesRouter.get('/', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where = status && status !== 'ALL' ? { status: String(status) } : {};
    const inquiries = await prisma.bulkInquiry.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: inquiries });
  } catch (error) {
    console.error('List bulk inquiries error:', error);
    res.status(500).json({ success: false, message: 'Failed to load inquiries' });
  }
});

bulkInquiriesRouter.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!['NEW', 'CONTACTED', 'CLOSED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }
    const inquiry = await prisma.bulkInquiry.update({
      where: { id: req.params.id as string },
      data: { status },
    });
    res.json({ success: true, data: inquiry });
  } catch (error) {
    console.error('Update bulk inquiry error:', error);
    res.status(500).json({ success: false, message: 'Failed to update inquiry' });
  }
});
