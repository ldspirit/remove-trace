import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

async function checkAndUpdateFriendStatus(friendId: number) {
  const items = await prisma.activityItem.findMany({
    where: { friendId },
    select: { status: true },
  });

  if (items.length === 0) return;

  const allDone = items.every(
    (item: { status: string }) => item.status === "completed" || item.status === "skipped"
  );

  if (allDone) {
    await prisma.friend.update({
      where: { id: friendId },
      data: { status: "completed" },
    });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const itemId = parseInt(id, 10);
    const body = await request.json();
    const { status } = body;

    const validStatuses = ["completed", "skipped", "review_later", "pending"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = await prisma.activityItem.findUnique({
      where: { id: itemId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Activity item not found" },
        { status: 404 }
      );
    }

    const item = await prisma.activityItem.update({
      where: { id: itemId },
      data: { status },
    });

    // If marking completed or skipped, update friend status to in_progress if not_started
    if (status === "completed" || status === "skipped") {
      const friend = await prisma.friend.findUnique({
        where: { id: item.friendId },
      });

      if (friend && friend.status === "not_started") {
        await prisma.friend.update({
          where: { id: friend.id },
          data: { status: "in_progress" },
        });
      }

      // Check if all items are now completed/skipped -> auto-complete friend
      await checkAndUpdateFriendStatus(item.friendId);
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Failed to update activity item:", error);
    return NextResponse.json(
      { error: "Failed to update activity item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const itemId = parseInt(id, 10);

    const existing = await prisma.activityItem.findUnique({
      where: { id: itemId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Activity item not found" },
        { status: 404 }
      );
    }

    await prisma.activityItem.delete({ where: { id: itemId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete activity item:", error);
    return NextResponse.json(
      { error: "Failed to delete activity item" },
      { status: 500 }
    );
  }
}
