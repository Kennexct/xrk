import { Router } from 'express';
import { z } from 'zod';
import { RsvpStatus, type Event } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { asyncHandler, badRequest, notFound } from '../../lib/errors';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validateBody, parseQuery } from '../../middleware/validate';
import { logActivity } from '../activity/log';
import { notifyAllMembers } from '../notifications/service';

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

// Status is derived from time so it can never go stale (PRD §5.1.5)
const deriveStatus = (e: Event, now = new Date()) =>
  now < e.startTime ? 'UPCOMING' : now <= e.endTime ? 'ONGOING' : 'DONE';

const withStatus = (e: Event & Record<string, unknown>) => ({ ...e, status: deriveStatus(e) });

const listQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

eventsRouter.get(
  '/',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const q = parseQuery(listQuery, req);
    const where = {
      ...(q.from || q.to
        ? { startTime: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } }
        : {}),
    };
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { startTime: 'asc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          creator: { select: { id: true, name: true } },
          rsvps: { where: { userId: req.auth!.sub }, select: { status: true } },
          _count: { select: { rsvps: { where: { status: 'GOING' } } } },
        },
      }),
      prisma.event.count({ where }),
    ]);
    res.json({
      events: events.map((e: any) => ({
        ...withStatus(e),
        myRsvp: e.rsvps[0]?.status ?? null,
        goingCount: e._count.rsvps,
        rsvps: undefined,
        _count: undefined,
      })),
      total,
    });
  }),
);

eventsRouter.get(
  '/:id',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { id: true, name: true } },
        rsvps: { include: { user: { select: { id: true, name: true, avatarUrl: true, division: true } } } },
        folders: { include: { _count: { select: { files: true } } } },
      },
    });
    if (!event) throw notFound('Event');
    const myRsvp = event.rsvps.find((r: any) => r.userId === req.auth!.sub)?.status ?? null;
    res.json({ event: { ...withStatus(event), myRsvp } });
  }),
);

const writeSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(10_000).nullish(),
  location: z.string().max(300).nullish(),
  picName: z.string().max(100).nullish(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  attachmentUrls: z.array(z.string().url().max(1000)).max(20).default([]),
});

const checkTimes = (b: { startTime: Date; endTime: Date }) => {
  if (b.endTime <= b.startTime) throw badRequest('endTime must be after startTime');
};

eventsRouter.post(
  '/',
  requirePermission('event:write'),
  validateBody(writeSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof writeSchema>;
    checkTimes(body);
    const event = await prisma.event.create({
      data: { ...body, creatorId: req.auth!.sub },
      include: { creator: { select: { id: true, name: true } } },
    });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'create_event',
      targetType: 'event',
      targetId: event.id,
      metadata: { title: event.title },
      req,
    });
    void notifyAllMembers(
      { type: 'event', title: 'Kegiatan baru', message: event.title, link: `/events/${event.id}` },
      req.auth!.sub,
    );
    res.status(201).json({ event: withStatus(event) });
  }),
);

eventsRouter.patch(
  '/:id',
  requirePermission('event:write'),
  validateBody(writeSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Event');
    const body = req.body as Partial<z.infer<typeof writeSchema>>;
    const merged = { startTime: body.startTime ?? existing.startTime, endTime: body.endTime ?? existing.endTime };
    checkTimes(merged);
    const event = await prisma.event.update({
      where: { id: existing.id },
      data: body,
      include: { creator: { select: { id: true, name: true } } },
    });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'update_event',
      targetType: 'event',
      targetId: event.id,
      metadata: { title: event.title },
      req,
    });
    res.json({ event: withStatus(event) });
  }),
);

eventsRouter.delete(
  '/:id',
  requirePermission('event:write'),
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) throw notFound('Event');
    await prisma.event.delete({ where: { id: event.id } });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'delete_event',
      targetType: 'event',
      targetId: event.id,
      metadata: { title: event.title },
      req,
    });
    res.json({ ok: true });
  }),
);

const rsvpSchema = z.object({ status: z.nativeEnum(RsvpStatus) });

eventsRouter.post(
  '/:id/rsvp',
  requirePermission('event:rsvp'),
  validateBody(rsvpSchema),
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) throw notFound('Event');
    const { status } = req.body as z.infer<typeof rsvpSchema>;
    const rsvp = await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId: event.id, userId: req.auth!.sub } },
      create: { eventId: event.id, userId: req.auth!.sub, status },
      update: { status },
    });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'rsvp_event',
      targetType: 'event',
      targetId: event.id,
      metadata: { status },
      req,
    });
    res.json({ rsvp });
  }),
);

// .ics export for Google Calendar sync (PRD §5.1.5 nice-to-have)
eventsRouter.get(
  '/:id/ics',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) throw notFound('Event');
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Sunflower Youth Team//SYT Platform//ID',
      'BEGIN:VEVENT',
      `UID:${event.id}@syt-platform`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(event.startTime)}`,
      `DTEND:${fmt(event.endTime)}`,
      `SUMMARY:${esc(event.title)}`,
      ...(event.description ? [`DESCRIPTION:${esc(event.description)}`] : []),
      ...(event.location ? [`LOCATION:${esc(event.location)}`] : []),
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="event-${event.id}.ics"`);
    res.send(ics);
  }),
);
