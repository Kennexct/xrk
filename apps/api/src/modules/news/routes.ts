import { Router } from 'express';
import { z } from 'zod';
import { NewsCategory, NewsStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { asyncHandler, badRequest, notFound } from '../../lib/errors';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { validateBody, parseQuery } from '../../middleware/validate';
import { can } from '../../lib/rbac';
import { logActivity } from '../activity/log';
import { notifyAllMembers } from '../notifications/service';

export const newsRouter = Router();
newsRouter.use(requireAuth);

const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post';

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  for (let i = 2; ; i++) {
    const clash = await prisma.news.findUnique({ where: { slug } });
    if (!clash) return slug;
    slug = `${base}-${i}`;
  }
}

const authorSelect = { author: { select: { id: true, name: true, avatarUrl: true } } };

const listQuery = z.object({
  category: z.nativeEnum(NewsCategory).optional(),
  status: z.nativeEnum(NewsStatus).optional(), // editors only
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

newsRouter.get(
  '/',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const q = parseQuery(listQuery, req);
    const isEditor = can(req.auth!.role, 'news:write');
    const where: Prisma.NewsWhereInput = {
      ...(q.category ? { category: q.category } : {}),
      // Non-editors only ever see published posts.
      ...(isEditor && q.status ? { status: q.status } : isEditor ? {} : { status: 'PUBLISHED' }),
    };
    const [posts, total] = await Promise.all([
      prisma.news.findMany({
        where,
        orderBy: [{ publishedAt: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: authorSelect,
      }),
      prisma.news.count({ where }),
    ]);
    res.json({ posts, total, page: q.page, pageSize: q.pageSize });
  }),
);

newsRouter.get(
  '/:idOrSlug',
  requirePermission('content:view'),
  asyncHandler(async (req, res) => {
    const post = await prisma.news.findFirst({
      where: { OR: [{ id: req.params.idOrSlug }, { slug: req.params.idOrSlug }] },
      include: authorSelect,
    });
    if (!post) throw notFound('News post');
    if (post.status !== 'PUBLISHED' && !can(req.auth!.role, 'news:write')) throw notFound('News post');
    res.json({ post });
  }),
);

const writeSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(1).max(100_000),
  coverImageUrl: z.string().url().max(1000).nullish(),
  category: z.nativeEnum(NewsCategory).default('PENGUMUMAN'),
  tags: z.array(z.string().max(40)).max(10).default([]),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED']).default('DRAFT'),
  publishAt: z.coerce.date().optional(), // required when status=SCHEDULED
});

function resolvePublishFields(body: z.infer<typeof writeSchema>) {
  if (body.status === 'SCHEDULED') {
    if (!body.publishAt || body.publishAt <= new Date()) {
      throw badRequest('Scheduled posts need a future publishAt time');
    }
    return { status: 'SCHEDULED' as NewsStatus, publishAt: body.publishAt, publishedAt: null };
  }
  if (body.status === 'PUBLISHED') {
    return { status: 'PUBLISHED' as NewsStatus, publishAt: null, publishedAt: new Date() };
  }
  return { status: 'DRAFT' as NewsStatus, publishAt: null, publishedAt: null };
}

newsRouter.post(
  '/',
  requirePermission('news:write'),
  validateBody(writeSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof writeSchema>;
    const publishFields = resolvePublishFields(body);
    const post = await prisma.news.create({
      data: {
        authorId: req.auth!.sub,
        title: body.title,
        slug: await uniqueSlug(body.title),
        content: body.content,
        coverImageUrl: body.coverImageUrl ?? undefined,
        category: body.category,
        tags: body.tags,
        ...publishFields,
      },
      include: authorSelect,
    });
    logActivity({
      userId: req.auth!.sub,
      actionType: post.status === 'PUBLISHED' ? 'publish_news' : 'create_news',
      targetType: 'news',
      targetId: post.id,
      metadata: { title: post.title, status: post.status },
      req,
    });
    if (post.status === 'PUBLISHED') {
      void notifyAllMembers(
        { type: 'news', title: 'Berita baru', message: post.title, link: `/news/${post.slug}` },
        req.auth!.sub,
      );
    }
    res.status(201).json({ post });
  }),
);

const updateSchema = writeSchema.partial().extend({
  status: z.nativeEnum(NewsStatus).optional(),
});

newsRouter.patch(
  '/:id',
  requirePermission('news:write'),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.news.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('News post');
    const body = req.body as z.infer<typeof updateSchema>;

    const wasPublished = existing.status === 'PUBLISHED';
    let publishFields = {};
    if (body.status && body.status !== existing.status) {
      if (body.status === 'ARCHIVED') {
        publishFields = { status: 'ARCHIVED' };
      } else {
        publishFields = resolvePublishFields({ ...body, status: body.status } as z.infer<typeof writeSchema>);
      }
    }

    const post = await prisma.news.update({
      where: { id: existing.id },
      data: {
        title: body.title,
        content: body.content,
        coverImageUrl: body.coverImageUrl,
        category: body.category,
        tags: body.tags,
        ...publishFields,
      },
      include: authorSelect,
    });

    const action =
      post.status === 'ARCHIVED' ? 'archive_news' : post.status === 'PUBLISHED' && !wasPublished ? 'publish_news' : 'update_news';
    logActivity({
      userId: req.auth!.sub,
      actionType: action,
      targetType: 'news',
      targetId: post.id,
      metadata: { title: post.title, status: post.status },
      req,
    });
    if (!wasPublished && post.status === 'PUBLISHED') {
      void notifyAllMembers(
        { type: 'news', title: 'Berita baru', message: post.title, link: `/news/${post.slug}` },
        req.auth!.sub,
      );
    }
    res.json({ post });
  }),
);

newsRouter.delete(
  '/:id',
  requirePermission('news:write'),
  asyncHandler(async (req, res) => {
    const post = await prisma.news.findUnique({ where: { id: req.params.id } });
    if (!post) throw notFound('News post');
    await prisma.news.delete({ where: { id: post.id } });
    logActivity({
      userId: req.auth!.sub,
      actionType: 'delete_news',
      targetType: 'news',
      targetId: post.id,
      metadata: { title: post.title },
      req,
    });
    res.json({ ok: true });
  }),
);
