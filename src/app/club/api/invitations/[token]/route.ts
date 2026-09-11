import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/invitations/[token] — get invitation info for public wellness page
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const invitation = await prisma.sessionInvitation.findUnique({
      where: { responseToken: token },
      include: {
        athlete: {
          select: { id: true, firstName: true, lastName: true },
        },
        session: {
          select: { id: true, title: true, date: true, dataCollectionStatus: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation introuvable" },
        { status: 404 }
      );
    }

    if (invitation.respondedAt) {
      return NextResponse.json({
        alreadySubmitted: true,
        athlete: invitation.athlete,
        session: invitation.session,
      });
    }

    if (invitation.session.dataCollectionStatus !== "pending") {
      return NextResponse.json(
        { error: "La collecte des données est terminée" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      athlete: invitation.athlete,
      session: invitation.session,
    });
  } catch (error) {
    console.error("GET /api/invitations/[token] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}