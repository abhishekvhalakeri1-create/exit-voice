import { Router, Request, Response } from 'express';
import { db } from '../db';
import { formatStorySummary } from './stories';
import { CompanySummary } from '../../shared/types';
import { ExperienceCategory, Industry } from '../../shared/constants';

export const companiesRouter = Router();

companiesRouter.get('/suggest', (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const rows = q
    ? (db
        .prepare(
          `SELECT id, name, slug, industry FROM companies
           WHERE LOWER(name) LIKE ?
           ORDER BY name ASC LIMIT 8`
        )
        .all(`%${q}%`) as any[])
    : (db
        .prepare('SELECT id, name, slug, industry FROM companies ORDER BY name ASC LIMIT 8')
        .all() as any[]);

  res.json({ companies: rows });
});

companiesRouter.get('/', (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const industry = String(req.query.industry || '').trim();

  const clauses: string[] = [];
  const args: any[] = [];
  if (q) {
    clauses.push('LOWER(c.name) LIKE ?');
    args.push(`%${q}%`);
  }
  if (industry && industry !== 'All') {
    clauses.push('c.industry = ?');
    args.push(industry);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const companyRows = db
    .prepare(
      `SELECT
        c.id,
        c.name,
        c.slug,
        c.industry,
        c.headquarters,
        c.size_range,
        COUNT(s.id) AS story_count,
        MAX(s.published_at) AS latest_story_at
       FROM companies c
       LEFT JOIN stories s ON s.company_id = c.id AND s.status = 'published'
       ${whereSql}
       GROUP BY c.id
       HAVING COUNT(s.id) > 0
       ORDER BY story_count DESC, latest_story_at DESC`
    )
    .all(...args) as any[];

  const catStmt = db.prepare(
    `SELECT category, COUNT(*) as count
     FROM stories
     WHERE company_id = ? AND status = 'published'
     GROUP BY category
     ORDER BY count DESC`
  );

  const items: CompanySummary[] = companyRows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    industry: r.industry as Industry,
    headquarters: r.headquarters,
    sizeRange: r.size_range,
    storyCount: Number(r.story_count || 0),
    topCategories: (catStmt.all(r.id) as { category: ExperienceCategory; count: number }[]).slice(
      0,
      4
    ),
    latestStoryAt: r.latest_story_at,
  }));

  res.json({ companies: items });
});

companiesRouter.get('/:slug', (req: Request, res: Response) => {
  const viewerId = req.viewer?.id || '';
  const company = db
    .prepare('SELECT id, name, slug, industry, headquarters, size_range FROM companies WHERE slug = ?')
    .get(req.params.slug) as any;

  if (!company) {
    res.status(404).json({ error: 'Company page not found.' });
    return;
  }

  const catBreakdown = db
    .prepare(
      `SELECT category, COUNT(*) as count
       FROM stories
       WHERE company_id = ? AND status = 'published'
       GROUP BY category
       ORDER BY count DESC`
    )
    .all(company.id) as { category: ExperienceCategory; count: number }[];

  const storyRows = db
    .prepare(
      `SELECT
        s.*,
        u.display_name AS author_display_name,
        u.role_headline AS author_headline,
        c.name AS company_name,
        c.slug AS company_slug,
        (SELECT COUNT(*) FROM story_reactions sr WHERE sr.story_id = s.id AND sr.reaction_type = 'helpful') AS helpful_count,
        (SELECT COUNT(*) FROM story_reactions sr WHERE sr.story_id = s.id AND sr.reaction_type = 'relatable') AS relatable_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.story_id = s.id AND cm.is_deleted = 0) AS comment_count,
        (SELECT COUNT(*) FROM bookmarks bm WHERE bm.story_id = s.id) AS bookmark_count,
        (SELECT COUNT(*) FROM story_reactions sr WHERE sr.story_id = s.id AND sr.user_id = ? AND sr.reaction_type = 'helpful') AS viewer_helpful,
        (SELECT COUNT(*) FROM story_reactions sr WHERE sr.story_id = s.id AND sr.user_id = ? AND sr.reaction_type = 'relatable') AS viewer_relatable,
        (SELECT COUNT(*) FROM bookmarks bm WHERE bm.story_id = s.id AND bm.user_id = ?) AS viewer_bookmarked
       FROM stories s
       JOIN users u ON u.id = s.author_id
       LEFT JOIN companies c ON c.id = s.company_id
       WHERE s.company_id = ? AND s.status = 'published'
       ORDER BY s.published_at DESC`
    )
    .all(viewerId, viewerId, viewerId, company.id) as any[];

  res.json({
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      industry: company.industry,
      headquarters: company.headquarters,
      sizeRange: company.size_range,
      storyCount: storyRows.length,
      topCategories: catBreakdown,
      latestStoryAt: storyRows[0]?.published_at || null,
    },
    stories: storyRows.map((r) =>
      formatStorySummary(r, req.viewer?.id || null, req.viewer?.role === 'moderator')
    ),
  });
});
