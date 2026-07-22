import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const teamId = searchParams.get("teamId");
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    if (teamId) {
      where.teams = {
        some: {
          teamId,
          isActive: true,
        },
      };
    }

    const [athletes, total] = await Promise.all([
      prisma.athlete.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          teams: {
            where: { isActive: true },
            include: { team: true },
          },
        },
      }),
      prisma.athlete.count({ where }),
    ]);

    return NextResponse.json({ athletes, total });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/athletes error:", error);
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
    const {
      firstName,
      lastName,
      birthDate,
      phone,
      email,
      gender,
      heightCm,
      weightKg,
      notes,
      photoUrl,
      teamId,
    } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "firstName and lastName are required" },
        { status: 400 }
      );
    }

    const athlete = await prisma.athlete.create({
      data: {
        firstName,
        lastName,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        phone,
        email,
        gender,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        notes,
        photoUrl,
        createdById: session.userId,
        teams: teamId
          ? {
              create: {
                teamId,
              },
            }
          : undefined,
      },
      include: {
        teams: {
          where: { isActive: true },
          include: { team: true },
        },
      },
    });

    return NextResponse.json(athlete, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/athletes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}