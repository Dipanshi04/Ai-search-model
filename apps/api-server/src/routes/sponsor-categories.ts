import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const sponsorCategoriesRouter: Router = Router();

// Public — the homepage and LED dashboard need this to group sponsors.
sponsorCategoriesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.sponsorCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { sponsors: true } } },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error('List sponsor categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sponsor categories' });
  }
});

sponsorCategoriesRouter.post('/', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { name, displayOrder, alwaysSeparate } = req.body;
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      res.status(400).json({ success: false, message: 'name is required' });
      return;
    }
    const category = await prisma.sponsorCategory.create({
      data: {
        name: trimmed,
        displayOrder: displayOrder != null ? Number(displayOrder) : 0,
        alwaysSeparate: alwaysSeparate === true,
      },
    });
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, message: 'A category with this name already exists' });
      return;
    }
    logger.error('Create sponsor category error:', error);
    res.status(500).json({ success: false, message: 'Failed to create sponsor category' });
  }
});

sponsorCategoriesRouter.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const { name, displayOrder, alwaysSeparate } = req.body;
    const existing = await prisma.sponsorCategory.findUnique({ where: { id: req.params.id as string } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }
    const category = await prisma.sponsorCategory.update({
      where: { id: req.params.id as string },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
        ...(alwaysSeparate !== undefined && { alwaysSeparate: alwaysSeparate === true }),
      },
    });
    res.json({ success: true, data: category });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, message: 'A category with this name already exists' });
      return;
    }
    logger.error('Update sponsor category error:', error);
    res.status(500).json({ success: false, message: 'Failed to update sponsor category' });
  }
});

sponsorCategoriesRouter.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.sponsorCategory.findUnique({ where: { id: req.params.id as string } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }
    // Sponsors in this category aren't deleted — the FK is ON DELETE SET
    // NULL, so they just become uncategorized rather than disappearing.
    await prisma.sponsorCategory.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    logger.error('Delete sponsor category error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete sponsor category' });
  }
});
