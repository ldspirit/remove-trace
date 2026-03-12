import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const friendId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { friendId };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const items = await prisma.activityItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to list activity items:", error);
    return NextResponse.json(
      { error: "Failed to list activity items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const friendId = parseInt(id, 10);

    const friend = await prisma.friend.findUnique({
      where: { id: friendId },
    });

    if (!friend) {
      return NextResponse.json({ error: "Friend not found" }, { status: 404 });
    }

    const body = await request.json();

    // Support bulk paste: body can be an array or a single object
    const itemsInput = Array.isArray(body) ? body : [body];

    const batchId =
      itemsInput.length > 1
        ? `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        : undefined;

    const created = [];

    for (const item of itemsInput) {
      if (!item.type) {
        return NextResponse.json(
          { error: "type is required for each item" },
          { status: 400 }
        );
      }

      const record = await prisma.activityItem.create({
        data: {
          friendId,
          type: item.type,
          contentPreview: item.contentPreview ?? "",
          facebookUrl: item.facebookUrl ?? "",
          interactionDate: item.interactionDate
            ? new Date(item.interactionDate)
            : null,
          status: item.status ?? "pending",
          discoveredVia: item.discoveredVia ?? "manual",
          batchId: batchId ?? item.batchId ?? null,
          notes: item.notes ?? "",
        },
      });

      created.push(record);
    }

    if (created.length === 1) {
      return NextResponse.json(created[0], { status: 201 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create activity item:", error);
    return NextResponse.json(
      { error: "Failed to create activity item" },
      { status: 500 }
    );
  }
}
