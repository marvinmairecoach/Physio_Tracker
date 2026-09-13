import { NextRequest, NextResponse } from "next/server";
import { physioPrisma } from "@/lib/prisma-physio";
import { requireAuth } from "@/lib/auth-physio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    const participants = await physioPrisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, role: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                sender: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: "desc" } },
    });

    const conversations = participants.map((p: any) => {
      const conv = p.conversation;
      const lastMessage = conv.messages[0] ?? null;

      return {
        id: conv.id,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        participants: conv.participants.map((pp: any) => ({
          id: pp.user.id,
          firstName: pp.user.firstName,
          lastName: pp.user.lastName,
          role: pp.user.role,
        })),
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
              senderName: `${lastMessage.sender.firstName} ${lastMessage.sender.lastName}`,
            }
          : null,
        lastReadAt: p.lastReadAt,
      };
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/messaging/conversations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.userId;
    const body = await request.json();
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json({ error: "participantId is required" }, { status: 400 });
    }

    const currentUser = await physioPrisma.user.findUnique({ where: { id: userId } });
    const targetUser = await physioPrisma.user.findUnique({ where: { id: participantId } });

    if (!currentUser || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Athlete can only message their coach (the user who created them)
    if (currentUser.role === "athlete") {
      const athlete = await physioPrisma.athlete.findFirst({
        where: { userId, createdById: participantId },
      });
      if (!athlete) {
        return NextResponse.json({ error: "Vous ne pouvez contacter que votre coach" }, { status: 403 });
      }
    }

    if (targetUser.role === "athlete" && currentUser.role === "coach") {
      const athlete = await physioPrisma.athlete.findFirst({
        where: { userId: participantId, createdById: userId },
      });
      if (!athlete) {
        return NextResponse.json({ error: "Vous ne pouvez contacter que vos athlètes" }, { status: 403 });
      }
    }

    // Check if conversation already exists
    const existing = await physioPrisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: participantId } } },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ conversationId: existing.id });
    }

    const conversation = await physioPrisma.conversation.create({
      data: {
        participants: {
          createMany: {
            data: [
              { userId },
              { userId: participantId },
            ],
          },
        },
      },
    });

    return NextResponse.json({ conversationId: conversation.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/messaging/conversations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}