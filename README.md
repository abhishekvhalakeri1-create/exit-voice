# ExitVoice

> **Every exit has a story.**  
> *Real experiences. Protected identities. Better workplaces.*

ExitVoice is a full-stack editorial storytelling and threaded community platform where people share firsthand workplace exit experiences — layoffs, resignations, terminations, toxic team environments, career pivots, management lessons, and positive departures.

---

## Core Architecture

- **Frontend:** React 19, TypeScript, React Router 7, Tailwind CSS v4, Editorial typography (`Instrument Serif` + `Inter` via Fontsource), warm light paper (`#FBF8F5`) and dark espresso (`#141210`) modes.
- **Backend:** Node.js 22 + Express REST API serving both `/api/*` endpoints and the SPA on a single unified origin (`0.0.0.0:3000`).
- **Database:** Built-in `node:sqlite` (`data/exitvoice.db`, WAL mode + foreign keys) with 13 normalized tables (`users`, `sessions`, `auth_tokens`, `mailbox_messages`, `user_interests`, `companies`, `stories`, `story_reactions`, `bookmarks`, `comments`, `comment_votes`, `reports`, `notifications`).
- **Authentication & Privacy:**
  - Scrypt salted password hashing + HTTP-only session cookies + active device revocation.
  - Registration without legal names, separating private account credentials (`email`) from public authorship (`@handle` or per-post `Anonymous` mode).
  - Protected `[OP]` replies on anonymous stories so authors can participate in nested Reddit-style comment threads without revealing their handle.
  - Built-in transactional **Mail Outbox Drawer** in the UI to test real cryptographic Email Verification and Password Reset token links locally.
  - Pre-publication PII pattern scanner + mandatory human Moderation Queue (`pending_review` / `high_care_review`) before public visibility.

---

## Running Locally

```bash
# Development server (Express API + Vite HMR on http://0.0.0.0:3000)
npm install
npm run dev

# Production build & server
npm run build
npm start
```

### Quick Test Accounts (also available on `/signin`)

| Role | Email | Password | Handle |
| --- | --- | --- | --- |
| Community Member (with drafts & bookmarks) | `maya@exitvoice.local` | `ExitVoice2026!` | `@maya_lin` |
| Community Moderator (with live review queue) | `mod@exitvoice.local` | `ExitVoice2026!` | `@editorial_desk` |
