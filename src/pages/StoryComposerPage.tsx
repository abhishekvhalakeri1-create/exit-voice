import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileUp,
  Heading2,
  List,
  Lock,
  PenLine,
  Quote,
  Save,
  Send,
  ShieldAlert,
} from 'lucide-react';
import {
  EMPLOYMENT_DURATIONS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_CATEGORIES,
  EXPERIENCE_TYPES,
  HIGH_CARE_CATEGORIES,
  INDUSTRIES,
  STORY_LIMITS,
  redactSensitiveInfo,
  scanForSensitiveInfo,
} from '../../shared/constants';
import { apiFetch, renderStoryBody } from '../lib/api';
import { useApp } from '../context/AppContext';
import { getCategoryTone } from '../components/StoryCard';

const LOCAL_RESCUE_KEY = 'ev_unsaved_story_draft_v1';

export function StoryComposerPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const prefillCompany = searchParams.get('company') || '';

  const { user, loadingAuth, showToast, refreshAuth } = useApp();
  const navigate = useNavigate();

  const [draftId, setDraftId] = useState<string | undefined>(id);
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  // All 11 required Story Creation fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('Layoff');
  const [industry, setIndustry] = useState<string>('Technology & Software');
  const [employmentType, setEmploymentType] = useState<string>('Full-time');
  const [companyName, setCompanyName] = useState<string>(prefillCompany);
  const [companyDescriptor, setCompanyDescriptor] = useState<string>('');
  const [experienceType, setExperienceType] = useState<string>('Involuntary exit');
  const [duration, setDuration] = useState<string>('2–5 years');
  const [keyLesson, setKeyLesson] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [evidenceFilename, setEvidenceFilename] = useState('');
  const [evidenceFileData, setEvidenceFileData] = useState<string | null>(null);
  const [privacyChoice, setPrivacyChoice] = useState<
    'anonymous' | 'display_name' | 'private_draft'
  >('anonymous');
  const [authorRoleContext, setAuthorRoleContext] = useState('');

  // Company suggestions
  const [companySuggestions, setCompanySuggestions] = useState<{ name: string; industry: string }[]>(
    []
  );
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Pre-publication safety acknowledgement
  const [confirmedSafety, setConfirmedSafety] = useState(false);
  const [moderationNote, setModerationNote] = useState<string | null>(null);

  // Autosave & submission status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [submittedResult, setSubmittedResult] = useState<{
    slug: string;
    highCare: boolean;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadedInitialRef = useRef(false);
  const dirtyRef = useRef(false);

  // Load existing draft if editing `/submit/:id` or restore local rescue draft
  useEffect(() => {
    if (!user) return;
    if (id) {
      apiFetch<{ draft: any }>(`/api/stories/draft/${id}`)
        .then(({ draft }) => {
          setDraftId(draft.id);
          setTitle(draft.title === 'Untitled workplace exit draft' ? '' : draft.title);
          setContent(draft.content);
          setCategory(draft.category);
          setIndustry(draft.industry);
          setEmploymentType(draft.employmentType);
          setCompanyName(draft.companyName || '');
          setCompanyDescriptor(draft.companyDescriptor || '');
          setExperienceType(draft.experienceType);
          setDuration(draft.duration);
          setKeyLesson(draft.keyLesson || '');
          setEvidenceNote(draft.evidenceNote || '');
          setEvidenceFilename(draft.evidenceFilename || '');
          setPrivacyChoice(
            draft.status === 'draft' && draft.identityPreference === 'anonymous'
              ? 'anonymous'
              : draft.identityPreference
          );
          setAuthorRoleContext(draft.authorRoleContext || '');
          setModerationNote(draft.moderationNote);
          loadedInitialRef.current = true;
        })
        .catch(() => {
          showToast('Could not load that draft.', 'error');
          navigate('/submit');
        });
    } else {
      setPrivacyChoice(user.defaultAnonymous ? 'anonymous' : 'display_name');
      setAuthorRoleContext(user.roleHeadline || '');
      try {
        const raw = localStorage.getItem(LOCAL_RESCUE_KEY);
        if (raw && !prefillCompany) {
          const parsed = JSON.parse(raw);
          if (parsed.title || parsed.content) {
            setTitle(parsed.title || '');
            setContent(parsed.content || '');
            setKeyLesson(parsed.keyLesson || '');
          }
        }
      } catch {}
      loadedInitialRef.current = true;
    }
  }, [id, user, navigate, prefillCompany, showToast]);

  // Fetch company autocomplete suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!companyName.trim()) {
        setCompanySuggestions([]);
        return;
      }
      apiFetch<{ companies: { name: string; industry: string }[] }>(
        `/api/companies/suggest?q=${encodeURIComponent(companyName)}`
      )
        .then((res) => setCompanySuggestions(res.companies))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [companyName]);

  const persistDraftToServer = useCallback(async () => {
    if (!user || submittedResult) return;
    if (!title.trim() && !content.trim() && !keyLesson.trim()) return;

    setSaveStatus('saving');
    try {
      const payload = {
        intent: 'draft',
        title,
        content,
        category,
        industry,
        employmentType,
        companyName,
        companyDescriptor,
        experienceType,
        duration,
        keyLesson,
        evidenceNote,
        evidenceFilename,
        evidenceFileData,
        identityPreference: privacyChoice === 'display_name' ? 'display_name' : 'anonymous',
        authorRoleContext,
      };

      const res = await apiFetch<{ id: string }>((draftId ? `/api/stories/${draftId}` : '/api/stories'), {
        method: draftId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });

      if (!draftId && res.id) {
        setDraftId(res.id);
      }
      dirtyRef.current = false;
      setSaveStatus('saved');
      setLastSavedAt(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      try {
        localStorage.removeItem(LOCAL_RESCUE_KEY);
      } catch {}
    } catch {
      setSaveStatus('error');
    }
  }, [
    user,
    submittedResult,
    title,
    content,
    category,
    industry,
    employmentType,
    companyName,
    companyDescriptor,
    experienceType,
    duration,
    keyLesson,
    evidenceNote,
    evidenceFilename,
    evidenceFileData,
    privacyChoice,
    authorRoleContext,
    draftId,
  ]);

  // Autosave debounce whenever fields change
  useEffect(() => {
    if (!loadedInitialRef.current || !dirtyRef.current) return;
    try {
      localStorage.setItem(LOCAL_RESCUE_KEY, JSON.stringify({ title, content, keyLesson }));
    } catch {}

    const timer = setTimeout(() => {
      persistDraftToServer();
    }, 2600);
    return () => clearTimeout(timer);
  }, [title, content, keyLesson, category, industry, companyName, privacyChoice, persistDraftToServer]);

  const piiWarnings = useMemo(
    () => scanForSensitiveInfo(`${title}\n${content}\n${keyLesson}`),
    [title, content, keyLesson]
  );

  const estimatedMinutes = useMemo(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 215));
  }, [content]);

  const isHighCareCategory = (HIGH_CARE_CATEGORIES as readonly string[]).includes(category);

  const insertFormat = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => `${prev}${prev ? '\n\n' : ''}${prefix}`);
      dirtyRef.current = true;
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    const updated = `${content.slice(0, start)}${prefix}${selected || 'Write here…'}${content.slice(
      end
    )}`;
    dirtyRef.current = true;
    setContent(updated);
    setTimeout(() => el.focus(), 20);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 250 * 1024) {
      showToast('Supporting file must be under 250 KB (redacted excerpt or screenshot).', 'error');
      return;
    }
    setEvidenceFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setEvidenceFileData(String(reader.result || ''));
      dirtyRef.current = true;
    };
    reader.readAsDataURL(file);
  };

  const handleAutoRedact = () => {
    setTitle((t) => redactSensitiveInfo(t));
    setContent((c) => redactSensitiveInfo(c));
    setKeyLesson((k) => redactSensitiveInfo(k));
    dirtyRef.current = true;
    showToast('Replaced detected email/phone patterns with [redacted] placeholders.', 'success');
  };

  const handleFinalAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (privacyChoice === 'private_draft') {
      await persistDraftToServer();
      showToast('Saved privately in your Dashboard Drafts.', 'success');
      navigate('/dashboard#drafts');
      return;
    }

    if (title.trim().length < STORY_LIMITS.TITLE_MIN) {
      setValidationError(`Title must be at least ${STORY_LIMITS.TITLE_MIN} characters.`);
      return;
    }
    if (content.trim().length < STORY_LIMITS.CONTENT_MIN) {
      setValidationError(
        `Story content needs at least ${STORY_LIMITS.CONTENT_MIN} characters (currently ${content.trim().length}).`
      );
      return;
    }
    if (keyLesson.trim().length < STORY_LIMITS.LESSON_MIN) {
      setValidationError(
        `Please share a key lesson learned (${STORY_LIMITS.LESSON_MIN}+ characters).`
      );
      return;
    }
    if (!confirmedSafety) {
      setValidationError(
        'Please confirm the pre-publication confidentiality and privacy check before submitting.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{
        id: string;
        slug: string;
        status: string;
        moderationFlag: string;
      }>(draftId ? `/api/stories/${draftId}` : '/api/stories', {
        method: draftId ? 'PUT' : 'POST',
        body: JSON.stringify({
          intent: 'submit',
          title,
          content,
          category,
          industry,
          employmentType,
          companyName,
          companyDescriptor,
          experienceType,
          duration,
          keyLesson,
          evidenceNote,
          evidenceFilename,
          evidenceFileData,
          identityPreference: privacyChoice,
          authorRoleContext,
        }),
      });

      try {
        localStorage.removeItem(LOCAL_RESCUE_KEY);
      } catch {}
      await refreshAuth();
      setSubmittedResult({
        slug: res.slug,
        highCare: res.moderationFlag === 'high_care_review',
      });
      showToast('Story submitted for moderation review.', 'success');
    } catch (err: any) {
      setValidationError(err?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-sm text-[var(--text-secondary)]">
        Loading composer…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin?next=/submit" replace />;
  }

  if (submittedResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="ev-surface rounded-lg p-7 sm:p-9 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[var(--status-positive-bg)] text-[var(--status-positive)] text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Submitted for Moderation Review</span>
          </div>

          <h1 className="font-editorial text-3xl sm:text-4xl text-[var(--text-primary)]">
            Thank you for sharing your workplace story.
          </h1>

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Your story is now in our moderation queue and is <strong>not public yet</strong>.
            Moderators check submissions to ensure no private contact info, passwords, or
            confidential proprietary details are exposed before publishing to the community feed.
          </p>

          {submittedResult.highCare && (
            <div className="rounded-md p-4 bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] leading-relaxed">
              <strong>Care review enabled:</strong> Because your submission touches serious
              workplace conduct or termination issues, it has been flagged for careful redaction
              review rather than automated publishing.
            </div>
          )}

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <Link
              to={`/stories/${submittedResult.slug}`}
              className="ev-btn-primary px-4 py-2.5 rounded-md text-xs"
            >
              Preview Your Submitted Entry
            </Link>
            <Link
              to="/dashboard"
              className="ev-btn-secondary px-4 py-2.5 rounded-md text-xs"
            >
              Return to Dashboard
            </Link>
            {user.role === 'moderator' && (
              <Link
                to="/moderation"
                className="text-xs font-semibold text-[var(--accent-text)] hover:underline ml-auto"
              >
                Open Moderation Queue to Review Now →
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const publicBylinePreview =
    privacyChoice === 'anonymous'
      ? authorRoleContext.trim()
        ? `Anonymous · ${authorRoleContext.trim()}`
        : 'Anonymous member'
      : privacyChoice === 'private_draft'
        ? 'Visible only to you (Private Draft)'
        : authorRoleContext.trim()
          ? `@${user.displayName} · ${authorRoleContext.trim()}`
          : `@${user.displayName}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      {/* Top Bar: Header + Write/Preview Switch + Autosave Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b ev-border">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
            Story Studio
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl text-[var(--text-primary)]">
            Share Your Workplace Exit Story
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Write candidly. Protect private details. Leave behind the lesson you wish you’d known.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-[var(--text-muted)]">
            {saveStatus === 'saving'
              ? 'Autosaving…'
              : saveStatus === 'saved'
                ? `Draft saved ${lastSavedAt}`
                : saveStatus === 'error'
                  ? 'Autosave paused'
                  : 'Autosave active'}
          </span>

          <div className="inline-flex rounded-md ev-surface p-0.5">
            <button
              type="button"
              onClick={() => setMode('write')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium ${
                mode === 'write'
                  ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" />
              Write
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium ${
                mode === 'preview'
                  ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          </div>
        </div>
      </div>

      {moderationNote && (
        <div className="rounded-lg p-4 bg-[var(--status-caution-bg)] border border-[var(--border-strong)] text-xs space-y-1">
          <p className="font-semibold text-[var(--text-primary)]">Moderator Feedback:</p>
          <p className="text-[var(--text-secondary)]">{moderationNote}</p>
        </div>
      )}

      {/* Live Sensitive Data Warning Banner */}
      {piiWarnings.length > 0 && (
        <div className="rounded-lg p-4 bg-[var(--status-caution-bg)] border border-[var(--border-strong)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[var(--status-caution)] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-[var(--text-primary)]">
                Possible sensitive or identifying details spotted in your draft:
              </p>
              {piiWarnings.map((w) => (
                <p key={w.kind} className="text-[var(--text-secondary)]">
                  • {w.label} ({w.matches.join(', ')})
                </p>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutoRedact}
            className="ev-btn-secondary px-3 py-1.5 rounded-md text-xs shrink-0"
          >
            Auto-Redact Patterns
          </button>
        </div>
      )}

      {mode === 'preview' ? (
        /* Full Story Preview Card */
        <div className="ev-surface rounded-lg p-6 sm:p-9 space-y-6">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pb-4 border-b ev-border">
            <span>Previewing how readers will see this entry once approved</span>
            <button
              type="button"
              onClick={() => setMode('write')}
              className="font-semibold text-[var(--accent-text)] hover:underline"
            >
              ← Back to editing
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className={`px-2 py-0.5 rounded font-medium ${getCategoryTone(category)}`}>
              {category}
            </span>
            <span>·</span>
            <span>{experienceType}</span>
            <span>·</span>
            <span>{industry}</span>
            <span>·</span>
            <span>
              {employmentType} ({duration})
            </span>
          </div>

          <h2 className="font-editorial text-3xl sm:text-5xl leading-[1.1] text-[var(--text-primary)]">
            {title || 'Untitled workplace story'}
          </h2>

          <p className="text-xs text-[var(--text-secondary)]">
            By <strong>{publicBylinePreview}</strong>
            {(companyName || companyDescriptor) && (
              <>
                {' '}
                · Workplace:{' '}
                <strong>{companyName || companyDescriptor}</strong>
              </>
            )}{' '}
            · {estimatedMinutes} min read
          </p>

          {keyLesson && (
            <div className="rounded-md bg-[var(--bg-subtle)] p-4 border-l-2 border-[var(--accent)]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-text)] mb-1">
                Key Lesson Learned
              </p>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">{keyLesson}</p>
            </div>
          )}

          <div className="pt-2 border-t ev-border">
            {content ? (
              renderStoryBody(content)
            ) : (
              <p className="text-sm italic text-[var(--text-muted)]">
                Your story content will appear here…
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Complete 11-Field Story Submission Form */
        <form onSubmit={handleFinalAction} className="space-y-6">
          {validationError && (
            <div className="p-3.5 rounded-md bg-[var(--status-danger-bg)] text-[var(--status-danger)] text-xs font-medium">
              {validationError}
            </div>
          )}

          {/* Section A: Title & Narrative */}
          <div className="ev-surface rounded-lg p-5 sm:p-7 space-y-5">
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  1. Story Title *
                </label>
                <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
                  {title.length}/{STORY_LIMITS.TITLE_MAX}
                </span>
              </div>
              <input
                type="text"
                maxLength={STORY_LIMITS.TITLE_MAX}
                value={title}
                onChange={(e) => {
                  dirtyRef.current = true;
                  setTitle(e.target.value);
                }}
                placeholder="Summarize what happened honestly in one clear sentence…"
                className="w-full px-3.5 py-2.5 rounded-md font-editorial text-2xl ev-input"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  2. Your Story *
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => insertFormat('## ')}
                    title="Insert section heading"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                    Heading
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormat('> ')}
                    title="Insert pull quote"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                  >
                    <Quote className="w-3.5 h-3.5" />
                    Quote
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormat('- ')}
                    title="Insert bullet item"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                  >
                    <List className="w-3.5 h-3.5" />
                    List
                  </button>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                rows={12}
                maxLength={STORY_LIMITS.CONTENT_MAX}
                value={content}
                onChange={(e) => {
                  dirtyRef.current = true;
                  setContent(e.target.value);
                }}
                placeholder="Share the context: what changed, how leadership handled the conversation or transition, what surprised you, and how things turned out afterward…"
                className="w-full px-3.5 py-3 rounded-md text-sm leading-[1.7] ev-input"
              />
              <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-1">
                <span>Minimum {STORY_LIMITS.CONTENT_MIN} characters for public submission</span>
                <span>
                  {content.length.toLocaleString()}/{STORY_LIMITS.CONTENT_MAX.toLocaleString()} · ~
                  {estimatedMinutes} min read
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  9. Key Lesson Learned *
                </label>
                <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
                  {keyLesson.length}/{STORY_LIMITS.LESSON_MAX}
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={STORY_LIMITS.LESSON_MAX}
                value={keyLesson}
                onChange={(e) => {
                  dirtyRef.current = true;
                  setKeyLesson(e.target.value);
                }}
                placeholder="If a friend joined this workplace or faced the same exit tomorrow, what practical advice would save them stress or money?"
                className="w-full px-3.5 py-2.5 rounded-md text-sm ev-input"
              />
            </div>
          </div>

          {/* Section B: Workplace & Role Metadata (Fields 3–8) */}
          <div className="ev-surface rounded-lg p-5 sm:p-7 space-y-5">
            <h2 className="font-editorial text-2xl text-[var(--text-primary)]">
              Role &amp; Workplace Context
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  3. Experience Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    dirtyRef.current = true;
                    setCategory(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-md text-sm ev-input"
                >
                  {EXPERIENCE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  7. Exit / Experience Type *
                </label>
                <select
                  value={experienceType}
                  onChange={(e) => {
                    dirtyRef.current = true;
                    setExperienceType(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-md text-sm ev-input"
                >
                  {EXPERIENCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  4. Industry *
                </label>
                <select
                  value={industry}
                  onChange={(e) => {
                    dirtyRef.current = true;
                    setIndustry(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-md text-sm ev-input"
                >
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  5. Employment Type *
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => {
                    dirtyRef.current = true;
                    setEmploymentType(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-md text-sm ev-input"
                >
                  {EMPLOYMENT_TYPES.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  8. Approximate Employment Duration *
                </label>
                <select
                  value={duration}
                  onChange={(e) => {
                    dirtyRef.current = true;
                    setDuration(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-md text-sm ev-input"
                >
                  {EMPLOYMENT_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Company Name with Autocomplete */}
              <div className="relative">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  6. Company Name (Optional)
                </label>
                <input
                  type="text"
                  value={companyName}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                  onChange={(e) => {
                    dirtyRef.current = true;
                    setCompanyName(e.target.value);
                  }}
                  placeholder="e.g. Northstar Freight Systems (or leave blank)"
                  className="w-full px-3 py-2 rounded-md text-sm ev-input"
                />
                {showSuggestions && companySuggestions.length > 0 && (
                  <div
                    className="absolute left-0 right-0 mt-1 rounded-md ev-surface py-1 z-20"
                    style={{ boxShadow: 'var(--shadow-overlay)' }}
                  >
                    {companySuggestions.map((s) => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => {
                          setCompanyName(s.name);
                          setIndustry(s.industry);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-subtle)] flex justify-between"
                      >
                        <span className="font-medium text-[var(--text-primary)]">{s.name}</span>
                        <span className="text-[var(--text-muted)]">{s.industry}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!companyName.trim() && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  General Workplace Descriptor (Optional when keeping company unnamed)
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={companyDescriptor}
                  onChange={(e) => {
                    dirtyRef.current = true;
                    setCompanyDescriptor(e.target.value);
                  }}
                  placeholder="e.g. Mid-size regional accounting firm or Series B Fintech"
                  className="w-full px-3 py-2 rounded-md text-sm ev-input"
                />
              </div>
            )}
          </div>

          {/* Section C: Optional Moderator-Only Supporting Evidence (Field 10) */}
          <div className="ev-surface rounded-lg p-5 sm:p-7 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-editorial text-2xl text-[var(--text-primary)]">
                  10. Optional Supporting Evidence (Moderator Eyes Only)
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Never shown publicly. Helps moderators verify context on high-sensitivity
                  submissions. Redact SSNs, bank details, and personal contact numbers before
                  attaching.
                </p>
              </div>
              <Lock className="w-4 h-4 text-[var(--accent)] shrink-0 mt-1" />
            </div>

            <textarea
              rows={2}
              value={evidenceNote}
              onChange={(e) => {
                dirtyRef.current = true;
                setEvidenceNote(e.target.value);
              }}
              placeholder="Optional context note for moderators (e.g. date of WARN notice or redacted separation letter summary)…"
              className="w-full px-3 py-2 rounded-md text-xs ev-input"
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="ev-btn-secondary inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs">
                <FileUp className="w-3.5 h-3.5" />
                <span>Attach Redacted Document / Image (&lt;250 KB)</span>
                <input
                  type="file"
                  accept=".txt,.pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {evidenceFilename && (
                <span className="text-xs text-[var(--status-positive)] font-medium">
                  Attached privately: {evidenceFilename}
                </span>
              )}
            </div>
          </div>

          {/* Section D: Identity & Privacy Choice (Field 11) */}
          <div className="ev-surface rounded-lg p-5 sm:p-7 space-y-5">
            <h2 className="font-editorial text-2xl text-[var(--text-primary)]">
              11. Public Identity &amp; Privacy Preference
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: 'anonymous' as const,
                  title: 'Publish Anonymously',
                  desc: 'Hides your @handle completely. Even your replies on this story stay protected as [OP].',
                },
                {
                  id: 'display_name' as const,
                  title: `Publish as @${user.displayName}`,
                  desc: 'Credits your community handle while keeping your email address private.',
                },
                {
                  id: 'private_draft' as const,
                  title: 'Save Privately as Draft',
                  desc: 'Stored strictly in your personal dashboard — not sent to moderation or public feeds.',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`rounded-lg p-4 border transition-colors flex flex-col justify-between space-y-2 ${
                    privacyChoice === opt.id
                      ? 'border-[var(--accent)] bg-[var(--accent-tint)]'
                      : 'ev-border hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="privacy_choice"
                      checked={privacyChoice === opt.id}
                      onChange={() => setPrivacyChoice(opt.id)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {opt.title}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                    {opt.desc}
                  </p>
                </label>
              ))}
            </div>

            {privacyChoice !== 'private_draft' && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Optional Role Label Shown Next to Author (generalize to protect yourself)
                </label>
                <input
                  type="text"
                  maxLength={65}
                  value={authorRoleContext}
                  onChange={(e) => {
                    dirtyRef.current = true;
                    setAuthorRoleContext(e.target.value);
                  }}
                  placeholder="e.g. Former Staff Engineer or Night-Shift Supervisor"
                  className="w-full px-3 py-2 rounded-md text-xs ev-input"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Byline preview: <strong className="text-[var(--text-primary)]">{publicBylinePreview}</strong>
                </p>
              </div>
            )}

            {/* Pre-publication Warning & Moderation Acknowledgement */}
            {privacyChoice !== 'private_draft' && (
              <div className="rounded-md p-4 bg-[var(--bg-subtle)] space-y-3 border ev-border">
                <div className="flex items-start gap-2.5 text-xs text-[var(--text-primary)] leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Before submitting for community moderation:</p>
                    <p className="text-[var(--text-secondary)]">
                      Do <strong>not</strong> include passwords, API keys, private contact details
                      (personal emails, phone numbers, home addresses), confidential trade
                      information, or unnecessary details that could identify private non-executive
                      co-workers.{' '}
                      {isHighCareCategory && (
                        <strong className="text-[var(--text-primary)]">
                          Because you selected “{category}”, this submission will undergo dedicated
                          moderation review rather than automatic publication.
                        </strong>
                      )}
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 pt-1 text-xs text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={confirmedSafety}
                    onChange={(e) => setConfirmedSafety(e.target.checked)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span>
                    I confirm this story reflects my firsthand experience and omits passwords,
                    private contact information, and confidential proprietary data.
                  </span>
                </label>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={persistDraftToServer}
                className="ev-btn-secondary inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Private Draft Now</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode('preview')}
                  className="ev-btn-secondary inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Story</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ev-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {submitting
                      ? 'Saving…'
                      : privacyChoice === 'private_draft'
                        ? 'Save Private Draft'
                        : 'Submit Story for Review'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
