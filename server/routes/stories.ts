import { Router, Request, Response } from 'express';
import { db, runInTransaction } from '../db';
import { requireAuth } from '../authMiddleware';
import {
  buildExcerpt,
  computeReadingTime,
  createId,
  slugify,
} from '../security';
import {
  EMPLOYMENT_DURATIONS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_CATEGORIES,
  EXPERIENCE_TYPES,
  HIGH_CARE_CATEGORIES,
  INDUSTRIES,
  STORY_LIMITS,
} from '../../shared/constants';
import { CommentItem, StoryDetail, StorySummary } from '../../shared/types';

export const storiesRouter = Router();

export interface RawStoryRow {
  [key: string]: any;
  id: string;
  slug: string;
  author_id: string;
  author_display_name: string;
  author_headline: string;
  title: string;
  content: string;
  excerpt: string;
  category: any;
  industry: any;
  employment_type: any;
  company_id: string | null;
  company_name: string | null;
  company_slug: string | null;
  company_descriptor: string | null;
  experience_type: any;
  duration: string;
  key_lesson: string;
  evidence_note: string | null;
  evidence_filename: string | null;
  identity_preference: 'display_name' | 'anonymous';
  author_role_context: string | null;
  status: any;
  moderation_flag: 'standard' | 'high_care_review';
  moderation_note: string | null;
  reading_time_minutes: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  helpful_count: number;
  relatable_count: number;
  comment_count: number;
  bookmark_count: number;
  viewer_helpful: number;
  viewer_relatable: number;
  viewer_bookmarked: number;
}

const BASE_STORY_SELECT = `
  SELECT
    s.id,
    s.slug,
    s.author_id,
    u.display_name AS author_display_name,
    u.role_headline AS author_headline,
    s.title,
    s.content,
    s.excerpt,
    s.category,
    s.industry,
    s.employment_type,
    s.company_id,
    c.name AS company_name,
    c.slug AS company_slug,
    s.company_descriptor,
    s.experience_type,
    s.duration,
    s.key_lesson,
    s.evidence_note,
    s.evidence_filename,
    s.identity_preference,
    s.author_role_context,
    s.status,
    s.moderation_flag,
    s.moderation_note,
    s.reading_time_minutes,
    s.created_at,
    s.updated_at,
    s.published_at,
    (SELECT COUNT(*) FROM story_reactions sr WHERE sr.story_id = s.id AND sr.reaction_type = 'helpful') AS helpful_count,
    (SELECT COUNT(*) FROM story_reactions sr WHERE sr.story_id = s.id AND sr.reaction_type = 'relatable') AS relatable_count,
    (SELECT COUNT(*) FROM comments cm WHERE cm.story_id = s.id AND cm.is_deleted = 0) AS comment_count,
    (SELECT COUNT(*) FROM bookmarks bm WHERE bm.story_id = s.id) AS bookmark_count,
    (SELECT COUNT(*) FROM story_reactions sr WHERE sr.story_id = s.id AND sr.user_id = :viewerId AND sr.reaction_type = 'helpful') AS viewer_helpful,
    (SELECT COUNT(*) FROM story_reactions sr WHERE sr.story_id = s.id AND sr.user_id = :viewerId AND sr.reaction_type = 'relatable') AS viewer_relatable,
    (SELECT COUNT(*) FROM bookmarks bm WHERE bm.story_id = s.id AND bm.user_id = :viewerId) AS viewer_bookmarked
  FROM stories s
  JOIN users u ON u.id = s.author_id
  LEFT JOIN companies c ON c.id = s.company_id
`;

export function formatStorySummary(
  row: RawStoryRow,
  viewerId: string | null,
  isModerator = false
): StorySummary {
  const isAnon = row.identity_preference === 'anonymous';
  const roleCtx = row.author_role_context || (!isAnon ? row.author_headline : '');
  const authorLabel = isAnon
    ? roleCtx
      ? `Anonymous · ${roleCtx}`
      : 'Anonymous member'
    : roleCtx
      ? `@${row.author_display_name} · ${roleCtx}`
      : `@${row.author_display_name}`;

  const isOwnStory = Boolean(viewerId && viewerId === row.author_id);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    industry: row.industry,
    employmentType: row.employment_type,
    companyName: row.company_name,
    companySlug: row.company_slug,
    companyDescriptor: row.company_descriptor,
    experienceType: row.experience_type,
    duration: row.duration,
    keyLesson: row.key_lesson,
    authorLabel,
    authorHandle: isAnon ? null : row.author_display_name,
    isAnonymous: isAnon,
    readingTimeMinutes: row.reading_time_minutes,
    helpfulCount: Number(row.helpful_count || 0),
    relatableCount: Number(row.relatable_count || 0),
    commentCount: Number(row.comment_count || 0),
    bookmarkCount: Number(row.bookmark_count || 0),
    viewerHelpful: Boolean(row.viewer_helpful),
    viewerRelatable: Boolean(row.viewer_relatable),
    viewerBookmarked: Boolean(row.viewer_bookmarked),
    isOwnStory,
    status: row.status,
    moderationFlag: isOwnStory || isModerator ? row.moderation_flag : undefined,
    moderationNote: isOwnStory || isModerator ? row.moderation_note : null,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Live platform metadata (100% real SQLite counts, never fabricated)
storiesRouter.get('/meta', (_req: Request, res: Response) => {
  const published = db
    .prepare("SELECT COUNT(*) as count FROM stories WHERE status = 'published'")
    .get() as { count: number };

  const companies = db
    .prepare(
      `SELECT COUNT(DISTINCT company_id) as count
       FROM stories
       WHERE status = 'published' AND company_id IS NOT NULL`
    )
    .get() as { count: number };

  const discussions = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM comments cm
       JOIN stories s ON s.id = cm.story_id
       WHERE s.status = 'published' AND cm.is_deleted = 0`
    )
    .get() as { count: number };

  const catRows = db
    .prepare(
      `SELECT category, COUNT(*) as count
       FROM stories
       WHERE status = 'published'
       GROUP BY category`
    )
    .all() as { category: string; count: number }[];

  const categoryCounts: Record<string, number> = {};
  for (const r of catRows) {
    categoryCounts[r.category] = r.count;
  }

  res.json({
    publishedStories: published.count,
    companiesWithStories: companies.count,
    totalComments: discussions.count,
    categoryCounts,
  });
});

// Discovery feed with real filters, search, sorting & pagination
storiesRouter.get('/stories', (req: Request, res: Response) => {
  const viewerId = req.viewer?.id || '';
  const sort = String(req.query.sort || 'latest');
  const category = String(req.query.category || '').trim();
  const industry = String(req.query.industry || '').trim();
  const experienceType = String(req.query.experienceType || '').trim();
  const company = String(req.query.company || '').trim();
  const q = String(req.query.q || '').trim();
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(30, Math.max(1, parseInt(String(req.query.limit || '10'), 10) || 10));
  const offset = (page - 1) * limit;

  const whereClauses: string[] = ["s.status = 'published'"];
  const params: Record<string, any> = { viewerId };

  if (category && category !== 'All') {
    whereClauses.push('s.category = :category');
    params.category = category;
  }
  if (industry && industry !== 'All') {
    whereClauses.push('s.industry = :industry');
    params.industry = industry;
  }
  if (experienceType && experienceType !== 'All') {
    whereClauses.push('s.experience_type = :experienceType');
    params.experienceType = experienceType;
  }
  if (company) {
    whereClauses.push(
      '(c.slug = :companyExact OR LOWER(COALESCE(c.name, s.company_descriptor, \'\')) LIKE :companyLike)'
    );
    params.companyExact = company.toLowerCase();
    params.companyLike = `%${company.toLowerCase()}%`;
  }
  if (q) {
    whereClauses.push(
      `(LOWER(s.title) LIKE :qLike
        OR LOWER(s.content) LIKE :qLike
        OR LOWER(s.key_lesson) LIKE :qLike
        OR LOWER(COALESCE(c.name, '')) LIKE :qLike
        OR LOWER(COALESCE(s.company_descriptor, '')) LIKE :qLike
        OR LOWER(s.industry) LIKE :qLike)`
    );
    params.qLike = `%${q.toLowerCase()}%`;
  }

  const whereSql = whereClauses.join(' AND ');

  let orderBy = 's.published_at DESC, s.created_at DESC';
  if (sort === 'discussed') {
    orderBy = 'comment_count DESC, helpful_count DESC, s.published_at DESC';
  } else if (sort === 'bookmarked') {
    orderBy = 'bookmark_count DESC, helpful_count DESC, s.published_at DESC';
  } else if (sort === 'helpful') {
    orderBy = 'helpful_count DESC, comment_count DESC, s.published_at DESC';
  }

  const countParams = { ...params };
  delete countParams.viewerId;

  const totalRow = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM stories s
       LEFT JOIN companies c ON c.id = s.company_id
       WHERE ${whereSql}`
    )
    .get(countParams) as { total: number };

  const rows = db
    .prepare(
      `${BASE_STORY_SELECT}
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT :limit OFFSET :offset`
    )
    .all({ ...params, limit, offset }) as RawStoryRow[];

  res.json({
    items: rows.map((r) =>
      formatStorySummary(r, req.viewer?.id || null, req.viewer?.role === 'moderator')
    ),
    total: totalRow.total,
    page,
    limit,
    hasMore: offset + rows.length < totalRow.total,
  });
});

// Personalized Home Dashboard payload
storiesRouter.get('/dashboard', requireAuth, (req: Request, res: Response) => {
  const viewer = req.viewer!;
  const isMod = viewer.role === 'moderator';

  const myRows = db
    .prepare(
      `${BASE_STORY_SELECT}
       WHERE s.author_id = :ownerId
       ORDER BY s.updated_at DESC`
    )
    .all({ viewerId: viewer.id, ownerId: viewer.id }) as RawStoryRow[];

  const bookmarkRows = db
    .prepare(
      `${BASE_STORY_SELECT}
       JOIN bookmarks myb ON myb.story_id = s.id AND myb.user_id = :ownerId
       WHERE s.status = 'published'
       ORDER BY myb.created_at DESC`
    )
    .all({ viewerId: viewer.id, ownerId: viewer.id }) as RawStoryRow[];

  const trendingRows = db
    .prepare(
      `${BASE_STORY_SELECT}
       WHERE s.status = 'published' AND (
         (SELECT COUNT(*) FROM comments cm WHERE cm.story_id = s.id AND cm.is_deleted = 0) > 0
         OR (SELECT COUNT(*) FROM story_reactions sr WHERE sr.story_id = s.id) > 0
       )
       ORDER BY (comment_count * 2 + helpful_count) DESC, s.published_at DESC
       LIMIT 5`
    )
    .all({ viewerId: viewer.id }) as RawStoryRow[];

  const recentRows = db
    .prepare(
      `${BASE_STORY_SELECT}
       WHERE s.status = 'published'
       ORDER BY s.published_at DESC
       LIMIT 6`
    )
    .all({ viewerId: viewer.id }) as RawStoryRow[];

  const interestRows = db
    .prepare('SELECT topic_type, topic_value FROM user_interests WHERE user_id = ?')
    .all(viewer.id) as { topic_type: string; topic_value: string }[];

  let relevantRows: RawStoryRow[] = [];
  if (interestRows.length > 0) {
    const cats = interestRows.filter((i) => i.topic_type === 'category').map((i) => i.topic_value);
    const inds = interestRows.filter((i) => i.topic_type === 'industry').map((i) => i.topic_value);
    const conds: string[] = [];
    const queryArgs: any[] = [viewer.id, viewer.id, viewer.id];
    if (cats.length > 0) {
      conds.push(`s.category IN (${cats.map(() => '?').join(', ')})`);
      queryArgs.push(...cats);
    }
    if (inds.length > 0) {
      conds.push(`s.industry IN (${inds.map(() => '?').join(', ')})`);
      queryArgs.push(...inds);
    }

    relevantRows = db
      .prepare(
        `${BASE_STORY_SELECT.replaceAll(':viewerId', '?')}
         WHERE s.status = 'published' AND (${conds.join(' OR ')})
         ORDER BY s.published_at DESC
         LIMIT 6`
      )
      .all(...queryArgs) as RawStoryRow[];
  }

  const lessonRows = db
    .prepare(
      `${BASE_STORY_SELECT}
       WHERE s.status = 'published'
       ORDER BY helpful_count DESC, bookmark_count DESC
       LIMIT 5`
    )
    .all({ viewerId: viewer.id }) as RawStoryRow[];

  const notifications = db
    .prepare(
      `SELECT id, type, title, body, link_url, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 15`
    )
    .all(viewer.id) as {
    id: string;
    type: string;
    title: string;
    body: string;
    link_url: string | null;
    is_read: number;
    created_at: string;
  }[];

  res.json({
    myStories: myRows.map((r) => formatStorySummary(r, viewer.id, isMod)),
    bookmarks: bookmarkRows.map((r) => formatStorySummary(r, viewer.id, isMod)),
    trending: trendingRows.map((r) => formatStorySummary(r, viewer.id, isMod)),
    recent: recentRows.map((r) => formatStorySummary(r, viewer.id, isMod)),
    relevant: relevantRows.map((r) => formatStorySummary(r, viewer.id, isMod)),
    popularLessons: lessonRows.map((r) => formatStorySummary(r, viewer.id, isMod)),
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      linkUrl: n.link_url,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    })),
  });
});

// Fetch private draft/submission for editing by author only
storiesRouter.get('/stories/draft/:id', requireAuth, (req: Request, res: Response) => {
  const row = db
    .prepare(
      `SELECT s.*, c.name AS company_name
       FROM stories s
       LEFT JOIN companies c ON c.id = s.company_id
       WHERE s.id = ? AND s.author_id = ?`
    )
    .get(req.params.id, req.viewer!.id) as any;

  if (!row) {
    res.status(404).json({ error: 'Draft not found or you do not have permission to edit it.' });
    return;
  }

  res.json({
    draft: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      content: row.content,
      category: row.category,
      industry: row.industry,
      employmentType: row.employment_type,
      companyName: row.company_name || '',
      companyDescriptor: row.company_descriptor || '',
      experienceType: row.experience_type,
      duration: row.duration,
      keyLesson: row.key_lesson,
      evidenceNote: row.evidence_note || '',
      evidenceFilename: row.evidence_filename || '',
      identityPreference: row.identity_preference,
      authorRoleContext: row.author_role_context || '',
      status: row.status,
      moderationNote: row.moderation_note || null,
      updatedAt: row.updated_at,
    },
  });
});

function resolveOrCreateCompany(companyName: string, industry: string): string | null {
  const cleaned = companyName.trim().slice(0, 90);
  if (!cleaned) return null;
  const slug = slugify(cleaned);
  if (!slug) return null;

  const existing = db
    .prepare('SELECT id FROM companies WHERE slug = ? OR LOWER(name) = LOWER(?)')
    .get(slug, cleaned) as { id: string } | undefined;

  if (existing) return existing.id;

  const id = createId('cmp');
  db.prepare(
    'INSERT INTO companies (id, name, slug, industry, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, cleaned, slug, industry, new Date().toISOString());
  return id;
}

function validateAndPersistStory(req: Request, res: Response, existingId?: string) {
  const viewer = req.viewer!;
  const intent = req.body?.intent === 'submit' ? 'submit' : 'draft';

  const title = String(req.body?.title || '').trim().slice(0, STORY_LIMITS.TITLE_MAX);
  const content = String(req.body?.content || '').trim().slice(0, STORY_LIMITS.CONTENT_MAX);
  const category = String(req.body?.category || 'Other');
  const industry = String(req.body?.industry || 'Other');
  const employmentType = String(req.body?.employmentType || 'Full-time');
  const companyName = String(req.body?.companyName || '').trim();
  const companyDescriptor = String(req.body?.companyDescriptor || '').trim().slice(0, 90);
  const experienceType = String(req.body?.experienceType || 'Voluntary exit');
  const duration = String(req.body?.duration || '1–2 years');
  const keyLesson = String(req.body?.keyLesson || '').trim().slice(0, STORY_LIMITS.LESSON_MAX);
  const evidenceNote = String(req.body?.evidenceNote || '')
    .trim()
    .slice(0, STORY_LIMITS.EVIDENCE_NOTE_MAX);
  const evidenceFilename = String(req.body?.evidenceFilename || '').trim().slice(0, 120);
  const evidenceFileData = req.body?.evidenceFileData
    ? String(req.body.evidenceFileData).slice(0, 350_000)
    : null;
  const identityPreference =
    req.body?.identityPreference === 'display_name' ? 'display_name' : 'anonymous';
  const authorRoleContext = String(req.body?.authorRoleContext || '').trim().slice(0, 70);

  if (intent === 'submit') {
    if (title.length < STORY_LIMITS.TITLE_MIN) {
      res.status(400).json({
        error: `Story title must be at least ${STORY_LIMITS.TITLE_MIN} characters.`,
      });
      return;
    }
    if (content.length < STORY_LIMITS.CONTENT_MIN) {
      res.status(400).json({
        error: `Please share at least ${STORY_LIMITS.CONTENT_MIN} characters so readers get meaningful context.`,
      });
      return;
    }
    if (keyLesson.length < STORY_LIMITS.LESSON_MIN) {
      res.status(400).json({
        error: `Please include a key lesson learned (${STORY_LIMITS.LESSON_MIN}+ characters).`,
      });
      return;
    }
    if (!(EXPERIENCE_CATEGORIES as readonly string[]).includes(category)) {
      res.status(400).json({ error: 'Please select a valid experience category.' });
      return;
    }
    if (!(INDUSTRIES as readonly string[]).includes(industry)) {
      res.status(400).json({ error: 'Please select a valid industry.' });
      return;
    }
    if (!(EMPLOYMENT_TYPES as readonly string[]).includes(employmentType)) {
      res.status(400).json({ error: 'Please select a valid employment type.' });
      return;
    }
    if (!(EXPERIENCE_TYPES as readonly string[]).includes(experienceType)) {
      res.status(400).json({ error: 'Please select a valid experience type.' });
      return;
    }
    if (!(EMPLOYMENT_DURATIONS as readonly string[]).includes(duration)) {
      res.status(400).json({ error: 'Please select an approximate employment duration.' });
      return;
    }
  }

  const safeTitle = title || 'Untitled workplace exit draft';
  const nowIso = new Date().toISOString();

  // Determine moderation care flag: serious categories or legal allegation keywords require careful review
  const seriousAllegationPattern =
    /\b(retaliat|harass|discriminat|illegal|fraud|unlawful|hostile|assault|whistleblow|hipaa|osha|eeoc|fmla)\b/i;
  const needsHighCare =
    (HIGH_CARE_CATEGORIES as readonly string[]).includes(category) ||
    seriousAllegationPattern.test(`${safeTitle} ${content}`);

  const moderationFlag = needsHighCare ? 'high_care_review' : 'standard';
  const nextStatus = intent === 'submit' ? 'pending_review' : 'draft';

  let storyId = existingId || '';
  let storySlug = '';

  runInTransaction(() => {
    const companyId = companyName ? resolveOrCreateCompany(companyName, industry) : null;

    if (existingId) {
      const existing = db
        .prepare('SELECT id, slug, author_id FROM stories WHERE id = ?')
        .get(existingId) as { id: string; slug: string; author_id: string } | undefined;

      if (!existing || existing.author_id !== viewer.id) {
        throw new Error('NOT_FOUND');
      }

      storySlug =
        intent === 'submit'
          ? `${slugify(safeTitle)}-${existing.id.slice(-4)}`
          : existing.slug;

      db.prepare(
        `UPDATE stories SET
          slug = ?, title = ?, content = ?, excerpt = ?, category = ?, industry = ?,
          employment_type = ?, company_id = ?, company_descriptor = ?, experience_type = ?,
          duration = ?, key_lesson = ?, evidence_note = ?,
          evidence_filename = COALESCE(NULLIF(?, ''), evidence_filename),
          evidence_file_data = COALESCE(?, evidence_file_data),
          identity_preference = ?, author_role_context = ?,
          status = ?, moderation_flag = ?, reading_time_minutes = ?,
          published_at = CASE WHEN ? = 'draft' THEN NULL ELSE published_at END,
          updated_at = ?
         WHERE id = ?`
      ).run(
        storySlug,
        safeTitle,
        content,
        buildExcerpt(content || safeTitle),
        category,
        industry,
        employmentType,
        companyId,
        companyName ? null : companyDescriptor || null,
        experienceType,
        duration,
        keyLesson,
        evidenceNote || null,
        evidenceFilename,
        evidenceFileData,
        identityPreference,
        authorRoleContext || null,
        nextStatus,
        moderationFlag,
        computeReadingTime(content || safeTitle),
        nextStatus,
        nowIso,
        existingId
      );
    } else {
      storyId = createId('sty');
      storySlug = `${slugify(safeTitle)}-${storyId.slice(-4)}`;

      db.prepare(
        `INSERT INTO stories (
          id, slug, author_id, title, content, excerpt, category, industry,
          employment_type, company_id, company_descriptor, experience_type, duration,
          key_lesson, evidence_note, evidence_filename, evidence_file_data,
          identity_preference, author_role_context, status, moderation_flag,
          reading_time_minutes, created_at, updated_at, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
      ).run(
        storyId,
        storySlug,
        viewer.id,
        safeTitle,
        content,
        buildExcerpt(content || safeTitle),
        category,
        industry,
        employmentType,
        companyId,
        companyName ? null : companyDescriptor || null,
        experienceType,
        duration,
        keyLesson,
        evidenceNote || null,
        evidenceFilename || null,
        evidenceFileData,
        identityPreference,
        authorRoleContext || null,
        nextStatus,
        moderationFlag,
        computeReadingTime(content || safeTitle),
        nowIso,
        nowIso
      );
    }

    if (intent === 'submit') {
      const mods = db
        .prepare("SELECT id FROM users WHERE role = 'moderator'")
        .all() as { id: string }[];
      const insNotif = db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, link_url, is_read, created_at)
         VALUES (?, ?, 'moderation_queue', ?, ?, '/moderation', 0, ?)`
      );
      for (const m of mods) {
        insNotif.run(
          createId('ntf'),
          m.id,
          moderationFlag === 'high_care_review'
            ? `High-care review queued: "${safeTitle.slice(0, 60)}"`
            : `New story submitted for review: "${safeTitle.slice(0, 60)}"`,
          `Category: ${category} · Identity: ${identityPreference === 'anonymous' ? 'Anonymous' : '@' + viewer.displayName}`,
          nowIso
        );
      }
    }
  });

  res.status(existingId ? 200 : 201).json({
    ok: true,
    id: storyId,
    slug: storySlug,
    status: nextStatus,
    moderationFlag,
    updatedAt: nowIso,
  });
}

storiesRouter.post('/stories', requireAuth, (req: Request, res: Response) => {
  try {
    validateAndPersistStory(req, res);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Unable to save story.' });
  }
});

storiesRouter.put('/stories/:id', requireAuth, (req: Request, res: Response) => {
  try {
    validateAndPersistStory(req, res, String(req.params.id));
  } catch (err: any) {
    if (err?.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Story not found.' });
      return;
    }
    res.status(500).json({ error: err?.message || 'Unable to update story.' });
  }
});

storiesRouter.delete('/stories/:id', requireAuth, (req: Request, res: Response) => {
  const row = db
    .prepare('SELECT id, author_id FROM stories WHERE id = ?')
    .get(req.params.id) as { id: string; author_id: string } | undefined;

  if (!row) {
    res.status(404).json({ error: 'Story not found.' });
    return;
  }
  if (row.author_id !== req.viewer!.id && req.viewer!.role !== 'moderator') {
    res.status(403).json({ error: 'You can only delete your own stories.' });
    return;
  }

  db.prepare('DELETE FROM stories WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

// Single story detail + threaded comments
storiesRouter.get('/stories/:slug', (req: Request, res: Response) => {
  const viewerId = req.viewer?.id || '';
  const isMod = req.viewer?.role === 'moderator';

  const row = db
    .prepare(
      `${BASE_STORY_SELECT}
       WHERE s.slug = :slug OR s.id = :slug`
    )
    .get({ viewerId, slug: req.params.slug }) as RawStoryRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Story not found.' });
    return;
  }

  // Strictly block access to drafts or pending submissions for anyone except author or moderator
  if (row.status !== 'published' && row.author_id !== viewerId && !isMod) {
    res.status(404).json({ error: 'This story is not publicly available.' });
    return;
  }

  let companyStoryCount = 0;
  if (row.company_id) {
    const cnt = db
      .prepare("SELECT COUNT(*) as count FROM stories WHERE status = 'published' AND company_id = ?")
      .get(row.company_id) as { count: number };
    companyStoryCount = cnt.count;
  }

  const summary = formatStorySummary(row, req.viewer?.id || null, isMod);
  const canSeePrivateVerification = row.author_id === viewerId || isMod;

  const detail: StoryDetail = {
    ...summary,
    content: row.content,
    companyStoryCount,
    evidenceNote: canSeePrivateVerification ? row.evidence_note : undefined,
    evidenceFilename: canSeePrivateVerification ? row.evidence_filename : undefined,
  };

  // Load threaded comments
  const commentRows = db
    .prepare(
      `SELECT
        cm.id,
        cm.story_id,
        cm.author_id,
        u.display_name,
        u.role_headline,
        cm.parent_id,
        cm.body,
        cm.is_anonymous,
        cm.is_deleted,
        cm.created_at,
        cm.updated_at,
        COALESCE((SELECT SUM(cv.value) FROM comment_votes cv WHERE cv.comment_id = cm.id), 0) AS score,
        COALESCE((SELECT cv.value FROM comment_votes cv WHERE cv.comment_id = cm.id AND cv.user_id = ?), 0) AS viewer_vote
       FROM comments cm
       JOIN users u ON u.id = cm.author_id
       WHERE cm.story_id = ?
       ORDER BY cm.created_at ASC`
    )
    .all(viewerId, row.id) as any[];

  const comments: CommentItem[] = commentRows.map((c) => {
    const isOP = c.author_id === row.author_id;
    // Protect OP's identity automatically if the story itself is anonymous and OP chose anon or handle protection!
    const effectiveAnon = Boolean(c.is_anonymous) || (isOP && row.identity_preference === 'anonymous');
    return {
      id: c.id,
      storyId: c.story_id,
      parentId: c.parent_id,
      body: c.is_deleted ? '[Comment removed by author]' : c.body,
      authorLabel: c.is_deleted
        ? '[removed]'
        : effectiveAnon
          ? isOP
            ? 'Original Author'
            : 'Anonymous member'
          : `@${c.display_name}`,
      authorHandle: c.is_deleted || effectiveAnon ? null : c.display_name,
      isAnonymous: effectiveAnon,
      isOriginalPoster: !c.is_deleted && isOP,
      isOwnComment: Boolean(viewerId && c.author_id === viewerId),
      isDeleted: Boolean(c.is_deleted),
      score: Number(c.score || 0),
      viewerVote: Number(c.viewer_vote || 0),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    };
  });

  // Also fetch 3 related published stories in same category or company
  const relatedRows = db
    .prepare(
      `${BASE_STORY_SELECT}
       WHERE s.status = 'published' AND s.id != :currentId
         AND (s.category = :category OR (s.company_id IS NOT NULL AND s.company_id = :companyId))
       ORDER BY s.published_at DESC
       LIMIT 3`
    )
    .all({
      viewerId,
      currentId: row.id,
      category: row.category,
      companyId: row.company_id || '',
    }) as RawStoryRow[];

  res.json({
    story: detail,
    comments,
    related: relatedRows.map((r) => formatStorySummary(r, req.viewer?.id || null, isMod)),
  });
});

// Toggle Helpful / Relatable reaction
storiesRouter.post('/stories/:id/react', requireAuth, (req: Request, res: Response) => {
  const viewer = req.viewer!;
  const reactionType = req.body?.type === 'relatable' ? 'relatable' : 'helpful';
  const story = db
    .prepare("SELECT id, slug, title, author_id, status FROM stories WHERE id = ? AND status = 'published'")
    .get(req.params.id) as
    | { id: string; slug: string; title: string; author_id: string; status: string }
    | undefined;

  if (!story) {
    res.status(404).json({ error: 'Published story not found.' });
    return;
  }

  const existing = db
    .prepare(
      'SELECT 1 FROM story_reactions WHERE story_id = ? AND user_id = ? AND reaction_type = ?'
    )
    .get(story.id, viewer.id, reactionType);

  const nowIso = new Date().toISOString();
  if (existing) {
    db.prepare(
      'DELETE FROM story_reactions WHERE story_id = ? AND user_id = ? AND reaction_type = ?'
    ).run(story.id, viewer.id, reactionType);
  } else {
    db.prepare(
      'INSERT INTO story_reactions (story_id, user_id, reaction_type, created_at) VALUES (?, ?, ?, ?)'
    ).run(story.id, viewer.id, reactionType, nowIso);

    if (story.author_id !== viewer.id && reactionType === 'helpful') {
      db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, link_url, is_read, created_at)
         VALUES (?, ?, 'story_helpful', ?, ?, ?, 0, ?)`
      ).run(
        createId('ntf'),
        story.author_id,
        'Someone marked your story as helpful',
        `"${story.title.slice(0, 75)}"`,
        `/stories/${story.slug}`,
        nowIso
      );
    }
  }

  const helpful = db
    .prepare(
      "SELECT COUNT(*) as count FROM story_reactions WHERE story_id = ? AND reaction_type = 'helpful'"
    )
    .get(story.id) as { count: number };
  const relatable = db
    .prepare(
      "SELECT COUNT(*) as count FROM story_reactions WHERE story_id = ? AND reaction_type = 'relatable'"
    )
    .get(story.id) as { count: number };
  const viewerHelpful = db
    .prepare(
      "SELECT 1 FROM story_reactions WHERE story_id = ? AND user_id = ? AND reaction_type = 'helpful'"
    )
    .get(story.id, viewer.id);
  const viewerRelatable = db
    .prepare(
      "SELECT 1 FROM story_reactions WHERE story_id = ? AND user_id = ? AND reaction_type = 'relatable'"
    )
    .get(story.id, viewer.id);

  res.json({
    helpfulCount: helpful.count,
    relatableCount: relatable.count,
    viewerHelpful: Boolean(viewerHelpful),
    viewerRelatable: Boolean(viewerRelatable),
  });
});

// Toggle Bookmark
storiesRouter.post('/stories/:id/bookmark', requireAuth, (req: Request, res: Response) => {
  const viewer = req.viewer!;
  const story = db
    .prepare("SELECT id FROM stories WHERE id = ? AND status = 'published'")
    .get(req.params.id) as { id: string } | undefined;

  if (!story) {
    res.status(404).json({ error: 'Story not found.' });
    return;
  }

  const existing = db
    .prepare('SELECT 1 FROM bookmarks WHERE story_id = ? AND user_id = ?')
    .get(story.id, viewer.id);

  if (existing) {
    db.prepare('DELETE FROM bookmarks WHERE story_id = ? AND user_id = ?').run(story.id, viewer.id);
  } else {
    db.prepare('INSERT INTO bookmarks (story_id, user_id, created_at) VALUES (?, ?, ?)').run(
      story.id,
      viewer.id,
      new Date().toISOString()
    );
  }

  const countRow = db
    .prepare('SELECT COUNT(*) as count FROM bookmarks WHERE story_id = ?')
    .get(story.id) as { count: number };

  res.json({
    viewerBookmarked: !existing,
    bookmarkCount: countRow.count,
  });
});

// Post a comment or nested reply
storiesRouter.post('/stories/:id/comments', requireAuth, (req: Request, res: Response) => {
  const viewer = req.viewer!;
  const body = String(req.body?.body || '').trim();
  const parentId = req.body?.parentId ? String(req.body.parentId) : null;
  const isAnonymous = Boolean(req.body?.isAnonymous);

  if (body.length < 2) {
    res.status(400).json({ error: 'Comment cannot be empty.' });
    return;
  }
  if (body.length > STORY_LIMITS.COMMENT_MAX) {
    res.status(400).json({
      error: `Comment cannot exceed ${STORY_LIMITS.COMMENT_MAX} characters.`,
    });
    return;
  }

  const story = db
    .prepare(
      "SELECT id, slug, title, author_id, identity_preference FROM stories WHERE id = ? AND status = 'published'"
    )
    .get(req.params.id) as
    | {
        id: string;
        slug: string;
        title: string;
        author_id: string;
        identity_preference: 'display_name' | 'anonymous';
      }
    | undefined;

  if (!story) {
    res.status(404).json({ error: 'Story not found.' });
    return;
  }

  let parentComment: { id: string; author_id: string } | undefined;
  if (parentId) {
    parentComment = db
      .prepare('SELECT id, author_id FROM comments WHERE id = ? AND story_id = ?')
      .get(parentId, story.id) as { id: string; author_id: string } | undefined;
    if (!parentComment) {
      res.status(400).json({ error: 'Parent comment does not exist.' });
      return;
    }
  }

  const commentId = createId('cmt');
  const nowIso = new Date().toISOString();
  const isOP = viewer.id === story.author_id;
  const effectiveAnon = isAnonymous || (isOP && story.identity_preference === 'anonymous');

  runInTransaction(() => {
    db.prepare(
      `INSERT INTO comments (id, story_id, author_id, parent_id, body, is_anonymous, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(commentId, story.id, viewer.id, parentId, body, effectiveAnon ? 1 : 0, nowIso, nowIso);

    // Self-upvote initial score = 1, just like Reddit
    db.prepare(
      'INSERT INTO comment_votes (comment_id, user_id, value, created_at) VALUES (?, ?, 1, ?)'
    ).run(commentId, viewer.id, nowIso);

    const senderLabel = effectiveAnon ? 'Someone' : `@${viewer.displayName}`;
    if (parentComment && parentComment.author_id !== viewer.id) {
      db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, link_url, is_read, created_at)
         VALUES (?, ?, 'comment_reply', ?, ?, ?, 0, ?)`
      ).run(
        createId('ntf'),
        parentComment.author_id,
        `${senderLabel} replied to your comment`,
        `"${body.slice(0, 90)}${body.length > 90 ? '…' : ''}"`,
        `/stories/${story.slug}#comment-${commentId}`,
        nowIso
      );
    } else if (story.author_id !== viewer.id) {
      db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, link_url, is_read, created_at)
         VALUES (?, ?, 'story_comment', ?, ?, ?, 0, ?)`
      ).run(
        createId('ntf'),
        story.author_id,
        `${senderLabel} commented on your story`,
        `"${body.slice(0, 90)}${body.length > 90 ? '…' : ''}"`,
        `/stories/${story.slug}#comment-${commentId}`,
        nowIso
      );
    }
  });

  const item: CommentItem = {
    id: commentId,
    storyId: story.id,
    parentId,
    body,
    authorLabel: effectiveAnon
      ? isOP
        ? 'Original Author'
        : 'Anonymous member'
      : `@${viewer.displayName}`,
    authorHandle: effectiveAnon ? null : viewer.displayName,
    isAnonymous: effectiveAnon,
    isOriginalPoster: isOP,
    isOwnComment: true,
    isDeleted: false,
    score: 1,
    viewerVote: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  res.status(201).json({ comment: item });
});

// Vote on comment (+1 / -1 toggle)
storiesRouter.post('/comments/:id/vote', requireAuth, (req: Request, res: Response) => {
  const viewer = req.viewer!;
  const rawVal = Number(req.body?.value);
  const value = rawVal === -1 ? -1 : 1;

  const comment = db
    .prepare('SELECT id FROM comments WHERE id = ?')
    .get(req.params.id) as { id: string } | undefined;

  if (!comment) {
    res.status(404).json({ error: 'Comment not found.' });
    return;
  }

  const existing = db
    .prepare('SELECT value FROM comment_votes WHERE comment_id = ? AND user_id = ?')
    .get(comment.id, viewer.id) as { value: number } | undefined;

  let viewerVote = value;
  if (existing && existing.value === value) {
    db.prepare('DELETE FROM comment_votes WHERE comment_id = ? AND user_id = ?').run(
      comment.id,
      viewer.id
    );
    viewerVote = 0;
  } else {
    db.prepare(
      `INSERT INTO comment_votes (comment_id, user_id, value, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(comment_id, user_id) DO UPDATE SET value = excluded.value`
    ).run(comment.id, viewer.id, value, new Date().toISOString());
  }

  const scoreRow = db
    .prepare('SELECT COALESCE(SUM(value), 0) as score FROM comment_votes WHERE comment_id = ?')
    .get(comment.id) as { score: number };

  res.json({
    score: Number(scoreRow.score || 0),
    viewerVote,
  });
});

// Delete own comment (soft-delete if replies exist, hard-delete leaf)
storiesRouter.delete('/comments/:id', requireAuth, (req: Request, res: Response) => {
  const viewer = req.viewer!;
  const comment = db
    .prepare('SELECT id, author_id FROM comments WHERE id = ?')
    .get(req.params.id) as { id: string; author_id: string } | undefined;

  if (!comment) {
    res.status(404).json({ error: 'Comment not found.' });
    return;
  }
  if (comment.author_id !== viewer.id && viewer.role !== 'moderator') {
    res.status(403).json({ error: 'You can only delete your own comments.' });
    return;
  }

  const hasReplies = db
    .prepare('SELECT 1 FROM comments WHERE parent_id = ? LIMIT 1')
    .get(comment.id);

  if (hasReplies) {
    db.prepare('UPDATE comments SET is_deleted = 1, body = ?, updated_at = ? WHERE id = ?').run(
      '[Comment removed by author]',
      new Date().toISOString(),
      comment.id
    );
    res.json({ ok: true, mode: 'soft' });
  } else {
    db.prepare('DELETE FROM comments WHERE id = ?').run(comment.id);
    res.json({ ok: true, mode: 'hard' });
  }
});
