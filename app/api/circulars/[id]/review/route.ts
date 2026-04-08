import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const circular = await prisma.circular.update({
      where: { id },
      data: {
        reviewed: true,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({
      ...circular,
      actionItems: circular.actionItems ? JSON.parse(circular.actionItems) : [],
    });
  } catch {
    return NextResponse.json({ error: "Circular not found" }, { status: 404 });
  }
}
