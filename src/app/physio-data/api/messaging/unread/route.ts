import { NextResponse } from "next/server";
import { physioPrisma } from "@/lib/prisma-physio";
import { requireAuth } from "@/lib/auth-physio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    // Get all conversations the user is in, count messages after lastReadAt
    const participants = await physioPrisma.conversationParticipant.findMany({
      where: { userId },
    });

    let totalUnread = 0;

    for (const p of participants) {
      const count = await physioPrisma.message.count({
        where: {
          conversationId: p.conversationId,
          createdAt: { gt: p.lastReadAt },
          senderId: { not: userId }, // Don't count own messages as unread
        },
      });
      totalUnread += count;
    }

    return NextResponse.json({ unreadCount: totalUnread });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/messaging/unread error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}