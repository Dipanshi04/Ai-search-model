import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { PACKAGE_ROOT } from '../config/paths.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG, JPG, WebP, SVG allowed'));
  }
});

export const sponsorsRouter: Router = Router();

sponsorsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.query;
    const where = eventId ? { eventId: eventId as string } : {};
    const sponsors = await prisma.sponsor.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: { category: { select: { id: true, name: true, displayOrder: true, alwaysSeparate: true } } },
    });
    res.json({ success: true, data: sponsors });
  } catch (error) {
    console.error('Get sponsors error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sponsors' });
  }
});

sponsorsRouter.post('/', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), upload.single('logo'), async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, string | string[]>;
    const getString = (val: string | string[] | undefined): string | undefined => {
      if (!val) return undefined;
      return Array.isArray(val) ? val[0] : val;
    };

    const eventId = getString(body.eventId);
    const name = getString(body.name);
    const tier = getString(body.tier);
    let logoUrl = getString(body.logoUrl);
    const website = getString(body.website);
    const displayOrder = body.displayOrder ? Number(getString(body.displayOrder)) : 0;
    const categoryId = getString(body.categoryId) || undefined;

    if (!eventId) {
      res.status(400).json({ success: false, message: 'eventId is required' });
      return;
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    // Handle logo file upload
    if (req.file) {
      const ext = req.file.mimetype === 'image/svg+xml' ? '.svg' : `.${req.file.mimetype.split('/')[1]}`;
      const filename = `${uuidv4()}${ext}`;
      const uploadDir = path.join(PACKAGE_ROOT, 'uploads', 'sponsors');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
      logoUrl = `/uploads/sponsors/${filename}`;
    }

    const sponsor = await prisma.sponsor.create({
      data: { eventId, name: name || '', tier: tier || '', logoUrl, website, displayOrder: displayOrder || 0, categoryId },
      include: { category: { select: { id: true, name: true, alwaysSeparate: true } } },
    });

    res.status(201).json({ success: true, data: sponsor });
  } catch (error) {
    console.error('Create sponsor error:', error);
    res.status(500).json({ success: false, message: 'Failed to create sponsor' });
  }
});

sponsorsRouter.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), upload.single('logo'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sponsorId = Array.isArray(id) ? id[0] : id;
    const body = req.body as Record<string, string | string[]>;
    const getString = (val: string | string[] | undefined): string | undefined => {
      if (!val) return undefined;
      return Array.isArray(val) ? val[0] : val;
    };
    const name: string | undefined = getString(body.name);
    const tier: string | undefined = getString(body.tier);
    let logoUrl: string | undefined = getString(body.logoUrl);
    const website: string | undefined = getString(body.website);
    const displayOrder: number | undefined = body.displayOrder ? Number(getString(body.displayOrder)) : undefined;
    // '' means "uncategorize" — the admin form sends it explicitly to clear
    // a previously-set category, so it has to be distinguished from
    // "field not sent at all" (undefined, meaning leave it alone).
    const categoryIdRaw = getString(body.categoryId);
    const categoryId: string | null | undefined = categoryIdRaw === undefined ? undefined : (categoryIdRaw || null);

    const existing = await prisma.sponsor.findUnique({ where: { id: sponsorId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Sponsor not found' });
      return;
    }

    // Handle logo file upload
    if (req.file) {
      const ext = req.file.mimetype === 'image/svg+xml' ? '.svg' : `.${req.file.mimetype.split('/')[1]}`;
      const filename = `${uuidv4()}${ext}`;
      const uploadDir = path.join(PACKAGE_ROOT, 'uploads', 'sponsors');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, filename), req.file.buffer);
      logoUrl = `/uploads/sponsors/${filename}`;
    }

    const sponsor = await prisma.sponsor.update({
      where: { id: sponsorId },
      data: { name, tier: tier || '', logoUrl, website, displayOrder, categoryId },
      include: { category: { select: { id: true, name: true, alwaysSeparate: true } } },
    });

    res.json({ success: true, data: sponsor });
  } catch (error) {
    console.error('Update sponsor error:', error);
    res.status(500).json({ success: false, message: 'Failed to update sponsor' });
  }
});

sponsorsRouter.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sponsorId = Array.isArray(id) ? id[0] : id;

    const existing = await prisma.sponsor.findUnique({ where: { id: sponsorId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Sponsor not found' });
      return;
    }

    await prisma.sponsor.delete({ where: { id: sponsorId } });

    res.json({ success: true, message: 'Sponsor deleted' });
  } catch (error) {
    console.error('Delete sponsor error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete sponsor' });
  }
});

// ---- Sponsor inquiries — leads from the homepage "Open For Sponsors" button ----

sponsorsRouter.post('/inquiries', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, companyName, message } = req.body;
    if (!name || !email || !companyName) {
      res.status(400).json({ success: false, message: 'Name, email, and company are required' });
      return;
    }

    const inquiry = await prisma.sponsorInquiry.create({
      data: { name, email, phone: phone || null, companyName, message: message || null },
    });

    res.status(201).json({ success: true, data: inquiry });
  } catch (error) {
    console.error('Create sponsor inquiry error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit inquiry' });
  }
});

sponsorsRouter.get(
  '/inquiries',
  authenticate,
  requireRole('SUPER_ADMIN', 'RACE_MANAGER'),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const where = status && status !== 'ALL' ? { status: String(status) } : {};
      const inquiries = await prisma.sponsorInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: inquiries });
    } catch (error) {
      console.error('List sponsor inquiries error:', error);
      res.status(500).json({ success: false, message: 'Failed to load inquiries' });
    }
  }
);

sponsorsRouter.put(
  '/inquiries/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'RACE_MANAGER'),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!['NEW', 'CONTACTED', 'CLOSED'].includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status' });
        return;
      }
      const inquiry = await prisma.sponsorInquiry.update({
        where: { id: req.params.id as string },
        data: { status },
      });
      res.json({ success: true, data: inquiry });
    } catch (error) {
      console.error('Update sponsor inquiry error:', error);
      res.status(500).json({ success: false, message: 'Failed to update inquiry' });
    }
  }
);