import { Router, Request, Response } from 'express';
import { db, runInTransaction } from '../db';
import { requireAuth, requireModerator } from '../authMiddleware';
import { createId } from '../security';
import { REPORT_REASONS } from '../../shared/constants';

export const moderationRouter = Router();

// Community reporting (stories or comments)
moderationRouter.post('/reports', requireAuth, (req: Request, res: Response) => {
  const viewer = req.viewer!;
  const targetType = req.body?.targetType === 'comment' ? 'comment' : 'story';
  const targetId = String(req.body?.targetId || '').trim();
  const reason = String(req.body?.reason || '').trim();
  const details = String(req.body?.details || '').trim().slice(0, 1000);

  if (!targetId) {
    res.status(400).json({ error: 'Report target is missing.' });
    return;
  }
  if (!reason) {
    res.status(400).json({ error: 'Please choose a reason for reporting.' });
    return;
  }

  const reportId = createId('rpt');
  const nowIso = new Date().toISOString();

  runInTransaction(() => {
    db.prepare(
      `INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`
    ).run(
      reportId,
      viewer.id,
      targetType,
      targetId,
      (REPORT_REASONS as readonly string[]).includes(reason) ? reason : reason.slice(0, 140),
      details,
      nowIso
    );

    const mods = db
      .prepare("SELECT id FROM users WHERE role = 'moderator'")
      .all() as { id: string }[];
    const insNotif = db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, link_url, is_read, created_at)
       VALUES (?, ?, 'report_opened', ?, ?, '/moderation', 0, ?)`
    );
    for (const m of mods) {
      insNotif.run(
        createId('ntf'),
        m.id,
        `New ${targetType} report filed`,
        reason,
        nowIso
      );
    }
  });

  res.status(201).json({
    ok: true,
    message:
      'Thank you. Our moderation team reviews every report for private information, harassment, and community policy compliance.',
  });
});

// User notifications API
moderationRouter.get('/notifications', requireAuth, (req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT id, type, title, body, link_url, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 30`
    )
    .all(req.viewer!.id) as any[];

  res.json({
    notifications: rows.map((n) => ({
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

moderationRouter.post('/notifications/read', requireAuth, (req: Request, res: Response) => {
  const id = req.body?.id ? String(req.body.id) : null;
  if (id) {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(
      id,
      req.viewer!.id
    );
  } else {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.viewer!.id);
  }
  res.json({ ok: true });
});

// Moderator review desk queue
moderationRouter.get('/moderation/queue', requireModerator, (_req: Request, res: Response) => {
  const pendingStories = db
    .prepare(
      `SELECT
        s.id, s.slug, s.title, s.content, s.category, s.industry, s.employment_type,
        c.name AS company_name, s.company_descriptor, s.experience_type, s.duration,
        s.key_lesson, s.evidence_note, s.evidence_filename, s.identity_preference,
        s.author_role_context, s.status, s.moderation_flag, s.moderation_note,
        s.created_at, s.updated_at,
        u.display_name AS account_handle
       FROM stories s
       JOIN users u ON u.id = s.author_id
       LEFT JOIN companies c ON c.id = s.company_id
       WHERE s.status IN ('pending_review', 'needs_revision')
       ORDER BY
         CASE WHEN s.moderation_flag = 'high_care_review' THEN 0 ELSE 1 END,
         s.updated_at DESC`
    )
    .all() as any[];

  const openReports = db
    .prepare(
      `SELECT
        r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at,
        u.display_name AS reporter_handle,
        CASE
          WHEN r.target_type = 'story' THEN (SELECT title FROM stories WHERE id = r.target_id)
          ELSE (SELECT SUBSTR(body, 1, 140) FROM comments WHERE id = r.target_id)
        END AS target_preview,
        CASE
          WHEN r.target_type = 'story' THEN (SELECT slug FROM stories WHERE id = r.target_id)
          ELSE (
            SELECT st.slug FROM comments cm
            JOIN stories st ON st.id = cm.story_id
            WHERE cm.id = r.target_id
          )
        END AS story_slug
       FROM reports r
       LEFT JOIN users u ON u.id = r.reporter_id
       WHERE r.status = 'open'
       ORDER BY r.created_at DESC`
    )
    .all() as any[];

  res.json({
    pendingStories: pendingStories.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      content: s.content,
      category: s.category,
      industry: s.industry,
      employmentType: s.employment_type,
      companyName: s.company_name,
      companyDescriptor: s.company_descriptor,
      experienceType: s.experience_type,
      duration: s.duration,
      keyLesson: s.key_lesson,
      evidenceNote: s.evidence_note,
      evidenceFilename: s.evidence_filename,
      identityPreference: s.identity_preference,
      authorRoleContext: s.author_role_context,
      accountHandle: s.account_handle,
      status: s.status,
      moderationFlag: s.moderation_flag,
      moderationNote: s.moderation_note,
      updatedAt: s.updated_at,
    })),
    openReports: openReports.map((r) => ({
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      details: r.details,
      reporterHandle: r.reporter_handle || 'Member',
      targetPreview: r.target_preview || '[Deleted item]',
      storySlug: r.story_slug || null,
      createdAt: r.created_at,
    })),
  });
});

// Moderator decision on submitted story
moderationRouter.post(
  '/moderation/stories/:id/decision',
  requireModerator,
  (req: Request, res: Response) => {
    const mod = req.viewer!;
    const action = String(req.body?.action || '');
    const note = String(req.body?.note || '').trim().slice(0, 600);

    if (!['approve', 'request_revision', 'reject'].includes(action)) {
      res.status(400).json({ error: 'Invalid moderation decision.' });
      return;
    }

    const story = db
      .prepare('SELECT id, slug, title, author_id FROM stories WHERE id = ?')
      .get(req.params.id) as
      | { id: string; slug: string; title: string; author_id: string }
      | undefined;

    if (!story) {
      res.status(404).json({ error: 'Story not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const newStatus =
      action === 'approve'
        ? 'published'
        : action === 'request_revision'
          ? 'needs_revision'
          : 'rejected';

    runInTransaction(() => {
      db.prepare(
        `UPDATE stories
         SET status = ?,
             moderation_note = ?,
             reviewed_by = ?,
             published_at = CASE WHEN ? = 'published' THEN ? ELSE NULL END,
             updated_at = ?
         WHERE id = ?`
      ).run(
        newStatus,
        note || null,
        mod.id,
        newStatus,
        nowIso,
        nowIso,
        story.id
      );

      const notifTitle =
        action === 'approve'
          ? 'Your story is now live on ExitVoice'
          : action === 'request_revision'
            ? 'Revision requested before publishing your story'
            : 'Update regarding your story submission';

      const notifBody =
        note ||
        (action === 'approve'
          ? `"${story.title}" passed community review and is visible in Explore Stories.`
          : 'Open your dashboard draft to review moderator feedback.');

      db.prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, link_url, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
      ).run(
        createId('ntf'),
        story.author_id,
        action === 'approve' ? 'moderation_approved' : 'moderation_revision',
        notifTitle,
        notifBody,
        action === 'approve' ? `/stories/${story.slug}` : `/submit/${story.id}`,
        nowIso
      );
    });

    res.json({ ok: true, status: newStatus, slug: story.slug });
  }
);

moderationRouter.post(
  '/moderation/reports/:id/resolve',
  requireModerator,
  (req: Request, res: Response) => {
    const mod = req.viewer!;
    const action = req.body?.action === 'remove_target' ? 'remove_target' : 'dismiss';
    const note = String(req.body?.note || '').trim().slice(0, 400);

    const report = db
      .prepare('SELECT id, target_type, target_id FROM reports WHERE id = ?')
      .get(req.params.id) as
      | { id: string; target_type: 'story' | 'comment'; target_id: string }
      | undefined;

    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    runInTransaction(() => {
      if (action === 'remove_target') {
        if (report.target_type === 'story') {
          db.prepare("UPDATE stories SET status = 'needs_revision', moderation_note = ? WHERE id = ?").run(
            note || 'Unpublished following community report; please remove identifying details.',
            report.target_id
          );
        } else {
          db.prepare('UPDATE comments SET is_deleted = 1, body = ? WHERE id = ?').run(
            '[Removed by moderator for community guideline compliance]',
            report.target_id
          );
        }
      }

      db.prepare(
        `UPDATE reports
         SET status = ?, resolution_note = ?, resolved_by = ?, resolved_at = ?
         WHERE id = ?`
      ).run(
        action === 'remove_target' ? 'resolved' : 'dismissed',
        note || null,
        mod.id,
        nowIso,
        report.id
      );
    });

    res.json({ ok: true });
  }
);
