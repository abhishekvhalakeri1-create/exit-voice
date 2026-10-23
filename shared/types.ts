import {
  EmploymentDuration,
  EmploymentType,
  ExperienceCategory,
  ExperienceType,
  Industry,
} from './constants';

export type UserRole = 'member' | 'moderator';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  roleHeadline: string;
  bio: string;
  role: UserRole;
  emailVerified: boolean;
  defaultAnonymous: boolean;
  createdAt: string;
  interests: {
    categories: ExperienceCategory[];
    industries: Industry[];
  };
  unreadNotifications: number;
  pendingModerationCount?: number;
}

export type StoryStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'needs_revision'
  | 'rejected';

export type IdentityPreference = 'display_name' | 'anonymous';

export interface StorySummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: ExperienceCategory;
  industry: Industry;
  employmentType: EmploymentType;
  companyName: string | null;
  companySlug: string | null;
  companyDescriptor: string | null;
  experienceType: ExperienceType;
  duration: string;
  keyLesson: string;
  authorLabel: string;
  authorHandle: string | null;
  isAnonymous: boolean;
  readingTimeMinutes: number;
  helpfulCount: number;
  relatableCount: number;
  commentCount: number;
  bookmarkCount: number;
  viewerHelpful: boolean;
  viewerRelatable: boolean;
  viewerBookmarked: boolean;
  isOwnStory: boolean;
  status: StoryStatus;
  moderationFlag?: 'standard' | 'high_care_review';
  moderationNote?: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoryDetail extends StorySummary {
  content: string;
  companyStoryCount: number;
  // Returned ONLY when viewer is the author or a moderator:
  evidenceNote?: string | null;
  evidenceFilename?: string | null;
}

export interface CommentItem {
  id: string;
  storyId: string;
  parentId: string | null;
  body: string;
  authorLabel: string;
  authorHandle: string | null;
  isAnonymous: boolean;
  isOriginalPoster: boolean;
  isOwnComment: boolean;
  isDeleted: boolean;
  score: number;
  viewerVote: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
  industry: Industry;
  headquarters: string | null;
  sizeRange: string | null;
  storyCount: number;
  topCategories: { category: ExperienceCategory; count: number }[];
  latestStoryAt: string | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface MailboxMessage {
  id: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  actionLabel: string | null;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface SessionItem {
  id: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}
