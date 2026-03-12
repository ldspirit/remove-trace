import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const friendId = parseInt(id, 10);

    const friend = await prisma.friend.findUnique({
      where: { id: friendId },
      include: {
        _count: {
          select: {
            activityItems: true,
            cleanupSessions: true,
          },
        },
      },
    });

    if (!friend) {
      return NextResponse.json({ error: "Friend not found" }, { status: 404 });
    }

    const itemCounts = await prisma.activityItem.groupBy({
      by: ["status"],
      where: { friendId },
      _count: { status: true },
    });

    const itemCountsByStatus: Record<string, number> = {};
    for (const row of itemCounts) {
      itemCountsByStatus[row.status] = row._count.status;
    }

    return NextResponse.json({
      ...friend,
      itemCountsByStatus,
    });
  } catch (error) {
    console.error("Failed to get friend:", error);
    return NextResponse.json(
      { error: "Failed to get friend" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const friendId = parseInt(id, 10);
    const body = await request.json();

    const existing = await prisma.friend.findUnique({
      where: { id: friendId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Friend not found" }, { status: 404 });
    }

    const allowedFields = ["name", "profileUrl", "status", "priority", "notes"];
    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    const friend = await prisma.friend.update({
      where: { id: friendId },
      data,
    });

    return NextResponse.json(friend);
  } catch (error) {
    console.error("Failed to update friend:", error);
    return NextResponse.json(
      { error: "Failed to update friend" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const friendId = parseInt(id, 10);

    const existing = await prisma.friend.findUnique({
      where: { id: friendId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Friend not found" }, { status: 404 });
    }

    await prisma.friend.delete({ where: { id: friendId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete friend:", error);
    return NextResponse.json(
      { error: "Failed to delete friend" },
      { status: 500 }
    );
  }
}
