import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import { sendPinEmail } from '../services/email.js';

export const participantsRouter: Router = Router();

participantsRouter.get('/stats/summary', async (req, res) => {
  try {
    const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;

    let event = undefined;
    if (!eventId) {
      event = await prisma.event.findFirst({
        where: { status: { in: ['ACTIVE', 'PAUSED'] } },
        orderBy: { updatedAt: 'desc' },
      });
      if (!event) {
        event = await prisma.event.findFirst({
          where: { status: 'UPCOMING' },
          orderBy: { date: 'asc' },
        });
      }
    }

    const targetEventId = eventId ?? event?.id;
    if (!targetEventId) {
      res.json({
        success: true,
        data: { total: 0, checkedIn: 0, running: 0, finished: 0, byCategory: [] },
      });
      return;
    }

    const [total, checkedIn, running, finished, byCategory] = await Promise.all([
      prisma.participant.count({ where: { eventId: targetEventId } }),
      prisma.participant.count({ where: { eventId: targetEventId, checkedIn: true } }),
      prisma.participant.count({ where: { eventId: targetEventId, status: 'RUNNING' } }),
      prisma.participant.count({
        where: { eventId: targetEventId, status: { in: ['FINISHED', 'DNF'] } },
      }),
      prisma.participant.groupBy({
        by: ['category'],
        where: { eventId: targetEventId },
        _count: { category: true },
      }),
    ]);

    res.json({
      success: true,
      data: { total, checkedIn, running, finished, byCategory },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch participant stats' });
  }
});

participantsRouter.get('/export/csv', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (_req, res) => {
  try {
    const participants = await prisma.participant.findMany({
      include: { user: true, company: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['ID', 'Bib Number', 'Name', 'Email', 'Phone', 'Company', 'Category', 'Gender', 'Status', 'Checked In', 'Total Distance', 'Finish Time'];
    const rows = participants.map((p) => [
      p.id,
      p.bibNumber,
      p.user.name,
      p.user.email,
      p.user.phone,
      p.company?.name ?? '',
      p.category,
      p.gender,
      p.status,
      p.checkedIn ? 'Yes' : 'No',
      p.totalDistance,
      p.finishTime ?? '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=participants.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export CSV' });
  }
});

participantsRouter.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;

    const where: any = {};
    if (eventId) where.eventId = eventId;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { bibNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [participants, total] = await Promise.all([
      prisma.participant.findMany({
        where,
        include: { user: true, company: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.participant.count({ where }),
    ]);

    res.json({
      success: true,
      data: participants,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch participants' });
  }
});

participantsRouter.get('/leaderboard', async (req, res) => {
  try {
    const { category, limit = '100' } = req.query;
    let eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;

    if (!eventId) {
      let event = await prisma.event.findFirst({
        where: { status: { in: ['ACTIVE', 'PAUSED'] } },
        orderBy: { updatedAt: 'desc' },
      });
      if (!event) {
        event = await prisma.event.findFirst({
          where: { status: 'UPCOMING' },
          orderBy: { date: 'asc' },
        });
      }
      eventId = event?.id;
    }

    if (!eventId) {
      res.json({ success: true, data: [] });
      return;
    }
    const where: any = { eventId };
    if (category) where.category = category;
    const participants = await prisma.participant.findMany({
      where,
      include: { user: true, company: true },
      orderBy: { totalDistance: 'desc' },
      take: parseInt(limit as string),
    });
    res.json({ success: true, data: participants });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
});

participantsRouter.get('/companies', async (req, res) => {
  try {
    const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;
    const where = eventId ? { participants: { some: { eventId } } } : {};
    const companies = await prisma.company.findMany({
      where,
      include: {
        _count: {
          select: {
            participants: eventId ? { where: { eventId } } : true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch companies' });
  }
});

participantsRouter.post('/companies', authenticate, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { name, industry, employeeCount, contactEmail, contactPhone, status, membershipStartDate, membershipEndDate, renewalPending } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'name is required' });
      return;
    }
    const company = await prisma.company.create({
      data: {
        name, industry, employeeCount, contactEmail, contactPhone,
        status: status === 'PREMIUM' ? 'PREMIUM' : 'NON_PREMIUM',
        membershipStartDate: membershipStartDate ? new Date(membershipStartDate) : null,
        membershipEndDate: membershipEndDate ? new Date(membershipEndDate) : null,
        renewalPending: renewalPending === true,
      },
    });
    res.status(201).json({ success: true, data: company });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, message: 'Company name already exists' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to create company' });
  }
});

participantsRouter.put('/companies/:id', authenticate, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { name, industry, employeeCount, contactEmail, contactPhone, status, membershipStartDate, membershipEndDate, renewalPending } = req.body;
    const company = await prisma.company.findUnique({ where: { id: req.params.id as string } });
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }
    const updated = await prisma.company.update({
      where: { id: req.params.id as string },
      data: {
        ...(name !== undefined && { name }),
        ...(industry !== undefined && { industry }),
        ...(employeeCount !== undefined && { employeeCount }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(status !== undefined && { status: status === 'PREMIUM' ? 'PREMIUM' : 'NON_PREMIUM' }),
        ...(membershipStartDate !== undefined && { membershipStartDate: membershipStartDate ? new Date(membershipStartDate) : null }),
        ...(membershipEndDate !== undefined && { membershipEndDate: membershipEndDate ? new Date(membershipEndDate) : null }),
        ...(renewalPending !== undefined && { renewalPending: renewalPending === true }),
      },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update company' });
  }
});

participantsRouter.delete('/companies/:id', authenticate, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.params.id as string } });
    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }
    await prisma.company.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete company' });
  }
});

participantsRouter.get('/:id', async (req, res) => {
  try {
    const participant = await prisma.participant.findUnique({
      where: { id: req.params.id as string },
      include: { user: true, company: true },
    });
    if (!participant) {
      res.status(404).json({ success: false, message: 'Participant not found' });
      return;
    }
    res.json({ success: true, data: participant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch participant' });
  }
});

participantsRouter.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER'), async (req, res) => {
  try {
    const { status, category, gender, companyId, bibNumber, emergencyContact, emergencyPhone, bloodGroup, tshirtSize, kitDistributed, foodDistributed, paymentStatus } = req.body;
    const participant = await prisma.participant.findUnique({ where: { id: req.params.id as string } });
    if (!participant) {
      res.status(404).json({ success: false, message: 'Participant not found' });
      return;
    }

    const updated = await prisma.participant.update({
      where: { id: req.params.id as string },
      data: {
        ...(status !== undefined && { status }),
        ...(category !== undefined && { category }),
        ...(gender !== undefined && { gender }),
        ...(companyId !== undefined && { companyId }),
        ...(bibNumber !== undefined && { bibNumber }),
        ...(emergencyContact !== undefined && { emergencyContact }),
        ...(emergencyPhone !== undefined && { emergencyPhone }),
        ...(bloodGroup !== undefined && { bloodGroup }),
        ...(tshirtSize !== undefined && { tshirtSize }),
        ...(kitDistributed !== undefined && { kitDistributed: Boolean(kitDistributed) }),
        ...(foodDistributed !== undefined && { foodDistributed: Boolean(foodDistributed) }),
        // Manual override for cash-at-venue payments and other edge cases —
        // see payment.ts's /:id/verify and /:id/reject for the normal flow
        // this sits alongside.
        ...(paymentStatus !== undefined && { paymentStatus }),
      },
      include: { user: true, company: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update participant' });
  }
});

// Admin-only fallback for race day: regenerates the participant's PIN and
// returns it in plaintext so staff can read it out even if the notification
// email never arrives (SMTP outage, spam filtering, etc).
participantsRouter.post('/:id/reset-pin', authenticate, requireRole('SUPER_ADMIN', 'RACE_MANAGER', 'CHECKIN_STAFF'), async (req, res) => {
  try {
    const participant = await prisma.participant.findUnique({
      where: { id: req.params.id as string },
      include: { user: true },
    });
    if (!participant) {
      res.status(404).json({ success: false, message: 'Participant not found' });
      return;
    }

    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const pinHash = await bcrypt.hash(pin, 12);

    await prisma.user.update({
      where: { id: participant.userId },
      data: { pinHash },
    });

    sendPinEmail(participant.user.email, participant.user.name, pin).catch((err) =>
      logger.error('Failed to email reset PIN:', err)
    );

    logger.info(`Admin reset PIN for participant ${participant.id} (${participant.user.email})`);

    res.json({ success: true, data: { pin, email: participant.user.email } });
  } catch (error) {
    logger.error('Admin reset PIN error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset PIN' });
  }
});

participantsRouter.delete('/:id', authenticate, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const participant = await prisma.participant.findUnique({ where: { id: req.params.id as string } });
    if (!participant) {
      res.status(404).json({ success: false, message: 'Participant not found' });
      return;
    }
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { participantId: req.params.id as string } }),
      prisma.gpsLog.deleteMany({ where: { participantId: req.params.id as string } }),
      prisma.participant.delete({ where: { id: req.params.id as string } }),
    ]);
    res.json({ success: true, message: 'Participant deleted' });
  } catch (error) {
    logger.error('Admin delete participant error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete participant' });
  }
});

export const publicParticipantsRouter: Router = Router();

publicParticipantsRouter.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      res.json({ success: true, data: [] });
      return;
    }

    const participants = await prisma.participant.findMany({
      where: {
        OR: [
          { bibNumber: { contains: q as string, mode: 'insensitive' } },
          { user: { name: { contains: q as string, mode: 'insensitive' } } },
          { company: { name: { contains: q as string, mode: 'insensitive' } } },
        ],
      },
      include: { user: true, company: true },
      take: 20,
    });
    res.json({ success: true, data: participants });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});
