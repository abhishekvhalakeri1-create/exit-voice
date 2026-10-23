import React from 'react';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let backendMode: 'unknown' | 'server' | 'browser' =
  typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io')
    ? 'browser'
    : 'unknown';

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (backendMode === 'browser') {
    const { handleBrowserApiRequest } = await import('./browserStore');
    return (await handleBrowserApiRequest(path, options)) as T;
  }

  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers,
    });
  } catch {
    backendMode = 'browser';
    const { handleBrowserApiRequest } = await import('./browserStore');
    return (await handleBrowserApiRequest(path, options)) as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (
    backendMode === 'unknown' &&
    (!contentType.includes('application/json') ||
      window.location.hostname.endsWith('.github.io'))
  ) {
    backendMode = 'browser';
    const { handleBrowserApiRequest } = await import('./browserStore');
    return (await handleBrowserApiRequest(path, options)) as T;
  }

  backendMode = 'server';

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || 'Unexpected response' };
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error || `Request failed (${response.status})`,
      response.status
    );
  }

  return data as T;
}

export function formatTimeAgo(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Draft';
  const target = new Date(isoDate).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - target) / 1000));

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatFullDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Unpublished';
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function renderInlineFormatting(line: string, keyPrefix: string): React.ReactNode[] {
  const tokens = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.map((tok, idx) => {
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      return (
        <strong key={`${keyPrefix}-b-${idx}`} className="font-semibold text-[var(--text-primary)]">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
      return (
        <em key={`${keyPrefix}-i-${idx}`} className="italic">
          {tok.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${idx}`}>{tok}</React.Fragment>;
  });
}

export function renderStoryBody(content: string): React.ReactNode {
  const blocks = content.replace(/\r\n/g, '\n').split(/\n{2,}/);

  return blocks.map((rawBlock, bIdx) => {
    const trimmed = rawBlock.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('## ')) {
      return (
        <h2
          key={`blk-${bIdx}`}
          className="font-editorial text-2xl sm:text-[1.7rem] leading-tight text-[var(--text-primary)] mt-8 mb-3"
        >
          {trimmed.slice(3)}
        </h2>
      );
    }

    if (trimmed.startsWith('### ')) {
      return (
        <h3
          key={`blk-${bIdx}`}
          className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-2"
        >
          {trimmed.slice(4)}
        </h3>
      );
    }

    if (trimmed.startsWith('> ')) {
      const quoteText = trimmed
        .split('\n')
        .map((l) => l.replace(/^>\s?/, ''))
        .join(' ');
      return (
        <blockquote
          key={`blk-${bIdx}`}
          className="my-6 pl-4 sm:pl-5 border-l-2 border-[var(--accent)] font-editorial italic text-xl sm:text-[1.35rem] leading-relaxed text-[var(--text-primary)]"
        >
          {renderInlineFormatting(quoteText, `q-${bIdx}`)}
        </blockquote>
      );
    }

    const lines = trimmed.split('\n');
    const isBulletList = lines.every((l) => /^[-*]\s+/.test(l.trim()));
    if (isBulletList) {
      return (
        <ul key={`blk-${bIdx}`} className="my-4 space-y-2.5 pl-5 list-disc marker:text-[var(--accent)]">
          {lines.map((line, lIdx) => (
            <li
              key={`li-${bIdx}-${lIdx}`}
              className="text-[15.5px] sm:text-[16px] leading-[1.72] text-[var(--text-primary)]"
            >
              {renderInlineFormatting(line.trim().replace(/^[-*]\s+/, ''), `ul-${bIdx}-${lIdx}`)}
            </li>
          ))}
        </ul>
      );
    }

    const isOrderedList = lines.every((l) => /^\d+\.\s+/.test(l.trim()));
    if (isOrderedList) {
      return (
        <ol key={`blk-${bIdx}`} className="my-4 space-y-2.5 pl-5 list-decimal marker:font-medium marker:text-[var(--accent)]">
          {lines.map((line, lIdx) => (
            <li
              key={`oli-${bIdx}-${lIdx}`}
              className="text-[15.5px] sm:text-[16px] leading-[1.72] text-[var(--text-primary)] pl-1"
            >
              {renderInlineFormatting(line.trim().replace(/^\d+\.\s+/, ''), `ol-${bIdx}-${lIdx}`)}
            </li>
          ))}
        </ol>
      );
    }

    return (
      <p
        key={`blk-${bIdx}`}
        className="my-4 text-[15.5px] sm:text-[16.5px] leading-[1.75] text-[var(--text-primary)] whitespace-pre-line"
      >
        {renderInlineFormatting(trimmed, `p-${bIdx}`)}
      </p>
    );
  });
}
