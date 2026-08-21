import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { hashPassword } from '../utils/jwt.js';

export const bulkRegistrationRouter: Router = Router();

bulkRegistrationRouter.use(authenticate);
bulkRegistrationRouter.use(requireRole('SUPER_ADMIN'));

bulkRegistrationRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const bulkRegistrations = await prisma.bulkRegistration.findMany({
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = bulkRegistrations.map((br) => ({
      id: br.id,
      companyName: br.companyName,
      hrName: br.hrName,
      hrEmail: br.hrEmail,
      numberOfRegistrations: br.numberOfRegistrations,
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

bulkRegistrationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { companyName, hrName, hrEmail, hrPassword, numberOfRegistrations, notes, companyId } = req.body as {
      companyName: string;
      hrName: string;
      hrEmail: string;
      hrPassword: string;
      numberOfRegistrations: number;
      notes?: string;
      companyId?: string;
    };

    if (!companyName || !hrName || !hrEmail || !hrPassword || !numberOfRegistrations) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

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

    let linkedCompanyId = companyId || null;
    if (!linkedCompanyId && companyName) {
      let company = await prisma.company.findUnique({ where: { name: companyName } });
      if (!company) {
        company = await prisma.company.create({ data: { name: companyName } });
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
  } catch (error) {
    logger.error('Create bulk registration error:', error);
    res.status(500).json({ success: false, message: 'Failed to create bulk registration' });
  }
});

bulkRegistrationRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { companyName, hrName, hrEmail, numberOfRegistrations, paymentCompleted, notes } = req.body as {
      companyName?: string;
      hrName?: string;
      hrEmail?: string;
      numberOfRegistrations?: number;
      paymentCompleted?: boolean;
      notes?: string;
    };

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
    if (companyName !== undefined) updateData.companyName = companyName;
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
