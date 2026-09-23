import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { hashPassword } from '../utils/jwt.js';
import bcrypt from 'bcryptjs';
import { sendPinEmail, sendWelcomeEmail } from '../services/email.js';

export const bulkRegistrationRouter: Router = Router();

bulkRegistrationRouter.use(authenticate);
bulkRegistrationRouter.use(requireRole('SUPER_ADMIN'));

bulkRegistrationRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const bulkRegistrations = await prisma.bulkRegistration.findMany({
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = bulkRegistrations.map((br) => ({
      id: br.id,
      companyName: br.companyName,
      hrName: br.hrName,
      hrEmail: br.hrEmail,
      numberOfRegistrations: br.numberOfRegistrations,
      registeredCount: br._count.participants,
      paymentCompleted: br.paymentCompleted,
      notes: br.notes,
      companyId: br.companyId,
      createdAt: br.createdAt,
      updatedAt: br.updatedAt,
    }));

    res.json({ success: true, data });
  } catch (error) {
    logger.error('Fetch bulk registrations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bulk registrations' });
  }
});

// T-shirt size breakdown per company, for bulk (HR-registered) participants
// only — kit ordering needs "how many of each size for company X", not a
// site-wide total (that's already on the Dashboard).
bulkRegistrationRouter.get('/tshirt-report', async (_req: Request, res: Response) => {
  try {
    const participants = await prisma.participant.findMany({
      where: { bulkRegistrationId: { not: null } },
      select: {
        tshirtSize: true,
        category: true,
        company: { select: { name: true } },
        bulkRegistration: { select: { companyName: true } },
      },
    });

    const bySizeByCompany = new Map<string, Record<string, number>>();
    const byCategoryByCompany = new Map<string, Record<string, number>>();
    const allSizes = new Set<string>();

    for (const p of participants) {
      const companyName = p.company?.name || p.bulkRegistration?.companyName || 'Unknown Company';
      const size = p.tshirtSize || 'Not Set';
      const category = p.category.replace('RUN_', ''); // RUN_3K -> 3K, RUN_5K -> 5K
      allSizes.add(size);
      if (!bySizeByCompany.has(companyName)) bySizeByCompany.set(companyName, {});
      const row = bySizeByCompany.get(companyName)!;
      row[size] = (row[size] || 0) + 1;
      if (!byCategoryByCompany.has(companyName)) byCategoryByCompany.set(companyName, {});
      const catRow = byCategoryByCompany.get(companyName)!;
      catRow[category] = (catRow[category] || 0) + 1;
    }

    // A stable, sensible column order — real sizes first (S→XXL), then
    // whatever odd values a CSV/typo introduced, "Not Set" always last.
    const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
    const sizes = Array.from(allSizes).sort((a, b) => {
      if (a === 'Not Set') return 1;
      if (b === 'Not Set') return -1;
      const ai = SIZE_ORDER.indexOf(a);
      const bi = SIZE_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const rows = Array.from(bySizeByCompany.entries())
      .map(([companyName, counts]) => ({
        companyName,
        counts,
        categories: byCategoryByCompany.get(companyName) || {},
        total: Object.values(counts).reduce((sum, n) => sum + n, 0),
      }))
      .sort((a, b) => b.total - a.total);

    const grandTotal: Record<string, number> = {};
    for (const size of sizes) {
      grandTotal[size] = rows.reduce((sum, r) => sum + (r.counts[size] || 0), 0);
    }

    const categoryGrandTotal: Record<string, number> = { '3K': 0, '5K': 0 };
    for (const r of rows) {
      for (const [cat, n] of Object.entries(r.categories)) {
        categoryGrandTotal[cat] = (categoryGrandTotal[cat] || 0) + n;
      }
    }

    res.json({ success: true, data: { sizes, rows, grandTotal, categoryGrandTotal } });
  } catch (error) {
    logger.error('T-shirt report error:', error);
    res.status(500).json({ success: false, message: 'Failed to build t-shirt report' });
  }
});

bulkRegistrationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { companyName, hrName, hrEmail: hrEmailInput, hrPassword, numberOfRegistrations, notes, companyId } = req.body as {
      companyName: string;
      hrName: string;
      hrEmail: string;
      hrPassword: string;
      numberOfRegistrations: number;
      notes?: string;
      companyId?: string;
    };

    if (!companyName || !hrName || !hrEmailInput || !hrPassword || !numberOfRegistrations) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }
    const hrEmail = String(hrEmailInput).trim().toLowerCase();

    if (typeof numberOfRegistrations !== 'number' || numberOfRegistrations < 1 || !Number.isInteger(numberOfRegistrations)) {
      res.status(400).json({ success: false, message: 'Number of registrations must be a positive integer' });
      return;
    }

    const existing = await prisma.bulkRegistration.findUnique({ where: { hrEmail } });
    if (existing) {
      res.status(409).json({ success: false, message: 'An HR with this email already exists' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: hrEmail } });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'A user with this email already exists' });
      return;
    }

    const hrPasswordHash = await hashPassword(hrPassword);

    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const pinHash = await bcrypt.hash(pin, 12);

    // Same pattern as public registration: a real companyId picked from the
    // list needs no name-matching. A brand new name gets uppercased so
    // "Tata"/"TATA"/"tata" from different admins all land on one row.
    let linkedCompanyId = companyId || null;
    if (!linkedCompanyId && companyName) {
      const normalizedName = companyName.trim().toUpperCase();
      let company = await prisma.company.findUnique({ where: { name: normalizedName } });
      if (!company) {
        company = await prisma.company.create({ data: { name: normalizedName } });
      }
      linkedCompanyId = company.id;
    }

    const bulkRegistration = await prisma.bulkRegistration.create({
      data: {
        companyName,
        hrName,
        hrEmail,
        hrPasswordHash,
        numberOfRegistrations,
        companyId: linkedCompanyId,
        notes: notes || null,
      },
    });

    logger.info(`Bulk registration created: ${companyName} (${hrEmail}) - ${numberOfRegistrations} slots`);

    const hrUser = await prisma.user.create({
      data: {
        email: hrEmail,
        name: hrName,
        // HR accounts created here don't collect a phone number, but the
        // column is unique and non-nullable — a shared '' placeholder let
        // only the first-ever bulk registration succeed and broke every
        // one after it. Each user needs its own unique placeholder instead.
        phone: `HR-${bulkRegistration.id}`,
        passwordHash: hrPasswordHash,
        pinHash,
        role: 'HR',
      },
    });

    sendWelcomeEmail(hrEmail, hrName, 'BULK-HR', 'HR').catch((e) => logger.error('Welcome email failed:', e));
    sendPinEmail(hrEmail, hrName, pin).catch((e) => logger.error('PIN email failed:', e));

    res.status(201).json({
      success: true,
      data: {
        id: bulkRegistration.id,
        companyName: bulkRegistration.companyName,
        hrName: bulkRegistration.hrName,
        hrEmail: bulkRegistration.hrEmail,
        numberOfRegistrations: bulkRegistration.numberOfRegistrations,
        paymentCompleted: bulkRegistration.paymentCompleted,
        notes: bulkRegistration.notes,
        companyId: bulkRegistration.companyId,
        createdAt: bulkRegistration.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('Create bulk registration error:', error);
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, message: `A user with this ${error.meta?.target?.[0] || 'field'} already exists` });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to create bulk registration' });
  }
});

bulkRegistrationRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { companyName, companyId, hrName, hrEmail: hrEmailInput, numberOfRegistrations, paymentCompleted, notes } = req.body as {
      companyName?: string;
      companyId?: string;
      hrName?: string;
      hrEmail?: string;
      numberOfRegistrations?: number;
      paymentCompleted?: boolean;
      notes?: string;
    };
    const hrEmail = hrEmailInput !== undefined ? String(hrEmailInput).trim().toLowerCase() : undefined;

    const existing = await prisma.bulkRegistration.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Bulk registration not found' });
      return;
    }

    if (numberOfRegistrations !== undefined) {
      if (typeof numberOfRegistrations !== 'number' || numberOfRegistrations < 1 || !Number.isInteger(numberOfRegistrations)) {
        res.status(400).json({ success: false, message: 'Number of registrations must be a positive integer' });
        return;
      }
    }

    if (hrEmail && hrEmail !== existing.hrEmail) {
      const emailTaken = await prisma.bulkRegistration.findUnique({ where: { hrEmail } });
      if (emailTaken) {
        res.status(409).json({ success: false, message: 'An HR with this email already exists' });
        return;
      }
    }

    const updateData: Record<string, any> = {};
    if (companyId !== undefined) {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (company) {
        updateData.companyId = company.id;
        updateData.companyName = company.name;
      }
    } else if (companyName !== undefined) {
      const normalizedName = companyName.trim().toUpperCase();
      let company = await prisma.company.findUnique({ where: { name: normalizedName } });
      if (!company) {
        company = await prisma.company.create({ data: { name: normalizedName } });
      }
      updateData.companyId = company.id;
      updateData.companyName = company.name;
    }
    if (hrName !== undefined) updateData.hrName = hrName;
    if (hrEmail !== undefined) updateData.hrEmail = hrEmail;
    if (numberOfRegistrations !== undefined) updateData.numberOfRegistrations = numberOfRegistrations;
    if (paymentCompleted !== undefined) updateData.paymentCompleted = paymentCompleted;
    if (notes !== undefined) updateData.notes = notes || null;

    const updated = await prisma.bulkRegistration.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Bulk registration updated: ${id}`);

    res.json({
      success: true,
      data: {
        id: updated.id,
        companyName: updated.companyName,
        hrName: updated.hrName,
        hrEmail: updated.hrEmail,
        numberOfRegistrations: updated.numberOfRegistrations,
        paymentCompleted: updated.paymentCompleted,
        notes: updated.notes,
        companyId: updated.companyId,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Update bulk registration error:', error);
    res.status(500).json({ success: false, message: 'Failed to update bulk registration' });
  }
});

// Admin-only fallback for when an HR forgets their password and can't (or
// won't) use the self-service /hr/forgot-password email flow — mirrors the
// participant reset-pin endpoint's pattern of generating a new credential
// and returning it in plaintext so staff can read it out directly. Only
// bulkRegistration.hrPasswordHash is updated, matching what HR login and
// the email-based reset flow already check (see hr.ts's /login and
// /reset-password) — the linked User row's passwordHash is untouched.
bulkRegistrationRouter.post('/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { password } = req.body as { password?: string };

    const bulkReg = await prisma.bulkRegistration.findUnique({ where: { id } });
    if (!bulkReg) {
      res.status(404).json({ success: false, message: 'Bulk registration not found' });
      return;
    }

    if (password !== undefined && password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const newPassword = password || Math.random().toString(36).slice(-8);
    const hrPasswordHash = await hashPassword(newPassword);

    await prisma.bulkRegistration.update({ where: { id }, data: { hrPasswordHash } });

    logger.info(`Admin reset HR password for bulk registration ${id} (${bulkReg.hrEmail})`);

    res.json({ success: true, data: { password: newPassword, hrEmail: bulkReg.hrEmail } });
  } catch (error) {
    logger.error('Admin reset HR password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

bulkRegistrationRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.bulkRegistration.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Bulk registration not found' });
      return;
    }

    await prisma.bulkRegistration.delete({ where: { id } });

    logger.info(`Bulk registration deleted: ${id} (${existing.hrEmail})`);

    res.json({ success: true, message: 'Bulk registration deleted' });
  } catch (error) {
    logger.error('Delete bulk registration error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete bulk registration' });
  }
});
