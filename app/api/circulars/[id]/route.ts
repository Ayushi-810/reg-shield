import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const circular = await prisma.circular.findUnique({
    where: { id },
  });

  if (!circular) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...circular,
    actionItems: circular.actionItems ? JSON.parse(circular.actionItems) : [],
  });
}
