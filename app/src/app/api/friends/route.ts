import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { profileUrl: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = parseInt(priority, 10);
    }

    const friends = await prisma.friend.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(friends);
  } catch (error) {
    console.error("Failed to list friends:", error);
    return NextResponse.json(
      { error: "Failed to list friends" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, profileUrl, priority, notes } = body;

    if (!name || !profileUrl) {
      return NextResponse.json(
        { error: "name and profileUrl are required" },
        { status: 400 }
      );
    }

    const friend = await prisma.friend.create({
      data: {
        name,
        profileUrl,
        priority: priority ?? 2,
        notes: notes ?? "",
      },
    });

    return NextResponse.json(friend, { status: 201 });
  } catch (error) {
    console.error("Failed to create friend:", error);
    return NextResponse.json(
      { error: "Failed to create friend" },
      { status: 500 }
    );
  }
}
