import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RelevanceKey = "HIGH" | "MEDIUM" | "LOW" | "NOT_RELEVANT";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source") || "all";
  const reviewed = searchParams.get("reviewed") || "all";

  const where: Record<string, unknown> = {};
  if (source !== "all") where.source = source;
  if (reviewed === "true") where.reviewed = true;
  if (reviewed === "false") where.reviewed = false;

  const circulars = await prisma.circular.findMany({
    where,
    orderBy: [{ reviewed: "asc" }, { publishedAt: "desc" }],
  });

  const grouped: Record<RelevanceKey, typeof circulars> = {
    HIGH: [],
    MEDIUM: [],
    LOW: [],
    NOT_RELEVANT: [],
  };

  for (const c of circulars) {
    const key = (c.relevance || "LOW") as RelevanceKey;
    grouped[key] ? grouped[key].push(c) : grouped.LOW.push(c);
  }

  const parse = (items: typeof circulars) =>
    items.map((c) => ({
      ...c,
      actionItems: c.actionItems ? JSON.parse(c.actionItems) : [],
    }));

  return NextResponse.json({
    HIGH: parse(grouped.HIGH),
    MEDIUM: parse(grouped.MEDIUM),
    LOW: parse(grouped.LOW),
    NOT_RELEVANT: parse(grouped.NOT_RELEVANT),
  });
}
