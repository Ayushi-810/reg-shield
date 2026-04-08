import { prisma } from "../prisma";
import type { ScrapeResult } from "./rbi";

// SEBI Circulars listing page — publicly accessible
// Structure: <tr role='row' class='odd'> with <td>Date</td><td><a href title="...">
// All rows have class='odd' in static HTML (JS does even/odd alternation client-side)
// The header <tr> has no role attribute — so we match role='row' directly

// Filter out SEBI circulars that have zero relevance to a payment/remittance institution
const SEBI_NOISE_PATTERNS = [
  /stock\s*broker/i,
  /clearing\s*member/i,
  /commodity\s*derivative/i,
  /settlement\s*guarantee\s*fund/i,
  /credit\s*rating\s*agenc/i,
  /\bCRA\b/,
  /research\s*analyst/i,
  /green\s*debt/i,
  /debenture\s*trustee/i,
  /listing\s*obligation.*disclosure/i,       // LODR — bank/equity issuer rules
  /non-?compliance.*listing/i,
  /investment\s*adviser/i,
  /portfolio\s*manager/i,
  /capacity\s*planning.*performance\s*monitoring/i,
  /real\s*time\s*performance\s*monitoring/i,
];

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.sebi.gov.in/",
};

interface Item {
  title: string;
  url: string;
  publishedAt: Date;
}

const SIXTY_DAYS_AGO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 60);
  return d;
};

async function fetchSEBICirculars(): Promise<Item[]> {
  const res = await fetch(
    "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=7&smid=0",
    { headers: HEADERS, signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) throw new Error(`SEBI circulars: HTTP ${res.status}`);
  const html = await res.text();

  const items: Item[] = [];
  const cutoff = SIXTY_DAYS_AGO();

  // Match only rows that explicitly have role='row' — skips the header <tr>
  // Use a non-greedy match bounded by the role attribute anchor
  const rowPattern = /<tr\s+role=['"]row['"][^>]*>([\s\S]*?)<\/tr>/g;
  const datePattern =
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})\b/;
  // title attribute is the cleanest source — inner text has extra whitespace
  const linkPattern =
    /href=["'](https?:\/\/www\.sebi\.gov\.in\/legal\/[^"']+\.html)["'][^>]*title=["']([^"']{5,})["']/;

  let m: RegExpExecArray | null;
  // Reset lastIndex to be safe (flag 'g' tracks state)
  rowPattern.lastIndex = 0;

  while ((m = rowPattern.exec(html)) !== null) {
    const row = m[1];
    const dm = row.match(datePattern);
    const lm = row.match(linkPattern);
    if (!dm || !lm) continue;

    const publishedAt = new Date(`${dm[1]} ${dm[2]}, ${dm[3]}`);
    if (isNaN(publishedAt.getTime()) || publishedAt < cutoff) continue;

    const title = lm[2].trim();
    if (SEBI_NOISE_PATTERNS.some((p) => p.test(title))) continue;

    items.push({
      title,
      url: lm[1],
      publishedAt,
    });
  }

  return items;
}

async function extractText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10000);
}

export async function scrapeSebi(): Promise<ScrapeResult> {
  const errors: string[] = [];
  let fetched = 0;
  let newCount = 0;

  try {
    const items = await fetchSEBICirculars();
    fetched = items.length;

    for (const item of items) {
      try {
        const exists = await prisma.circular.findUnique({ where: { url: item.url } });
        if (exists) continue;

        let rawText = item.title;
        try {
          rawText = await extractText(item.url);
        } catch {
          // use title as fallback
        }

        await prisma.circular.create({
          data: {
            title: item.title,
            source: "SEBI",
            url: item.url,
            publishedAt: item.publishedAt,
            rawText,
          },
        });
        newCount++;
      } catch (err) {
        errors.push(`SEBI save error: ${String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`SEBI scraper failed: ${String(err)}`);
  }

  return { fetched, new: newCount, errors };
}
