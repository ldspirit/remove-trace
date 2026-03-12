import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const friendId = parseInt(id, 10);

    const sessions = await prisma.cleanupSession.findMany({
      where: { friendId },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to list cleanup sessions:", error);
    return NextResponse.json(
      { error: "Failed to list cleanup sessions" },
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

    // Count current item statuses for this friend
    const items = await prisma.activityItem.findMany({
      where: { friendId },
      select: { status: true },
    });

    const itemsTotal = items.length;
    const itemsCompleted = items.filter((i: { status: string }) => i.status === "completed").length;
    const itemsSkipped = items.filter((i: { status: string }) => i.status === "skipped").length;
    const itemsRemaining = itemsTotal - itemsCompleted - itemsSkipped;

    const session = await prisma.cleanupSession.create({
      data: {
        friendId,
        itemsTotal,
        itemsCompleted,
        itemsSkipped,
        itemsRemaining,
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Failed to create cleanup session:", error);
    return NextResponse.json(
      { error: "Failed to create cleanup session" },
      { status: 500 }
    );
  }
}
