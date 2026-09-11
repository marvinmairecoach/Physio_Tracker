import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const { id } = params;

    const documents = await prisma.athleteDocument.findMany({
      where: { athleteId: id },
      include: {
        uploader: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/athletes/[id]/documents error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const { id } = params;
    const body = await request.json();
    const { name, fileUrl } = body;

    if (!name || !fileUrl) {
      return NextResponse.json(
        { error: "name et fileUrl requis" },
        { status: 400 }
      );
    }

    const document = await prisma.athleteDocument.create({
      data: {
        athleteId: id,
        name,
        fileUrl,
        uploadedById: session.userId,
      },
      include: {
        uploader: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/athletes/[id]/documents error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}