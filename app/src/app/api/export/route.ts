import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    const friends = await prisma.friend.findMany({
      include: {
        activityItems: true,
        cleanupSessions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "csv") {
      // Build CSV with one row per activity item, friend info repeated
      const headers = [
        "friend_id",
        "friend_name",
        "friend_profile_url",
        "friend_status",
        "friend_priority",
        "friend_notes",
        "friend_unfriended_at",
        "friend_blocked_at",
        "friend_created_at",
        "item_id",
        "item_type",
        "item_content_preview",
        "item_facebook_url",
        "item_interaction_date",
        "item_status",
        "item_discovered_via",
        "item_batch_id",
        "item_notes",
        "item_created_at",
      ];

      const rows: string[] = [headers.join(",")];

      function escapeCsv(value: unknown): string {
        const str = value == null ? "" : String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }

      for (const friend of friends) {
        if (friend.activityItems.length === 0) {
          // Include friend with no items
          rows.push(
            [
              friend.id,
              escapeCsv(friend.name),
              escapeCsv(friend.profileUrl),
              friend.status,
              friend.priority,
              escapeCsv(friend.notes),
              friend.unfriendedAt ?? "",
              friend.blockedAt ?? "",
              friend.createdAt,
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ].join(",")
          );
        } else {
          for (const item of friend.activityItems) {
            rows.push(
              [
                friend.id,
                escapeCsv(friend.name),
                escapeCsv(friend.profileUrl),
                friend.status,
                friend.priority,
                escapeCsv(friend.notes),
                friend.unfriendedAt ?? "",
                friend.blockedAt ?? "",
                friend.createdAt,
                item.id,
                escapeCsv(item.type),
                escapeCsv(item.contentPreview),
                escapeCsv(item.facebookUrl),
                item.interactionDate ?? "",
                item.status,
                item.discoveredVia,
                item.batchId ?? "",
                escapeCsv(item.notes),
                item.createdAt,
              ].join(",")
            );
          }
        }
      }

      const csv = rows.join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=remove-trace-export.csv",
        },
      });
    }

    // Default: JSON export
    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      friends,
    });
  } catch (error) {
    console.error("Failed to export data:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
