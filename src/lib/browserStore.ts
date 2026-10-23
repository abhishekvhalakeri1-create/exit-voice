import {
  SEED_COMMENTS,
  SEED_COMPANIES,
  SEED_STORIES,
  SEED_USERS,
  calcReadingMinutes,
  isoDaysAgo,
  makeExcerpt,
  slugifyText,
} from '../../shared/seedData';
import {
  EXPERIENCE_CATEGORIES,
  HIGH_CARE_CATEGORIES,
  INDUSTRIES,
  STORY_LIMITS,
} from '../../shared/constants';
import { AuthUser, CommentItem, StoryDetail, StorySummary } from '../../shared/types';

const STORAGE_KEY = 'ev_standalone_store_v1';

interface LocalState {
  currentUserId: string | null;
  lastEmailHint: string | null;
  users: any[];
  companies: any[];
  stories: any[];
  comments: any[];
  reactions: { storyId: string; userId: string; type: 'helpful' | 'relatable' }[];
  bookmarks: { storyId: string; userId: string; createdAt: string }[];
  commentVotes: { commentId: string; userId: string; value: number }[];
  reports: any[];
  notifications: any[];
  mailbox: any[];
  tokens: { token: string; userId: string; type: 'email_verify' | 'password_reset'; used: boolean }[];
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

function buildInitialState(): LocalState {
  const users = SEED_USERS.map((u) => ({
    id: u.id,
    email: u.email,
    password: 'ExitVoice2026!',
    displayName: u.handle,
    roleHeadline: u.headline,
    bio: u.bio,
    role: u.role,
    emailVerified: true,
    defaultAnonymous: Boolean(u.anon),
    categories:
      u.id === 'usr_maya'
        ? ['Layoff', 'Resignation', 'Management issues', 'Positive exit']
        : ['Layoff', 'Positive exit'],
    industries:
      u.id === 'usr_maya'
        ? ['Financial Services & Accounting', 'Technology & Software']
        : [],
    createdAt: isoDaysAgo(u.days),
  }));

  const companies = SEED_COMPANIES.map((c) => ({
    id: c.id,
    name: c.name,
    slug: slugifyText(c.name),
    industry: c.industry,
    headquarters: c.hq,
    sizeRange: c.size,
  }));

  const storySlugs = new Map<string, string>();
  const stories = SEED_STORIES.map((s) => {
    const ts = isoDaysAgo(s.daysAgo, 2);
    const slug = `${slugifyText(s.title)}-${s.id.slice(-4)}`;
    storySlugs.set(s.id, slug);
    return {
      id: s.id,
      slug,
      authorId: s.authorId,
      title: s.title,
      content: s.content,
      excerpt: makeExcerpt(s.content),
      category: s.category,
      industry: s.industry,
      employmentType: s.employmentType,
      companyId: s.companyId,
      companyDescriptor: s.companyDescriptor,
      experienceType: s.experienceType,
      duration: s.duration,
      keyLesson: s.keyLesson,
      evidenceNote: s.evidenceNote,
      evidenceFilename: null,
      identityPreference: s.identityPreference,
      authorRoleContext: s.roleContext,
      status: s.status,
      moderationFlag: s.modFlag,
      moderationNote: null,
      readingTimeMinutes: calcReadingMinutes(s.content),
      createdAt: ts,
      updatedAt: ts,
      publishedAt: s.status === 'published' ? ts : null,
    };
  });

  const comments = SEED_COMMENTS.map((c) => {
    const ts = isoDaysAgo(0, c.hoursAgo);
    return {
      id: c.id,
      storyId: c.storyId,
      authorId: c.authorId,
      parentId: c.parentId,
      body: c.body,
      isAnonymous: Boolean(c.anon),
      isDeleted: false,
      createdAt: ts,
      updatedAt: ts,
    };
  });

  const allUserIds = users.map((u) => u.id);
  const reactionCounts: Record<string, number> = {
    sty_01: 8,
    sty_02: 9,
    sty_03: 7,
    sty_04: 6,
    sty_05: 5,
    sty_06: 7,
    sty_07: 8,
    sty_08: 6,
    sty_09: 7,
    sty_10: 4,
  };
  const reactions: LocalState['reactions'] = [];
  for (const [storyId, count] of Object.entries(reactionCounts)) {
    for (let i = 0; i < Math.min(count, allUserIds.length); i++) {
      reactions.push({ storyId, userId: allUserIds[i], type: 'helpful' });
      if (i % 2 === 0) reactions.push({ storyId, userId: allUserIds[i], type: 'relatable' });
    }
  }

  const bookmarkPairs: [string, string][] = [
    ['sty_01', 'usr_maya'],
    ['sty_07', 'usr_maya'],
    ['sty_09', 'usr_maya'],
    ['sty_01', 'usr_claire'],
    ['sty_01', 'usr_nate'],
    ['sty_02', 'usr_maya'],
    ['sty_02', 'usr_samir'],
    ['sty_02', 'usr_priya'],
    ['sty_03', 'usr_samir'],
    ['sty_03', 'usr_derrick'],
    ['sty_04', 'usr_claire'],
    ['sty_07', 'usr_samir'],
    ['sty_08', 'usr_nate'],
    ['sty_09', 'usr_hannah'],
  ];
  const bookmarks = bookmarkPairs.map(([storyId, userId]) => ({
    storyId,
    userId,
    createdAt: isoDaysAgo(2),
  }));

  const commentVotes: LocalState['commentVotes'] = [];
  for (const c of SEED_COMMENTS) {
    for (const uid of allUserIds.filter((u) => u !== c.authorId).slice(0, 4)) {
      commentVotes.push({ commentId: c.id, userId: uid, value: 1 });
    }
  }

  const notifications = [
    {
      id: 'ntf_01',
      userId: 'usr_maya',
      type: 'story_comment',
      title: 'u/samir_infra replied to your story',
      body: '"The backchannel reference point is underrated. Internet advice always says burn it down..."',
      linkUrl: `/stories/${storySlugs.get('sty_04')}`,
      isRead: false,
      createdAt: isoDaysAgo(1, 3),
    },
    {
      id: 'ntf_mod_01',
      userId: 'usr_mod',
      type: 'moderation_queue',
      title: '1 story awaiting editorial safety review',
      body: 'High-care category submission ("Termination") queued for PII & redaction check.',
      linkUrl: '/moderation',
      isRead: false,
      createdAt: isoDaysAgo(1),
    },
  ];

  return {
    currentUserId: null,
    lastEmailHint: null,
    users,
    companies,
    stories,
    comments,
    reactions,
    bookmarks,
    commentVotes,
    reports: [],
    notifications,
    mailbox: [],
    tokens: [],
  };
}

function getState(): LocalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const init = buildInitialState();
  saveState(init);
  return init;
}

function saveState(state: LocalState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function serializeUser(state: LocalState, userId: string | null): AuthUser | null {
  if (!userId) return null;
  const u = state.users.find((x) => x.id === userId);
  if (!u) return null;
  const unreadNotifications = state.notifications.filter(
    (n) => n.userId === u.id && !n.isRead
  ).length;
  const pendingModerationCount =
    u.role === 'moderator'
      ? state.stories.filter((s) => s.status === 'pending_review').length +
        state.reports.filter((r) => r.status === 'open').length
      : undefined;

  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    roleHeadline: u.roleHeadline || '',
    bio: u.bio || '',
    role: u.role,
    emailVerified: Boolean(u.emailVerified),
    defaultAnonymous: Boolean(u.defaultAnonymous),
    createdAt: u.createdAt,
    interests: {
      categories: u.categories || [],
      industries: u.industries || [],
    },
    unreadNotifications,
    pendingModerationCount,
  };
}

function formatSummary(state: LocalState, s: any): StorySummary {
  const author = state.users.find((u) => u.id === s.authorId);
  const company = state.companies.find((c) => c.id === s.companyId);
  const viewerId = state.currentUserId;
  const isMod = state.users.find((u) => u.id === viewerId)?.role === 'moderator';
  const isAnon = s.identityPreference === 'anonymous';
  const roleCtx = s.authorRoleContext || (!isAnon ? author?.roleHeadline : '');
  const authorLabel = isAnon
    ? roleCtx
      ? `Anonymous · ${roleCtx}`
      : 'Anonymous member'
    : roleCtx
      ? `@${author?.displayName} · ${roleCtx}`
      : `@${author?.displayName}`;

  const isOwnStory = Boolean(viewerId && viewerId === s.authorId);

  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    excerpt: s.excerpt,
    category: s.category,
    industry: s.industry,
    employmentType: s.employmentType,
    companyName: company?.name || null,
    companySlug: company?.slug || null,
    companyDescriptor: s.companyDescriptor || null,
    experienceType: s.experienceType,
    duration: s.duration,
    keyLesson: s.keyLesson,
    authorLabel,
    authorHandle: isAnon ? null : author?.displayName || null,
    isAnonymous: isAnon,
    readingTimeMinutes: s.readingTimeMinutes || 2,
    helpfulCount: state.reactions.filter((r) => r.storyId === s.id && r.type === 'helpful').length,
    relatableCount: state.reactions.filter((r) => r.storyId === s.id && r.type === 'relatable')
      .length,
    commentCount: state.comments.filter((c) => c.storyId === s.id && !c.isDeleted).length,
    bookmarkCount: state.bookmarks.filter((b) => b.storyId === s.id).length,
    viewerHelpful: state.reactions.some(
      (r) => r.storyId === s.id && r.userId === viewerId && r.type === 'helpful'
    ),
    viewerRelatable: state.reactions.some(
      (r) => r.storyId === s.id && r.userId === viewerId && r.type === 'relatable'
    ),
    viewerBookmarked: state.bookmarks.some(
      (b) => b.storyId === s.id && b.userId === viewerId
    ),
    isOwnStory,
    status: s.status,
    moderationFlag: isOwnStory || isMod ? s.moderationFlag : undefined,
    moderationNote: isOwnStory || isMod ? s.moderationNote : null,
    publishedAt: s.publishedAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export async function handleBrowserApiRequest(
  rawUrl: string,
  options: RequestInit = {}
): Promise<any> {
  const url = new URL(rawUrl, window.location.origin);
  const path = url.pathname;
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(String(options.body)) : {};

  const state = getState();
  const viewer = serializeUser(state, state.currentUserId);
  const requireAuth = () => {
    if (!viewer) {
      const err: any = new Error('Authentication required. Please sign in first.');
      err.status = 401;
      throw err;
    }
    return viewer;
  };

  // --- META ---
  if (path === '/api/meta' && method === 'GET') {
    const pub = state.stories.filter((s) => s.status === 'published');
    const categoryCounts: Record<string, number> = {};
    for (const s of pub) {
      categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
    }
    return {
      publishedStories: pub.length,
      companiesWithStories: new Set(pub.map((s) => s.companyId).filter(Boolean)).size,
      totalComments: state.comments.filter((c) => !c.isDeleted).length,
      categoryCounts,
    };
  }

  // --- AUTH ---
  if (path === '/api/auth/me' && method === 'GET') {
    const email = viewer?.email || state.lastEmailHint;
    const unreadMailCount = email
      ? state.mailbox.filter((m) => m.toEmail === email && !m.isRead).length
      : 0;
    return { user: viewer, unreadMailCount };
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const found = state.users.find((u) => u.email === email && u.password === body.password);
    if (!found) {
      const err: any = new Error('Incorrect email or password.');
      err.status = 401;
      throw err;
    }
    state.currentUserId = found.id;
    state.lastEmailHint = found.email;
    saveState(state);
    return { user: serializeUser(state, found.id), unreadMailCount: 0 };
  }

  if (path === '/api/auth/register' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const displayName = String(body.displayName || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28);
    if (!email || !email.includes('@')) throw new Error('Please enter a valid email address.');
    if (String(body.password || '').length < 8)
      throw new Error('Password must be at least 8 characters.');
    if (displayName.length < 3) throw new Error('Public handle must be at least 3 characters.');
    if (state.users.some((u) => u.email === email))
      throw new Error('An account with this email already exists.');
    if (state.users.some((u) => u.displayName.toLowerCase() === displayName.toLowerCase()))
      throw new Error(`Handle "${displayName}" is already taken.`);

    const now = new Date().toISOString();
    const id = makeId('usr');
    const token = makeId('tok');
    state.users.push({
      id,
      email,
      password: body.password,
      displayName,
      roleHeadline: String(body.roleHeadline || '').trim(),
      bio: '',
      role: 'member',
      emailVerified: false,
      defaultAnonymous: Boolean(body.defaultAnonymous ?? true),
      categories: Array.isArray(body.categories) ? body.categories : [],
      industries: [],
      createdAt: now,
    });
    state.tokens.push({ token, userId: id, type: 'email_verify', used: false });
    state.mailbox.unshift({
      id: makeId('mail'),
      toEmail: email,
      subject: 'Verify your ExitVoice email address',
      bodyText: `Welcome to ExitVoice (@${displayName}).\n\nConfirm your email address (${email}) using the button below.`,
      actionLabel: 'Confirm email address',
      actionUrl: `/verify-email?token=${token}`,
      isRead: false,
      createdAt: now,
    });
    state.notifications.unshift({
      id: makeId('ntf'),
      userId: id,
      type: 'welcome',
      title: `Welcome to ExitVoice, @${displayName}`,
      body: 'Your email is kept private. Post under your handle, post anonymously, or save private drafts.',
      linkUrl: '/submit',
      isRead: false,
      createdAt: now,
    });
    state.currentUserId = id;
    state.lastEmailHint = email;
    saveState(state);
    return { user: serializeUser(state, id), unreadMailCount: 1, verificationSent: true };
  }

  if (path === '/api/auth/google' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    let user = state.users.find((u) => u.email === email);
    const now = new Date().toISOString();
    if (!user) {
      const handle =
        String(body.preferredHandle || '').replace(/[^a-zA-Z0-9_-]/g, '') ||
        `member_${Math.floor(100 + Math.random() * 900)}`;
      user = {
        id: makeId('usr'),
        email,
        password: makeId('pw'),
        displayName: handle,
        roleHeadline: '',
        bio: '',
        role: 'member',
        emailVerified: true,
        defaultAnonymous: true,
        categories: ['Layoff', 'Resignation'],
        industries: [],
        createdAt: now,
      };
      state.users.push(user);
    }
    state.currentUserId = user.id;
    state.lastEmailHint = email;
    saveState(state);
    return { user: serializeUser(state, user.id), unreadMailCount: 0 };
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    state.currentUserId = null;
    saveState(state);
    return { ok: true };
  }

  if (path === '/api/auth/logout-others' && method === 'POST') {
    return { ok: true };
  }

  if (path === '/api/auth/sessions' && method === 'GET') {
    requireAuth();
    return {
      sessions: [
        {
          id: 'cur_browser',
          userAgent: navigator.userAgent,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
          isCurrent: true,
        },
      ],
    };
  }

  if (path === '/api/auth/mailbox' && method === 'GET') {
    const email = (viewer?.email || state.lastEmailHint || '').toLowerCase();
    return { messages: state.mailbox.filter((m) => m.toEmail === email) };
  }

  if (path.startsWith('/api/auth/mailbox/') && path.endsWith('/read') && method === 'POST') {
    const id = path.split('/')[4];
    const m = state.mailbox.find((x) => x.id === id);
    if (m) m.isRead = true;
    saveState(state);
    return { ok: true };
  }

  if (path === '/api/auth/resend-verification' && method === 'POST') {
    const v = requireAuth();
    const token = makeId('tok');
    state.tokens.push({ token, userId: v.id, type: 'email_verify', used: false });
    state.mailbox.unshift({
      id: makeId('mail'),
      toEmail: v.email,
      subject: 'Verify your ExitVoice email address',
      bodyText: `Hi @${v.displayName}, click below to confirm ${v.email}.`,
      actionLabel: 'Confirm email address',
      actionUrl: `/verify-email?token=${token}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    return { ok: true };
  }

  if (path === '/api/auth/verify-email' && method === 'POST') {
    const tok = state.tokens.find((t) => t.token === body.token && t.type === 'email_verify');
    if (!tok) throw new Error('Invalid verification link.');
    tok.used = true;
    const u = state.users.find((x) => x.id === tok.userId);
    if (u) u.emailVerified = true;
    saveState(state);
    return { ok: true, user: serializeUser(state, tok.userId) };
  }

  if (path === '/api/auth/forgot-password' && method === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    const u = state.users.find((x) => x.email === email);
    if (u) {
      const token = makeId('tok');
      state.tokens.push({ token, userId: u.id, type: 'password_reset', used: false });
      state.mailbox.unshift({
        id: makeId('mail'),
        toEmail: email,
        subject: 'Reset your ExitVoice password',
        bodyText: `Reset password request for @${u.displayName}.`,
        actionLabel: 'Set new password',
        actionUrl: `/reset-password?token=${token}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      state.lastEmailHint = email;
      saveState(state);
    }
    return {
      ok: true,
      message: 'If an account matches that email, a reset link is ready in the Mail Outbox button.',
    };
  }

  if (path === '/api/auth/reset-password' && method === 'POST') {
    const tok = state.tokens.find(
      (t) => t.token === body.token && t.type === 'password_reset' && !t.used
    );
    if (!tok) throw new Error('Invalid or expired reset link.');
    tok.used = true;
    const u = state.users.find((x) => x.id === tok.userId);
    if (u) {
      u.password = body.password;
      state.currentUserId = u.id;
    }
    saveState(state);
    return { ok: true, user: serializeUser(state, tok.userId) };
  }

  if (path === '/api/auth/profile' && method === 'PATCH') {
    const v = requireAuth();
    const u = state.users.find((x) => x.id === v.id)!;
    if (body.displayName !== undefined) u.displayName = String(body.displayName).trim();
    if (body.roleHeadline !== undefined) u.roleHeadline = String(body.roleHeadline).trim();
    if (body.bio !== undefined) u.bio = String(body.bio).trim();
    if (body.defaultAnonymous !== undefined) u.defaultAnonymous = Boolean(body.defaultAnonymous);
    if (Array.isArray(body.categories)) {
      u.categories = body.categories.filter((c: string) =>
        (EXPERIENCE_CATEGORIES as readonly string[]).includes(c)
      );
    }
    if (Array.isArray(body.industries)) {
      u.industries = body.industries.filter((i: string) =>
        (INDUSTRIES as readonly string[]).includes(i)
      );
    }
    saveState(state);
    return { user: serializeUser(state, v.id) };
  }

  // --- STORIES & DISCOVERY ---
  if (path === '/api/stories' && method === 'GET') {
    const sort = url.searchParams.get('sort') || 'latest';
    const category = url.searchParams.get('category') || 'All';
    const industry = url.searchParams.get('industry') || 'All';
    const experienceType = url.searchParams.get('experienceType') || 'All';
    const companyQ = (url.searchParams.get('company') || '').toLowerCase();
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.max(1, Number(url.searchParams.get('limit') || '10'));

    let items = state.stories
      .filter((s) => s.status === 'published')
      .map((s) => formatSummary(state, s));

    if (category !== 'All') items = items.filter((s) => s.category === category);
    if (industry !== 'All') items = items.filter((s) => s.industry === industry);
    if (experienceType !== 'All') items = items.filter((s) => s.experienceType === experienceType);
    if (companyQ) {
      items = items.filter(
        (s) =>
          s.companySlug === companyQ ||
          (s.companyName || '').toLowerCase().includes(companyQ) ||
          (s.companyDescriptor || '').toLowerCase().includes(companyQ)
      );
    }
    if (q) {
      items = items.filter((s) => {
        const raw = state.stories.find((x) => x.id === s.id);
        return (
          s.title.toLowerCase().includes(q) ||
          (raw?.content || '').toLowerCase().includes(q) ||
          s.keyLesson.toLowerCase().includes(q) ||
          (s.companyName || '').toLowerCase().includes(q)
        );
      });
    }

    items.sort((a, b) => {
      if (sort === 'discussed') return b.commentCount - a.commentCount;
      if (sort === 'bookmarked') return b.bookmarkCount - a.bookmarkCount;
      if (sort === 'helpful') return b.helpfulCount - a.helpfulCount;
      return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
    });

    const total = items.length;
    const sliced = items.slice((page - 1) * limit, page * limit);
    return { items: sliced, total, page, limit, hasMore: page * limit < total };
  }

  if (path === '/api/dashboard' && method === 'GET') {
    const v = requireAuth();
    const pub = state.stories
      .filter((s) => s.status === 'published')
      .map((s) => formatSummary(state, s));
    return {
      myStories: state.stories
        .filter((s) => s.authorId === v.id)
        .map((s) => formatSummary(state, s)),
      bookmarks: pub.filter((s) => s.viewerBookmarked),
      trending: [...pub].sort((a, b) => b.commentCount * 2 + b.helpfulCount - (a.commentCount * 2 + a.helpfulCount)).slice(0, 5),
      recent: [...pub].slice(0, 6),
      relevant: pub.filter(
        (s) =>
          v.interests.categories.includes(s.category) ||
          v.interests.industries.includes(s.industry)
      ),
      popularLessons: [...pub].sort((a, b) => b.helpfulCount - a.helpfulCount).slice(0, 5),
      notifications: state.notifications.filter((n) => n.userId === v.id),
    };
  }

  if (path.startsWith('/api/stories/draft/') && method === 'GET') {
    const v = requireAuth();
    const id = path.split('/')[4];
    const s = state.stories.find((x) => x.id === id && x.authorId === v.id);
    if (!s) throw new Error('Draft not found.');
    const cmp = state.companies.find((c) => c.id === s.companyId);
    return {
      draft: {
        ...s,
        companyName: cmp?.name || '',
        companyDescriptor: s.companyDescriptor || '',
        evidenceNote: s.evidenceNote || '',
        evidenceFilename: s.evidenceFilename || '',
        authorRoleContext: s.authorRoleContext || '',
      },
    };
  }

  if (
    (path === '/api/stories' && method === 'POST') ||
    (path.startsWith('/api/stories/') && method === 'PUT' && path.split('/').length === 4)
  ) {
    const v = requireAuth();
    const existingId = method === 'PUT' ? path.split('/')[3] : null;
    const intent = body.intent === 'submit' ? 'submit' : 'draft';
    const title = String(body.title || '').trim() || 'Untitled workplace exit draft';
    const content = String(body.content || '').trim();
    const keyLesson = String(body.keyLesson || '').trim();

    if (intent === 'submit') {
      if (title.length < STORY_LIMITS.TITLE_MIN) throw new Error('Title is too short.');
      if (content.length < STORY_LIMITS.CONTENT_MIN) throw new Error('Story content is too short.');
    }

    let companyId: string | null = null;
    if (String(body.companyName || '').trim()) {
      const cname = String(body.companyName).trim();
      const cslug = slugifyText(cname);
      let existingCmp = state.companies.find((c) => c.slug === cslug);
      if (!existingCmp) {
        existingCmp = {
          id: makeId('cmp'),
          name: cname,
          slug: cslug,
          industry: body.industry || 'Other',
          headquarters: null,
          sizeRange: null,
        };
        state.companies.push(existingCmp);
      }
      companyId = existingCmp.id;
    }

    const now = new Date().toISOString();
    const nextStatus = intent === 'submit' ? 'pending_review' : 'draft';
    const modFlag = (HIGH_CARE_CATEGORIES as readonly string[]).includes(body.category)
      ? 'high_care_review'
      : 'standard';

    let storyObj: any;
    if (existingId) {
      storyObj = state.stories.find((s) => s.id === existingId && s.authorId === v.id);
      if (!storyObj) throw new Error('Story not found.');
      Object.assign(storyObj, {
        title,
        slug: `${slugifyText(title)}-${storyObj.id.slice(-4)}`,
        content,
        excerpt: makeExcerpt(content || title),
        category: body.category,
        industry: body.industry,
        employmentType: body.employmentType,
        companyId,
        companyDescriptor: companyId ? null : body.companyDescriptor || null,
        experienceType: body.experienceType,
        duration: body.duration,
        keyLesson,
        evidenceNote: body.evidenceNote || null,
        evidenceFilename: body.evidenceFilename || storyObj.evidenceFilename || null,
        identityPreference: body.identityPreference === 'display_name' ? 'display_name' : 'anonymous',
        authorRoleContext: body.authorRoleContext || null,
        status: nextStatus,
        moderationFlag: modFlag,
        readingTimeMinutes: calcReadingMinutes(content || title),
        updatedAt: now,
      });
    } else {
      const id = makeId('sty');
      storyObj = {
        id,
        slug: `${slugifyText(title)}-${id.slice(-4)}`,
        authorId: v.id,
        title,
        content,
        excerpt: makeExcerpt(content || title),
        category: body.category,
        industry: body.industry,
        employmentType: body.employmentType,
        companyId,
        companyDescriptor: companyId ? null : body.companyDescriptor || null,
        experienceType: body.experienceType,
        duration: body.duration,
        keyLesson,
        evidenceNote: body.evidenceNote || null,
        evidenceFilename: body.evidenceFilename || null,
        identityPreference: body.identityPreference === 'display_name' ? 'display_name' : 'anonymous',
        authorRoleContext: body.authorRoleContext || null,
        status: nextStatus,
        moderationFlag: modFlag,
        moderationNote: null,
        readingTimeMinutes: calcReadingMinutes(content || title),
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
      };
      state.stories.unshift(storyObj);
    }
    saveState(state);
    return {
      ok: true,
      id: storyObj.id,
      slug: storyObj.slug,
      status: nextStatus,
      moderationFlag: modFlag,
      updatedAt: now,
    };
  }

  if (path.startsWith('/api/stories/') && method === 'DELETE' && path.split('/').length === 4) {
    const v = requireAuth();
    const id = path.split('/')[3];
    state.stories = state.stories.filter(
      (s) => !(s.id === id && (s.authorId === v.id || v.role === 'moderator'))
    );
    saveState(state);
    return { ok: true };
  }

  if (path.startsWith('/api/stories/') && path.endsWith('/react') && method === 'POST') {
    const v = requireAuth();
    const storyId = path.split('/')[3];
    const rType = body.type === 'relatable' ? 'relatable' : 'helpful';
    const idx = state.reactions.findIndex(
      (r) => r.storyId === storyId && r.userId === v.id && r.type === rType
    );
    if (idx >= 0) state.reactions.splice(idx, 1);
    else state.reactions.push({ storyId, userId: v.id, type: rType });
    saveState(state);
    return {
      helpfulCount: state.reactions.filter((r) => r.storyId === storyId && r.type === 'helpful')
        .length,
      relatableCount: state.reactions.filter((r) => r.storyId === storyId && r.type === 'relatable')
        .length,
      viewerHelpful: state.reactions.some(
        (r) => r.storyId === storyId && r.userId === v.id && r.type === 'helpful'
      ),
      viewerRelatable: state.reactions.some(
        (r) => r.storyId === storyId && r.userId === v.id && r.type === 'relatable'
      ),
    };
  }

  if (path.startsWith('/api/stories/') && path.endsWith('/bookmark') && method === 'POST') {
    const v = requireAuth();
    const storyId = path.split('/')[3];
    const idx = state.bookmarks.findIndex((b) => b.storyId === storyId && b.userId === v.id);
    if (idx >= 0) state.bookmarks.splice(idx, 1);
    else state.bookmarks.push({ storyId, userId: v.id, createdAt: new Date().toISOString() });
    saveState(state);
    return {
      viewerBookmarked: idx < 0,
      bookmarkCount: state.bookmarks.filter((b) => b.storyId === storyId).length,
    };
  }

  if (path.startsWith('/api/stories/') && path.endsWith('/comments') && method === 'POST') {
    const v = requireAuth();
    const storyId = path.split('/')[3];
    const story = state.stories.find((s) => s.id === storyId);
    if (!story) throw new Error('Story not found.');
    const isOP = v.id === story.authorId;
    const effectiveAnon =
      Boolean(body.isAnonymous) || (isOP && story.identityPreference === 'anonymous');
    const now = new Date().toISOString();
    const cId = makeId('cmt');
    state.comments.push({
      id: cId,
      storyId,
      authorId: v.id,
      parentId: body.parentId || null,
      body: String(body.body || '').trim(),
      isAnonymous: effectiveAnon,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    state.commentVotes.push({ commentId: cId, userId: v.id, value: 1 });
    saveState(state);
    const comment: CommentItem = {
      id: cId,
      storyId,
      parentId: body.parentId || null,
      body: String(body.body || '').trim(),
      authorLabel: effectiveAnon
        ? isOP
          ? 'Original Author'
          : 'Anonymous member'
        : `@${v.displayName}`,
      authorHandle: effectiveAnon ? null : v.displayName,
      isAnonymous: effectiveAnon,
      isOriginalPoster: isOP,
      isOwnComment: true,
      isDeleted: false,
      score: 1,
      viewerVote: 1,
      createdAt: now,
      updatedAt: now,
    };
    return { comment };
  }

  if (path.startsWith('/api/stories/') && method === 'GET') {
    const slug = decodeURIComponent(path.slice('/api/stories/'.length));
    const s = state.stories.find((x) => x.slug === slug || x.id === slug);
    if (!s) throw new Error('Story not found.');
    const canViewPrivate =
      s.status === 'published' || s.authorId === viewer?.id || viewer?.role === 'moderator';
    if (!canViewPrivate) throw new Error('Story not public.');

    const summary = formatSummary(state, s);
    const detail: StoryDetail = {
      ...summary,
      content: s.content,
      companyStoryCount: s.companyId
        ? state.stories.filter((x) => x.status === 'published' && x.companyId === s.companyId)
            .length
        : 0,
      evidenceNote:
        s.authorId === viewer?.id || viewer?.role === 'moderator' ? s.evidenceNote : undefined,
      evidenceFilename:
        s.authorId === viewer?.id || viewer?.role === 'moderator' ? s.evidenceFilename : undefined,
    };

    const comments: CommentItem[] = state.comments
      .filter((c) => c.storyId === s.id)
      .map((c) => {
        const u = state.users.find((x) => x.id === c.authorId);
        const isOP = c.authorId === s.authorId;
        const effectiveAnon =
          Boolean(c.isAnonymous) || (isOP && s.identityPreference === 'anonymous');
        const score = state.commentVotes
          .filter((v) => v.commentId === c.id)
          .reduce((acc, v) => acc + v.value, 0);
        const myVote =
          state.commentVotes.find((v) => v.commentId === c.id && v.userId === viewer?.id)?.value ||
          0;
        return {
          id: c.id,
          storyId: c.storyId,
          parentId: c.parentId,
          body: c.isDeleted ? '[Comment removed by author]' : c.body,
          authorLabel: c.isDeleted
            ? '[removed]'
            : effectiveAnon
              ? isOP
                ? 'Original Author'
                : 'Anonymous member'
              : `@${u?.displayName}`,
          authorHandle: c.isDeleted || effectiveAnon ? null : u?.displayName || null,
          isAnonymous: effectiveAnon,
          isOriginalPoster: !c.isDeleted && isOP,
          isOwnComment: Boolean(viewer && c.authorId === viewer.id),
          isDeleted: Boolean(c.isDeleted),
          score,
          viewerVote: myVote,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      });

    const related = state.stories
      .filter((x) => x.status === 'published' && x.id !== s.id && x.category === s.category)
      .slice(0, 3)
      .map((x) => formatSummary(state, x));

    return { story: detail, comments, related };
  }

  // --- COMMENTS ---
  if (path.startsWith('/api/comments/') && path.endsWith('/vote') && method === 'POST') {
    const v = requireAuth();
    const commentId = path.split('/')[3];
    const val = Number(body.value) === -1 ? -1 : 1;
    const idx = state.commentVotes.findIndex(
      (cv) => cv.commentId === commentId && cv.userId === v.id
    );
    let viewerVote = val;
    if (idx >= 0 && state.commentVotes[idx].value === val) {
      state.commentVotes.splice(idx, 1);
      viewerVote = 0;
    } else if (idx >= 0) {
      state.commentVotes[idx].value = val;
    } else {
      state.commentVotes.push({ commentId, userId: v.id, value: val });
    }
    saveState(state);
    const score = state.commentVotes
      .filter((cv) => cv.commentId === commentId)
      .reduce((a, b) => a + b.value, 0);
    return { score, viewerVote };
  }

  if (path.startsWith('/api/comments/') && method === 'DELETE') {
    requireAuth();
    const commentId = path.split('/')[3];
    const hasChild = state.comments.some((c) => c.parentId === commentId);
    if (hasChild) {
      const c = state.comments.find((x) => x.id === commentId);
      if (c) {
        c.isDeleted = true;
        c.body = '[Comment removed by author]';
      }
      saveState(state);
      return { ok: true, mode: 'soft' };
    }
    state.comments = state.comments.filter((x) => x.id !== commentId);
    saveState(state);
    return { ok: true, mode: 'hard' };
  }

  // --- COMPANIES ---
  if (path === '/api/companies/suggest' && method === 'GET') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    return {
      companies: state.companies.filter((c) => !q || c.name.toLowerCase().includes(q)).slice(0, 8),
    };
  }

  if (path === '/api/companies' && method === 'GET') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const industry = url.searchParams.get('industry') || 'All';
    const items = state.companies
      .filter(
        (c) =>
          (!q || c.name.toLowerCase().includes(q)) &&
          (industry === 'All' || c.industry === industry)
      )
      .map((c) => {
        const pub = state.stories.filter(
          (s) => s.status === 'published' && s.companyId === c.id
        );
        const counts: Record<string, number> = {};
        for (const s of pub) counts[s.category] = (counts[s.category] || 0) + 1;
        return {
          ...c,
          storyCount: pub.length,
          topCategories: Object.entries(counts).map(([category, count]) => ({
            category,
            count,
          })),
          latestStoryAt: pub[0]?.publishedAt || null,
        };
      })
      .filter((c) => c.storyCount > 0)
      .sort((a, b) => b.storyCount - a.storyCount);
    return { companies: items };
  }

  if (path.startsWith('/api/companies/') && method === 'GET') {
    const slug = decodeURIComponent(path.slice('/api/companies/'.length));
    const c = state.companies.find((x) => x.slug === slug);
    if (!c) throw new Error('Workplace not found.');
    const pub = state.stories.filter((s) => s.status === 'published' && s.companyId === c.id);
    const counts: Record<string, number> = {};
    for (const s of pub) counts[s.category] = (counts[s.category] || 0) + 1;
    return {
      company: {
        ...c,
        storyCount: pub.length,
        topCategories: Object.entries(counts).map(([category, count]) => ({ category, count })),
        latestStoryAt: pub[0]?.publishedAt || null,
      },
      stories: pub.map((s) => formatSummary(state, s)),
    };
  }

  // --- NOTIFICATIONS, REPORTS & MODERATION ---
  if (path === '/api/reports' && method === 'POST') {
    const v = requireAuth();
    state.reports.unshift({
      id: makeId('rpt'),
      reporterHandle: v.displayName,
      targetType: body.targetType || 'story',
      targetId: body.targetId,
      reason: body.reason,
      details: body.details || '',
      status: 'open',
      createdAt: new Date().toISOString(),
    });
    saveState(state);
    return { ok: true };
  }

  if (path === '/api/notifications' && method === 'GET') {
    const v = requireAuth();
    return { notifications: state.notifications.filter((n) => n.userId === v.id) };
  }

  if (path === '/api/notifications/read' && method === 'POST') {
    const v = requireAuth();
    for (const n of state.notifications) {
      if (n.userId === v.id) n.isRead = true;
    }
    saveState(state);
    return { ok: true };
  }

  if (path === '/api/moderation/queue' && method === 'GET') {
    const v = requireAuth();
    if (v.role !== 'moderator') throw new Error('Moderator access required.');
    return {
      pendingStories: state.stories
        .filter((s) => s.status === 'pending_review' || s.status === 'needs_revision')
        .map((s) => ({
          ...s,
          companyName: state.companies.find((c) => c.id === s.companyId)?.name || null,
          accountHandle: state.users.find((u) => u.id === s.authorId)?.displayName || 'member',
        })),
      openReports: state.reports
        .filter((r) => r.status === 'open')
        .map((r) => ({
          ...r,
          targetPreview:
            state.stories.find((s) => s.id === r.targetId)?.title ||
            state.comments.find((c) => c.id === r.targetId)?.body ||
            'Content item',
        })),
    };
  }

  if (path.startsWith('/api/moderation/stories/') && path.endsWith('/decision') && method === 'POST') {
    const v = requireAuth();
    if (v.role !== 'moderator') throw new Error('Moderator access required.');
    const storyId = path.split('/')[4];
    const s = state.stories.find((x) => x.id === storyId);
    if (!s) throw new Error('Story not found.');
    const now = new Date().toISOString();
    s.status =
      body.action === 'approve'
        ? 'published'
        : body.action === 'request_revision'
          ? 'needs_revision'
          : 'rejected';
    s.moderationNote = body.note || null;
    if (s.status === 'published') s.publishedAt = now;
    state.notifications.unshift({
      id: makeId('ntf'),
      userId: s.authorId,
      type: 'moderation_approved',
      title:
        s.status === 'published'
          ? 'Your story is now live on ExitVoice'
          : 'Update on your submitted story',
      body: body.note || `"${s.title}" was reviewed.`,
      linkUrl: s.status === 'published' ? `/stories/${s.slug}` : `/submit/${s.id}`,
      isRead: false,
      createdAt: now,
    });
    saveState(state);
    return { ok: true, status: s.status, slug: s.slug };
  }

  if (path.startsWith('/api/moderation/reports/') && path.endsWith('/resolve') && method === 'POST') {
    const rId = path.split('/')[4];
    const r = state.reports.find((x) => x.id === rId);
    if (r) r.status = 'resolved';
    saveState(state);
    return { ok: true };
  }

  return {};
}
