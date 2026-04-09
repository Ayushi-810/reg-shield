# Regshield

Automated compliance monitoring for **Glomo** — an IFSC-licensed payment institution in GIFT City processing outward remittances under LRS.

The compliance team previously visited RBI and SEBI manually, downloaded circulars, read them, and flagged action items. Regshield automates that entire loop.

---

## What it does

1. **Scrapes** RBI and SEBI for circulars published in the last 60 days
2. **Filters** out structural noise (auctions, monetary policy, market ops) before any AI call
3. **Analyses** each circular with Groq (Llama 3.3 70B) — plain-English summary, relevance score, Glomo-specific impact, action items with owner + deadline
4. **Presents** results in a grouped feed by priority: HIGH → MEDIUM → LOW, with NOT RELEVANT hidden by default

---

## Architecture

```
Browser
  └── Next.js 16 (App Router)
        ├── app/page.tsx          — main feed UI
        ├── app/api/fetch         — POST: scrape + analyse
        ├── app/api/circulars     — GET: feed data
        └── app/api/circulars/[id]— GET/PATCH: detail + review

lib/
  ├── scrapers/rbi.ts   — scrapes RBI press releases + circulars
  ├── scrapers/sebi.ts  — scrapes SEBI circulars
  ├── analyse.ts        — two-pass Groq analysis + key rotation
  └── prisma.ts         — Prisma client → Turso (libSQL)

Database: Turso (libSQL) via Prisma adapter
AI:       Groq API — llama-3.3-70b-versatile
```

---

## Setup

### Prerequisites

- Node.js 18+
- A [Turso](https://turso.tech) database (free tier)
- Up to 3 [Groq](https://console.groq.com) API keys (free tier)

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd regshield
npm install

# 2. Configure environment
cp .env.example .env
# Fill in your keys — see .env.example for required variables

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to Turso (first time only)
node scripts/reset-turso.mjs   # run only to wipe DB; schema is auto-created

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Fetch Now**.

---

## Environment Variables

```bash
# Groq API keys — rotate on 429 rate limit errors
GROQ_API_KEY_1=gsk_...
GROQ_API_KEY_2=gsk_...   # optional but recommended
GROQ_API_KEY_3=gsk_...   # optional

# Turso database
TURSO_DATABASE_URL=https://<your-db>.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

---

## Tech Stack

| Technology | Why it's here |
|------------|---------------|
| **Next.js 16 (App Router)** | Single deployable unit — UI pages and API route handlers live together; no separate backend process |
| **React 19** | UI rendering; client components used only where interactivity is needed |
| **TypeScript** | Shared types across UI and API (e.g. `Circular`, `GroupedCirculars`) keep data contracts explicit |
| **Prisma 6** | Schema definition and type-safe DB access; `prisma generate` produces the client from `schema.prisma` |
| **Turso (libSQL)** | Serverless SQLite — low-latency edge DB with a generous free tier; accessed via `@prisma/adapter-libsql` |
| **Groq SDK** | Inference on `llama-3.3-70b-versatile`; chosen for fast inference speed on large-context regulatory text |
| **Cheerio** | Lightweight HTML parser for scraping RBI and SEBI listing pages without a headless browser |
| **Radix UI** | Accessible unstyled primitives (accordion, dialog, scroll-area, toast) that the UI is composed from |
| **Tailwind CSS 4** | Utility classes for spacing and layout in component files |
| **Vercel** | Deploy target; `vercel.json` extends the `/api/fetch` route timeout to 180 s to cover full scrape + AI analysis |

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/fetch` | Scrape RBI + SEBI, run AI analysis, save to Turso |
| `GET` | `/api/circulars` | Fetch all circulars grouped by relevance |
| `GET` | `/api/circulars/[id]` | Single circular detail |
| `PATCH` | `/api/circulars/[id]/review` | Mark circular as reviewed |

---
