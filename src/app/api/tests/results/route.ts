import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get("athleteId");
    const testTypeId = searchParams.get("testTypeId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Record<string, unknown> = {};

    if (athleteId) {
      where.athleteId = athleteId;
    }

    if (testTypeId) {
      where.testTypeId = testTypeId;
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) {
        dateFilter.gte = new Date(dateFrom);
      }
      if (dateTo) {
        dateFilter.lte = new Date(dateTo);
      }
      where.date = dateFilter;
    }

    const results = await prisma.testResult.findMany({
      where,
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        testType: true,
        recorder: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Convert Decimal values to numbers for JSON serialization
    const serialized = results.map((r) => ({
      ...r,
      value: Number(r.value),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/tests/results error:", error);
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
    const { athleteId, testTypeId, value, date, notes } = body;

    if (!athleteId || !testTypeId || value === undefined || value === null) {
      return NextResponse.json(
        { error: "athleteId, testTypeId, and value are required" },
        { status: 400 }
      );
    }

    // Verify athlete exists
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
    });
    if (!athlete) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      );
    }

    // Verify test type exists
    const testType = await prisma.testType.findUnique({
      where: { id: testTypeId },
    });
    if (!testType) {
      return NextResponse.json(
        { error: "Test type not found" },
        { status: 404 }
      );
    }

    const result = await prisma.testResult.create({
      data: {
        athleteId,
        testTypeId,
        value: parseFloat(value),
        date: date ? new Date(date) : new Date(),
        notes,
        recordedById: session.userId,
      },
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        testType: true,
      },
    });

    return NextResponse.json(
      { ...result, value: Number(result.value) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/tests/results error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}