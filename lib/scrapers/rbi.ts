import { prisma } from "../prisma";

export interface ScrapeResult {
  fetched: number;
  new: number;
  errors: string[];
}

interface Item {
  title: string;
  url: string;
  publishedAt: Date;
}

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const SIXTY_DAYS_AGO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 60);
  return d;
};

// Titles matching these patterns are structural noise — never relevant to
// a payment institution doing LRS remittances. Filter before saving to DB.
const NOISE_PATTERNS = [
  // Market operations & auctions
  /auction/i,
  /treasury\s*bill/i,
  /t-bill/i,
  /government\s*(securities|bonds|stock)/i,
  /open\s*market\s*operation/i,
  /liquidity\s*adjustment\s*facility/i,
  /variable\s*rate\s*(repo|reverse\s*repo)/i,
  /standing\s*deposit\s*facility/i,
  /marginal\s*standing\s*facility/i,
  /money\s*market\s*operation/i,
  /market\s*borrowing/i,
  /state\s*government.*borrowing/i,
  /union\s*territory.*borrowing/i,
  /cash\s*management\s*bill/i,
  /dated\s*securities/i,
  /state\s*development\s*loan/i,
  /ways\s*and\s*means/i,
  /result\s*of\s*(auction|tender)/i,
  /notified\s*amount/i,
  /91-day|182-day|364-day/i,
  /floating\s*rate\s*(bond|savings\s*bond)/i,
  /rate\s*of\s*interest\s*on\s*government/i,
  /indicative\s*calendar/i,

  // Macroeconomic stats & surveys
  /forex\s*reserve/i,
  /foreign\s*exchange\s*reserve/i,
  /reserve\s*money/i,
  /money\s*supply/i,
  /weekly\s*statistical/i,
  /forward\s*looking\s*survey/i,
  /supervisory\s*data\s*quality/i,
  /processing\s*of\s*application.*citizen/i,
  /withdrawal.*denomination.*banknote/i,
  /banknote.*withdrawal/i,

  // Monetary policy narrative
  /monetary\s*policy\s*statement/i,
  /governor.s\s*statement/i,
  /statement\s*on\s*developmental\s*and\s*regulatory\s*polic/i,
  /policy\s*repo\s*rate/i,
  /benchmark\s*rate/i,

  // Co-operative & urban bank specific (not Glomo's world)
  /cooperative\s*bank/i,
  /co-operative\s*bank/i,
  /urban\s*co.?operative/i,
  /directions\s*under\s*section\s*35a/i,
  /banking\s*regulation\s*act.*section\s*35a/i,
  /cancels\s*the\s*licence/i,
  /cancel.*licence.*bank/i,
  /branch\s*authorisation/i,
  /empanelment/i,
  /appointment\s*of\s*(director|officer|executive)/i,
];

function isNoise(title: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(title));
}

// ── RBI Press Releases ─────────────────────────────────────────────────────
// Actual HTML structure (confirmed):
//   <tr><td class="tableheader"><b>Apr 08, 2026</b></td></tr>
//   <tr><td><a class='link2' href=BS_PressReleaseDisplay.aspx?prid=62526>Title</a></td></tr>
// Note: href has NO quotes and is relative — needs https://www.rbi.org.in/scripts/ prefix
async function fetchPressReleases(): Promise<Item[]> {
  const res = await fetch(
    "https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx",
    { headers: HEADERS, signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) throw new Error(`RBI press releases: HTTP ${res.status}`);
  const html = await res.text();

  const items: Item[] = [];
  let currentDate = new Date();

  // Date rows: <b>Apr 08, 2026<b> or <b>Apr 08, 2026</b>
  const datePattern = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})\b/;

  // Links: href=BS_PressReleaseDisplay.aspx?prid=NNNNN (no quotes, relative)
  // Also handle quoted variants: href="..." or href='...'
  const linkPattern = /href=["']?(BS_PressReleaseDisplay\.aspx\?prid=(\d+))["']?[^>]*>([\s\S]*?)<\/a>/gi;

  // Process line by line to track dates above link rows
  const cutoff = SIXTY_DAYS_AGO();

  for (const line of html.split("\n")) {
    const dm = line.match(datePattern);
    if (dm) {
      const d = new Date(`${dm[1]} ${dm[2]}, ${dm[3]}`);
      if (!isNaN(d.getTime())) currentDate = new Date(d);
    }

    // Stop once we've passed the 60-day window
    if (currentDate < cutoff) break;

    let m: RegExpExecArray | null;
    const re = /href=["']?(BS_PressReleaseDisplay\.aspx\?prid=(\d+))["']?[^>]*>([\s\S]*?)<\/a>/gi;
    while ((m = re.exec(line)) !== null) {
      const url = `https://www.rbi.org.in/scripts/${m[1]}`;
      const title = m[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (title.length >= 10 && !isNoise(title)) {
        items.push({ title, url, publishedAt: new Date(currentDate) });
      }
    }
  }

  return items;
}

// ── RBI Circulars/Notifications ─────────────────────────────────────────────
// Actual HTML structure (confirmed):
//   <tr><th colspan="5">RBI Circulars April - 2026</th></tr>
//   <tr>
//     <td><a href="BS_CircularIndexDisplay.aspx?Id=13364">RBI/2026-2027/05<BR>A.P.(DIR) Circular No.04</a></td>
//     <td align="center">02.4.2026</td>   ← date is DD.M.YYYY
//     <td>Foreign Exchange Department</td>
//     <td>Subject text here</td>
//     <td>Meant For</td>
//   </tr>
// Most relevant for Glomo: Foreign Exchange Dept, FEMA, LRS, KYC circulars
async function fetchCirculars(): Promise<Item[]> {
  const res = await fetch(
    "https://www.rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx",
    { headers: HEADERS, signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) throw new Error(`RBI circulars: HTTP ${res.status}`);
  const html = await res.text();

  const items: Item[] = [];

  // Each data row has: link in td[0], date DD.M.YYYY in td[1], dept in td[2], subject in td[3]
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    // Note: RBI's HTML is malformed — the <a> tag is never closed before </td>
    // so we match up to </td> or </a>, whichever comes first
    const linkPattern = /href=["']?(BS_CircularIndexDisplay\.aspx\?Id=(\d+))["']?[^>]*>([\s\S]*?)(?:<\/a>|<\/td>)/i;
  const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  // Date format: DD.M.YYYY or DD.MM.YYYY
  const datePattern = /(\d{1,2})\.(\d{1,2})\.(\d{4})/;

  const cutoff = SIXTY_DAYS_AGO();
  let m: RegExpExecArray | null;

  while ((m = rowPattern.exec(html)) !== null) {
    const row = m[1];
    const linkMatch = row.match(linkPattern);
    if (!linkMatch) continue;

    const circularRef = linkMatch[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const url = `https://www.rbi.org.in/scripts/${linkMatch[1]}`;

    // Extract all <td> contents — td[1]=date, td[3]=subject
    const tds: string[] = [];
    let tdMatch: RegExpExecArray | null;
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    while ((tdMatch = tdRe.exec(row)) !== null) {
      tds.push(tdMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
    }

    const dateStr = tds[1] || "";
    const subject = tds[3] || "";

    const dm = dateStr.match(datePattern);
    let publishedAt = new Date();
    if (dm) {
      publishedAt = new Date(`${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`);
      if (isNaN(publishedAt.getTime())) publishedAt = new Date();
    }

    if (publishedAt < cutoff) continue;

    const title = subject.length >= 10 ? subject : circularRef;
    if (title.length >= 10 && !isNoise(title)) {
      items.push({ title, url, publishedAt });
    }
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

async function saveItems(items: Item[], source: string, errors: string[]): Promise<number> {
  let saved = 0;
  for (const item of items) {
    try {
      const exists = await prisma.circular.findUnique({ where: { url: item.url } });
      if (exists) continue;

      let rawText = item.title;
      try {
        rawText = await extractText(item.url);
      } catch {
        // use title as fallback rawText
      }

      await prisma.circular.create({
        data: {
          title: item.title,
          source,
          url: item.url,
          publishedAt: item.publishedAt,
          rawText,
        },
      });
      saved++;
    } catch (err) {
      errors.push(`${source} save error: ${String(err)}`);
    }
  }
  return saved;
}

export async function scrapeRBI(): Promise<ScrapeResult> {
  const errors: string[] = [];
  let fetched = 0;
  let newCount = 0;

  const [pressResult, circResult] = await Promise.allSettled([
    fetchPressReleases(),
    fetchCirculars(),
  ]);

  const allItems: Item[] = [];

  if (pressResult.status === "fulfilled") {
    allItems.push(...pressResult.value);
  } else {
    errors.push(`RBI press releases: ${String(pressResult.reason)}`);
  }

  if (circResult.status === "fulfilled") {
    allItems.push(...circResult.value);
  } else {
    errors.push(`RBI circulars: ${String(circResult.reason)}`);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allItems.filter((i) => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  });

  fetched = unique.length;
  newCount = await saveItems(unique, "RBI", errors);

  return { fetched, new: newCount, errors };
}
