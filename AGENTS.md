# Chat Analyzer (Codex Handoff)

## Stack
- Next.js 14 + TypeScript + Tailwind CSS
- Supabase (auth + storage)
- Qwen API (AI analysis)
- Resend (email delivery)

## Local commands
- Install: `npm ci`
- Dev: `npm run dev`
- Tests: `npm test`
- Build: `npm run build`
- Start: `npm run start`

## Environment
Copy `.env.example` → `.env.local` and fill values.

Expected keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `QWEN_API_KEY`
- `QWEN_API_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `NEXT_PUBLIC_APP_URL`

Notes:
- Never commit `.env.local` (only `.env.example` is tracked).
- Never commit build artifacts (`.next/` is ignored).

## Project layout
- `src/`: Next.js app + shared code
- `supabase/`: Supabase config/migrations (if present)
- `tests/`: Jest tests
- `prompts/`: AI prompt templates (if used by analyzer)

## Product rules (current)
- 1 free generation per user, then paid (250₽)
- Upload TXT/JSON up to 10MB
- Show teaser for free; full result only after payment
- Optionally email results via Resend
