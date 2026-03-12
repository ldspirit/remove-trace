import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const friendCounts = await prisma.friend.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const friendsByStatus: Record<string, number> = {};
    let totalFriends = 0;
    for (const row of friendCounts) {
      friendsByStatus[row.status] = row._count.status;
      totalFriends += row._count.status;
    }

    const itemCounts = await prisma.activityItem.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const itemsByStatus: Record<string, number> = {};
    let totalItems = 0;
    for (const row of itemCounts) {
      itemsByStatus[row.status] = row._count.status;
      totalItems += row._count.status;
    }

    return NextResponse.json({
      friends: {
        total: totalFriends,
        byStatus: friendsByStatus,
      },
      items: {
        total: totalItems,
        byStatus: itemsByStatus,
      },
    });
  } catch (error) {
    console.error("Failed to get stats:", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
