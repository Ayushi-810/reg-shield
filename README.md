# RegWatch

Automated compliance monitoring for **Glomo** — an IFSC-licensed payment institution in GIFT City that processes outward remittances under LRS.

RegWatch scrapes RBI and IFSCA websites for new regulatory circulars, runs them through Groq (Llama 3.3 70B) to assess relevance and extract action items, and presents them in a clean feed — grouped by impact level.

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: SQLite via Prisma ORM
- **AI**: Groq API (`llama-3.3-70b-versatile`) — free tier, no credit card needed
- **Scraping**: Native fetch + RSS/HTML parsing

---

## Setup

```bash
# 1. Clone repo
git clone <repo-url>
cd regshield

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env — add your GROQ_API_KEY (free at console.groq.com)

# 4. Run database migration
npx prisma migrate dev

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Getting a Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card)
3. Create an API key
4. Paste it into `.env` as `GROQ_API_KEY=gsk_...`

---

## First Run

- On first load, the app automatically seeds 8 sample circulars (4 RBI, 4 IFSCA) if the database is empty
- Click **"Fetch Now"** to pull live circulars from RBI and IFSCA and run AI analysis
- AI analysis runs on up to 10 unanalysed circulars per fetch
- Live scraping may be rate-limited — seed data is shown as fallback

---

## Features

- **Live scraping** from RBI RSS feed and IFSCA circulars page
- **AI analysis** via Groq Llama 3.3 70B: plain-english summary, relevance score (HIGH / MEDIUM / LOW / NOT RELEVANT), Glomo-specific impact, action items with owner + timeline
- **Grouped feed** — 4 accordion cards by relevance, unreviewed first
- **Insight drawer** (desktop) / **bottom sheet** (mobile) with full analysis
- **Mark as Reviewed** — optimistic UI updates, "All caught up" state
- **Source filter** — All / RBI / IFSCA
- **Mobile responsive** — sidebar hidden, bottom tab bar, swipeable sheet

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/fetch` | Scrape + analyse new circulars |
| `GET` | `/api/circulars` | Get all circulars grouped by relevance |
| `GET` | `/api/circulars/[id]` | Get single circular |
| `PATCH` | `/api/circulars/[id]/review` | Mark circular as reviewed |

---

## Deploy

### Local / Docker (recommended)

SQLite persists on the local filesystem. Works perfectly out of the box.

```bash
docker build -t regwatch .
docker run -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e GROQ_API_KEY=gsk_... \
  regwatch
```

### Vercel

Vercel's serverless filesystem is ephemeral — SQLite data resets on each redeployment.
To deploy on Vercel with persistent data, swap SQLite for **Turso** (free tier):

1. `npm install @libsql/client @prisma/adapter-libsql`
2. Create a free DB at [turso.tech](https://turso.tech)
3. Update `prisma/schema.prisma` datasource to use `libsql`
4. Set `DATABASE_URL` and `DATABASE_AUTH_TOKEN` in Vercel env vars

This is a 2-file change and takes ~10 minutes.

---

## Notes

- Scraper targets: RBI RSS (`https://www.rbi.org.in/Scripts/rss.aspx`) and IFSCA circulars page (`https://ifsca.gov.in/Circular`)
- If scraping fails, 8 realistic seed circulars covering LRS, KYC, FATF, and IFSCA licensing are shown
- Analysis capped at 10 circulars per fetch to stay within Groq free tier rate limits
- Groq's `llama-3.3-70b-versatile` with `response_format: json_object` ensures reliable structured output
