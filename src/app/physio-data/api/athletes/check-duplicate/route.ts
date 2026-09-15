import { NextRequest, NextResponse } from "next/server";
import { physioPrisma } from "@/lib/prisma-physio";
import { requireAuth } from "@/lib/auth-physio";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const firstName = searchParams.get("firstName")?.trim();
    const lastName = searchParams.get("lastName")?.trim();

    if (!firstName || !lastName) {
      return NextResponse.json({
        duplicates: [],
        message: "firstName and lastName query params required",
      });
    }

    // Exact match, case-insensitive, on both archived and non-archived athletes
    const duplicates = await physioPrisma.athlete.findMany({
      where: {
        firstName: { equals: firstName },
        lastName: { equals: lastName },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        email: true,
        isArchived: true,
      },
    });

    return NextResponse.json({ duplicates });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/athletes/check-duplicate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}