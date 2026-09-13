import { NextRequest, NextResponse } from "next/server";
import { physioPrisma } from "@/lib/prisma-physio";
import { requireAuth } from "@/lib/auth-physio";

export const dynamic = "force-dynamic";

// GET /api/messaging/conversations/[id]/messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = session.userId;
    const { id } = await params;

    // Verify user is participant
    const participant = await physioPrisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } },
    });

    if (!participant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const where: Record<string, unknown> = { conversationId: id };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const messages = await physioPrisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const hasMore = messages.length > limit;
    const result = hasMore ? messages.slice(0, limit) : messages;

    // Update lastReadAt
    await physioPrisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId } },
      data: { lastReadAt: new Date() },
    });

    // Update conversation updatedAt
    await physioPrisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      messages: result.reverse(),
      hasMore,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/messaging/conversations/[id]/messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/messaging/conversations/[id]/messages
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = session.userId;
    const { id } = await params;

    // Verify user is participant
    const participant = await physioPrisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } },
    });

    if (!participant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const message = await physioPrisma.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Update conversation timestamp
    await physioPrisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/messaging/conversations/[id]/messages error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}