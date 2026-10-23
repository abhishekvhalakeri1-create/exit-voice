export const EXPERIENCE_CATEGORIES = [
  'Layoff',
  'Termination',
  'Resignation',
  'Workplace toxicity',
  'Management issues',
  'Unfair treatment',
  'Discrimination',
  'Positive exit',
  'Career transition',
  'Other',
] as const;

export type ExperienceCategory = (typeof EXPERIENCE_CATEGORIES)[number];

export const EXPERIENCE_TYPES = [
  'Involuntary exit',
  'Voluntary exit',
  'Constructive / forced exit',
  'Mutual separation',
  'Internal transition',
] as const;

export type ExperienceType = (typeof EXPERIENCE_TYPES)[number];

export const INDUSTRIES = [
  'Technology & Software',
  'Financial Services & Accounting',
  'Healthcare & Clinical',
  'Logistics, Supply Chain & Warehousing',
  'Retail, Food & Hospitality',
  'Manufacturing & Engineering',
  'Media, Design & Publishing',
  'Education & Research',
  'Consulting & Professional Services',
  'Public Sector & Nonprofit',
  'Other',
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Contract / Contingent',
  'Internship / Early Career',
  'Leadership / Management',
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_DURATIONS = [
  'Under 6 months',
  '6–12 months',
  '1–2 years',
  '2–5 years',
  '5–10 years',
  '10+ years',
] as const;

export type EmploymentDuration = (typeof EMPLOYMENT_DURATIONS)[number];

export const REPORT_REASONS = [
  'Contains private contact info, passwords, or doxxing details',
  'Names private non-executive individuals unfairly',
  'Shares confidential proprietary or trade secret data',
  'Harassment, hate speech, or abusive language',
  'Spam, promotional, or clearly fabricated submission',
] as const;

export const HIGH_CARE_CATEGORIES: readonly ExperienceCategory[] = [
  'Discrimination',
  'Unfair treatment',
  'Workplace toxicity',
  'Termination',
];

export const STORY_LIMITS = {
  TITLE_MIN: 10,
  TITLE_MAX: 140,
  CONTENT_MIN: 120,
  CONTENT_MAX: 15000,
  LESSON_MIN: 20,
  LESSON_MAX: 420,
  EVIDENCE_NOTE_MAX: 2000,
  COMMENT_MAX: 4000,
} as const;

export interface PiiWarning {
  kind: 'email' | 'phone' | 'credential' | 'ssn';
  label: string;
  matches: string[];
}

export function scanForSensitiveInfo(text: string): PiiWarning[] {
  const warnings: PiiWarning[] = [];
  if (!text) return warnings;

  const emails = Array.from(
    new Set(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])
  );
  if (emails.length > 0) {
    warnings.push({
      kind: 'email',
      label: 'Email address detected — consider replacing personal emails with role titles.',
      matches: emails.slice(0, 4),
    });
  }

  const phones = Array.from(
    new Set(
      text.match(/(?:\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g) || []
    )
  );
  if (phones.length > 0) {
    warnings.push({
      kind: 'phone',
      label: 'Phone number pattern detected — never publish direct personal numbers.',
      matches: phones.slice(0, 4),
    });
  }

  const credentials = Array.from(
    new Set(
      text.match(
        /\b(?:password|passwd|api[_-]?key|secret[_-]?key|bearer\s+[a-z0-9._-]+|sk-[a-zA-Z0-9]{12,})\s*[:=]?\s*\S+/gi
      ) || []
    )
  );
  if (credentials.length > 0) {
    warnings.push({
      kind: 'credential',
      label: 'Possible credential, token, or password phrase detected — remove before submitting.',
      matches: credentials.slice(0, 3),
    });
  }

  const ssns = Array.from(new Set(text.match(/\b\d{3}-\d{2}-\d{4}\b/g) || []));
  if (ssns.length > 0) {
    warnings.push({
      kind: 'ssn',
      label: 'ID / SSN-like numeric sequence detected — remove sensitive identification numbers.',
      matches: ssns.slice(0, 3),
    });
  }

  return warnings;
}

export function redactSensitiveInfo(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[redacted-email]')
    .replace(/(?:\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, '[redacted-phone]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted-id]');
}
