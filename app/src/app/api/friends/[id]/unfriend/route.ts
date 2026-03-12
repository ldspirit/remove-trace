import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const friendId = parseInt(id, 10);

    const existing = await prisma.friend.findUnique({
      where: { id: friendId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Friend not found" }, { status: 404 });
    }

    const friend = await prisma.friend.update({
      where: { id: friendId },
      data: {
        unfriendedAt: new Date(),
        status: "unfriended",
      },
    });

    return NextResponse.json(friend);
  } catch (error) {
    console.error("Failed to mark friend as unfriended:", error);
    return NextResponse.json(
      { error: "Failed to mark friend as unfriended" },
      { status: 500 }
    );
  }
}
