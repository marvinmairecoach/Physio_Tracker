import { NextRequest, NextResponse } from "next/server";
import { physioPrisma as prisma } from "@/lib/prisma-physio";
import { requireAuth } from "@/lib/auth-physio";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    // Accept both 'athleteId' and 'id' (PlanningTab uses 'id')
    let athleteId = searchParams.get("athleteId") || searchParams.get("id");
    const month = searchParams.get("month"); // "YYYY-MM"

    if (!athleteId || !month) {
      return NextResponse.json(
        { error: "athleteId and month query params are required" },
        { status: 400 }
      );
    }

    // If called with scope=athlete, this is from the PlanningTab
    // No special handling needed — athleteId is already set

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'month must be formatted as "YYYY-MM"' },
        { status: 400 }
      );
    }

    const [year, monthIndexRaw] = month.split("-").map(Number);
    const monthIndex = monthIndexRaw - 1;
    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59);

    const entries = await prisma.planningEntry.findMany({
      where: {
        athleteId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      orderBy: { date: "asc" },
    });

    // Map consistent format
    const mapped = entries.map((entry) => ({
      ...entry,
      origin: "individuel",
      teamName: null,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/planning error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const { title, date, type, athleteId, isObjective, notes, dateEnd, sessionData } = body;

    if (!title || !date || !athleteId) {
      return NextResponse.json(
        { error: "title, date and athleteId are required" },
        { status: 400 }
      );
    }

    const entry = await prisma.planningEntry.create({
      data: {
        title,
        date: new Date(date),
        type: type || "ENTRAINEMENT",
        athleteId,
        isObjective: isObjective ?? false,
        notes: notes ?? null,
        dateEnd: dateEnd ? new Date(dateEnd) : null,
        sessionData: sessionData ? JSON.stringify(sessionData) : null,
        createdById: session.userId,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/planning error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}