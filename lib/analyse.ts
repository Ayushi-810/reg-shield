import Groq from "groq-sdk";
import { prisma } from "./prisma";

// ── API key rotation ──────────────────────────────────────────────────────────
// Collects all GROQ_API_KEY_1 / _2 / _3 (and the legacy GROQ_API_KEY) that are set.
// On a 429 (rate_limit_exceeded), the call retries with the next available key.
function buildKeyPool(): string[] {
  const pool: string[] = [];
  for (const name of ["GROQ_API_KEY_1", "GROQ_API_KEY_2", "GROQ_API_KEY_3", "GROQ_API_KEY"]) {
    const v = process.env[name]?.trim();
    if (v) pool.push(v);
  }
  // deduplicate
  return [...new Set(pool)];
}

const KEY_POOL = buildKeyPool();
let currentKeyIndex = 0;

function getGroqClient(): Groq {
  if (KEY_POOL.length === 0) throw new Error("No GROQ API key configured.");
  return new Groq({ apiKey: KEY_POOL[currentKeyIndex] });
}

// Rotate to next key on 429; returns true if a new key is available
function rotateKey(): boolean {
  if (KEY_POOL.length <= 1) return false;
  currentKeyIndex = (currentKeyIndex + 1) % KEY_POOL.length;
  console.warn(`Groq 429 — rotating to key index ${currentKeyIndex}`);
  return true;
}

function isRateLimitError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as Record<string, unknown>;
  return e.status === 429 ||
    (typeof e.message === "string" && e.message.includes("rate_limit_exceeded"));
}

// ── Full per-circular analysis prompt ────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior compliance officer at Glomo — an IFSC-licensed Authorised Dealer (AD) payment institution in GIFT City, India. Glomo's sole business is processing outward remittances for retail customers under the Liberalised Remittance Scheme (LRS). Glomo holds an AD-II licence, operates on the PRAVAAH portal, files Form A2 for every transaction, and must comply with FEMA, IFSCA regulations, FATF AML/CFT standards, and relevant SEBI rules on overseas investments.

You are reading a regulatory circular. Assess its impact on Glomo with precision.

── HIGH — Glomo must take immediate compliance action ──
Use HIGH when the circular changes or clarifies ANY of the following for Glomo:
  • LRS transaction limits, eligible purposes, or documentation (Form A2, CIMS reporting)
  • KYC, AML, or CFT requirements for remittance customers
  • Sanctions screening — FATF, UNSC, UAPA, or any designated lists Glomo must check
  • FEMA provisions touching outward remittances, overseas investments, foreign currency accounts
  • AD-II bank / Authorised Person obligations — including submission procedures, portal changes (PRAVAAH), or reporting formats
  • Overseas Direct Investment (ODI) or LRS-eligible overseas investment rules
  • IFSCA licensing, capital adequacy, or governance requirements for payment institutions
  • Technology, data localisation, or cybersecurity mandates applicable to payment processors
  • Any enforcement action against a payment institution, fintech, or AD bank for remittance violations

── MEDIUM — Glomo should review and may need to act ──
  • Changes to capital account convertibility rules that could expand or restrict LRS categories
  • AML/CFT guidance that extends Glomo's existing obligations without being a direct mandate
  • Risk management frameworks (operational risk, IT risk) that apply to IFSC entities
  • SEBI rules on overseas investment categories available under LRS (mutual funds, ETFs, foreign stocks)
  • Regulatory consultation papers or draft directions that will likely affect Glomo when finalised
  • Enforcement patterns against similar entities — signals heightened scrutiny in Glomo's space

── LOW — Glomo should be aware, no action required ──
  • Broad financial sector reforms that may eventually affect the payments ecosystem
  • Rules specific to scheduled commercial banks that do not apply to AD-II institutions
  • Procedural changes for entities Glomo doesn't deal with directly

── NOT_RELEVANT — clearly outside Glomo's domain ──
  • Government securities, T-bill or bond auctions, monetary policy
  • Commercial bank or co-operative bank licences, mergers, branch approvals
  • Insurance, pension, commodity derivatives
  • NBFC registration cancellations (unless for payment/remittance NBFCs)
  • Mutual fund scheme rules (unless directly about LRS-eligible overseas investment)
  • Equity capital market rules for listed companies (SEBI LODR, ICDR for issuers)
  • Forex reserve statistics, macroeconomic data releases

IMPORTANT CALIBRATION:
- "Overseas investment" + "AD bank" + "PRAVAAH" = HIGH (Glomo is the AD bank doing this)
- "FEMA reporting" + "foreign exchange" = HIGH (Glomo files FEMA returns)
- "Sanctions list update" + "UNSC" + "UAPA" = HIGH (Glomo must screen every customer)
- "Money changing" + "forex counters" = MEDIUM (adjacent to Glomo's FX operations)
- "Draft directions" from RBI on payments/remittances = MEDIUM (will affect Glomo when final)
- "Mutual fund borrowing rules" = NOT_RELEVANT
- "NBFC registration cancellation" = NOT_RELEVANT

Rules:
- In doubt between HIGH and MEDIUM → choose HIGH if Glomo must update a process, portal, or form
- In doubt between MEDIUM and LOW → choose MEDIUM
- In doubt between LOW and NOT_RELEVANT → choose NOT_RELEVANT
- HIGH and MEDIUM must have specific, concrete action items (not generic "review and assess")
- LOW and NOT_RELEVANT get empty actionItems array

Return ONLY valid JSON, no markdown:
{"summary":"2-3 plain English sentences — what does this circular say?","relevance":"HIGH"|"MEDIUM"|"LOW"|"NOT_RELEVANT","whyItMatters":"1-2 sentences specific to Glomo's LRS/AD operations","actionItems":[{"id":"string","task":"specific concrete task","owner":"Compliance"|"Product"|"Ops","timeline":"Within 7 days"|"Within 30 days"|"Before next quarterly review"}]}`;

// ── Pre-screen: title-only triage, conservative — only skip obvious noise ────
const PRESCREEN_PROMPT = `You are triaging regulatory circular titles for Glomo — an AD-II licensed payment institution in GIFT City that processes outward remittances under LRS (Liberalised Remittance Scheme). Glomo files FEMA returns, screens FATF/UNSC sanctions, uses PRAVAAH portal, and handles overseas investments for retail customers.

Classify each numbered title as:
  ANALYSE — anything touching: remittances, FEMA, foreign exchange, overseas investment, KYC/AML, sanctions, UAPA, FATF, AD bank, PRAVAAH, LRS, payments, fintech, IFSC, IFSCA, forex, cybersecurity, risk management, draft directions from RBI/SEBI, enforcement actions on payment entities
  SKIP    — clearly unrelated: bond/T-bill auctions, monetary policy statements, co-operative bank directions, NBFC registration cancellations (non-payment), mutual fund scheme rules, equity capital market rules for listed issuers, commodity derivatives, insurance, pension, forex reserve statistics

When uncertain → always choose ANALYSE. Only SKIP when you are certain it has zero relevance to an outward remittance / FX payment business.

Return ONLY a JSON object mapping each number to "ANALYSE" or "SKIP":
{"1":"ANALYSE","2":"SKIP"}`;

export interface ActionItem {
  id: string;
  task: string;
  owner: "Compliance" | "Product" | "Ops";
  timeline: string;
}

export interface AnalysisResult {
  summary: string;
  relevance: "HIGH" | "MEDIUM" | "LOW" | "NOT_RELEVANT";
  whyItMatters: string;
  actionItems: ActionItem[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Full analysis for a single circular (with key rotation on 429) ───────────
export async function analyseCircular(circularId: string): Promise<void> {
  const circular = await prisma.circular.findUnique({ where: { id: circularId } });
  if (!circular || circular.analysed) return;

  const userPrompt = `Title: ${circular.title}\nSource: ${circular.source}\nPublished: ${circular.publishedAt.toISOString().slice(0, 10)}\n\nText:\n${circular.rawText.slice(0, 2500)}`;

  const attemptsAllowed = KEY_POOL.length;
  let attempts = 0;

  while (attempts < attemptsAllowed) {
    try {
      const completion = await getGroqClient().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const result: AnalysisResult = JSON.parse(raw);

      await prisma.circular.update({
        where: { id: circularId },
        data: {
          summary: result.summary,
          relevance: result.relevance,
          whyItMatters: result.whyItMatters,
          actionItems: JSON.stringify(result.actionItems ?? []),
          analysed: true,
        },
      });
      return; // success
    } catch (err) {
      attempts++;
      if (isRateLimitError(err) && rotateKey() && attempts < attemptsAllowed) {
        console.warn(`Retrying circular ${circularId} with next key…`);
        continue;
      }
      // All keys exhausted or non-429 error
      console.error(`Analysis failed for ${circularId}:`, err);
      await prisma.circular.update({
        where: { id: circularId },
        data: {
          summary: "Analysis could not be completed.",
          relevance: "LOW",
          whyItMatters: "Unable to determine impact right now.",
          actionItems: JSON.stringify([]),
          analysed: true,
        },
      });
      return;
    }
  }
}

// ── Pre-screen: 1 API call to triage all titles (with key rotation on 429) ───
async function prescreen(
  items: { id: string; title: string }[]
): Promise<Map<string, "ANALYSE" | "SKIP">> {
  const numbered = items.map((item, i) => `${i + 1}. ${item.title}`).join("\n");

  const attemptsAllowed = KEY_POOL.length;
  let attempts = 0;

  while (attempts < attemptsAllowed) {
    try {
      const completion = await getGroqClient().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: PRESCREEN_PROMPT },
          { role: "user", content: numbered },
        ],
        temperature: 0,
        max_tokens: 256,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as Record<string, string>;

      const result = new Map<string, "ANALYSE" | "SKIP">();
      items.forEach((item, i) => {
        const val = parsed[String(i + 1)];
        result.set(item.id, val === "SKIP" ? "SKIP" : "ANALYSE");
      });
      return result;
    } catch (err) {
      attempts++;
      if (isRateLimitError(err) && rotateKey() && attempts < attemptsAllowed) {
        console.warn("Prescreen 429 — retrying with next key…");
        continue;
      }
      // All keys exhausted → analyse everything (safe fallback)
      const fallback = new Map<string, "ANALYSE" | "SKIP">();
      items.forEach((item) => fallback.set(item.id, "ANALYSE"));
      return fallback;
    }
  }

  // Should never reach here, but satisfy TypeScript
  const fallback = new Map<string, "ANALYSE" | "SKIP">();
  items.forEach((item) => fallback.set(item.id, "ANALYSE"));
  return fallback;
}

// ── Main entry: two-pass analysis with LOW cap ────────────────────────────────
// Pass 1: 1 fast call to separate noise (SKIP) from candidates (ANALYSE)
// Pass 2: full analysis on candidates; after analysis, cap LOW at 10
// SKIPs → marked NOT_RELEVANT instantly, no extra API call
const LOW_CAP = 10;

export async function analyseAll(): Promise<number> {
  const unanalysed = await prisma.circular.findMany({
    where: { analysed: false },
    select: { id: true, title: true },
    orderBy: { publishedAt: "desc" },
  });

  if (unanalysed.length === 0) return 0;

  // Pass 1 — title triage
  const triage = await prescreen(unanalysed);
  await sleep(4000);

  const toAnalyse = unanalysed
    .filter((item) => triage.get(item.id) !== "SKIP")
    .map((item) => item.id);

  const toSkipNow = unanalysed
    .filter((item) => triage.get(item.id) === "SKIP")
    .map((item) => item.id);

  // Mark obvious SKIPs immediately
  if (toSkipNow.length > 0) {
    await prisma.circular.updateMany({
      where: { id: { in: toSkipNow } },
      data: {
        summary: "Not relevant to Glomo's LRS remittance operations.",
        relevance: "NOT_RELEVANT",
        whyItMatters: "This circular does not affect Glomo's payments or FX business.",
        actionItems: JSON.stringify([]),
        analysed: true,
      },
    });
  }

  // Pass 2 — full analysis for non-skipped items
  // Groq free tier: 12k TPM. Each call ~900 tokens → ~13/min max → 5s delay is safe
  let count = 0;
  for (const id of toAnalyse) {
    await analyseCircular(id);
    count++;
    if (count < toAnalyse.length) await sleep(5000);
  }

  // After full analysis: cap LOW at LOW_CAP — excess LOW → downgrade to NOT_RELEVANT
  const lowItems = await prisma.circular.findMany({
    where: { relevance: "LOW" },
    orderBy: { publishedAt: "desc" },
    select: { id: true },
  });

  if (lowItems.length > LOW_CAP) {
    const excessIds = lowItems.slice(LOW_CAP).map((c) => c.id);
    await prisma.circular.updateMany({
      where: { id: { in: excessIds } },
      data: { relevance: "NOT_RELEVANT" },
    });
  }

  return count + toSkipNow.length;
}
