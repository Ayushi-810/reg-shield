import { NextResponse } from "next/server";
import { scrapeRBI } from "@/lib/scrapers/rbi";
import { scrapeSebi } from "@/lib/scrapers/sebi";
import { analyseAll } from "@/lib/analyse";
import { prisma } from "@/lib/prisma";

// Allow up to 3 minutes for scraping + AI analysis of all circulars
export const maxDuration = 180;

export async function POST() {
  const errors: string[] = [];
  let totalFetched = 0;
  let totalNew = 0;

  const [rbiResult, sebiResult] = await Promise.allSettled([
    scrapeRBI(),
    scrapeSebi(),
  ]);

  if (rbiResult.status === "fulfilled") {
    totalFetched += rbiResult.value.fetched;
    totalNew += rbiResult.value.new;
    errors.push(...rbiResult.value.errors);
  } else {
    errors.push(`RBI scraper failed: ${String(rbiResult.reason)}`);
  }

  if (sebiResult.status === "fulfilled") {
    totalFetched += sebiResult.value.fetched;
    totalNew += sebiResult.value.new;
    errors.push(...sebiResult.value.errors);
  } else {
    errors.push(`SEBI scraper failed: ${String(sebiResult.reason)}`);
  }

  let analysed = 0;
  const hasGroqKey = ["GROQ_API_KEY_1","GROQ_API_KEY_2","GROQ_API_KEY_3","GROQ_API_KEY"].some(k => process.env[k]?.trim());
  if (hasGroqKey) {
    try {
      analysed = await analyseAll();
    } catch (err) {
      errors.push(`Analysis error: ${String(err)}`);
    }
  } else {
    errors.push("GROQ_API_KEY not set — skipping AI analysis");
  }

  return NextResponse.json({
    fetched: totalFetched,
    newCirculars: totalNew,
    analysed,
    total: await prisma.circular.count(),
    errors,
  });
}
