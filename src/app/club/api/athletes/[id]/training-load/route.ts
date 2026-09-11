import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "30", 10) || 30, 1), 365);

    const athlete = await prisma.athlete.findUnique({ where: { id } });
    if (!athlete) {
      return NextResponse.json(
        { error: "Athlète introuvable" },
        { status: 404 }
      );
    }

    const now = new Date();
    const lookbackDate = new Date();
    lookbackDate.setDate(now.getDate() - days);

    const loads = await prisma.trainingLoad.findMany({
      where: {
        athleteId: id,
        date: { gte: lookbackDate },
      },
      orderBy: { date: "desc" },
      select: {
        date: true,
        rpe: true,
        durationMin: true,
        load: true,
        sessionType: true,
      },
    });

    // Prepare load records with computed load if missing
    const formattedLoads = loads.map((l) => ({
      date: l.date,
      rpe: l.rpe,
      durationMin: l.durationMin,
      load: l.load ? Number(l.load) : l.rpe * l.durationMin,
      sessionType: l.sessionType,
    }));

    // ACWR calculation: acute = avg daily load over last 7 days, chronic = avg daily load over last 28 days
    const nowMs = now.getTime();
    const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
    const twentyEightDaysAgo = new Date(nowMs - 28 * 24 * 60 * 60 * 1000);

    // Group loads by day and sum load per day for each period
    const dailyLoads = new Map<string, number>();
    for (const l of loads) {
      const dateStr = l.date.toISOString().slice(0, 10);
      const loadVal = l.load ? Number(l.load) : l.rpe * l.durationMin;
      dailyLoads.set(dateStr, (dailyLoads.get(dateStr) || 0) + loadVal);
    }

    const acuteDays: number[] = [];
    const chronicDays: number[] = [];

    for (const [dateStr, totalLoad] of dailyLoads.entries()) {
      const dateMs = new Date(dateStr + "T00:00:00").getTime();
      if (dateMs >= sevenDaysAgo.getTime()) {
        acuteDays.push(totalLoad);
      }
      if (dateMs >= twentyEightDaysAgo.getTime()) {
        chronicDays.push(totalLoad);
      }
    }

    const acuteLoad =
      acuteDays.length > 0
        ? acuteDays.reduce((a, b) => a + b, 0) / acuteDays.length
        : 0;
    const chronicLoad =
      chronicDays.length > 0
        ? chronicDays.reduce((a, b) => a + b, 0) / chronicDays.length
        : 0;
    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : null;

    let status: string;
    if (acwr === null) {
      status = "Données insuffisantes";
    } else if (acwr < 0.8) {
      status = "Risque blessure (sous-entraînement)";
    } else if (acwr <= 1.3) {
      status = "Zone optimale";
    } else {
      status = "Risque blessure (surentraînement)";
    }

    return NextResponse.json({
      loads: formattedLoads,
      summary: {
        acuteLoad: Math.round(acuteLoad * 100) / 100,
        chronicLoad: Math.round(chronicLoad * 100) / 100,
        acwr: acwr !== null ? Math.round(acwr * 100) / 100 : null,
        status,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("GET /api/athletes/[id]/training-load error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
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

    const { rpe, durationMin, sessionType, date } = body;

    // Validate required fields
    if (
      rpe === undefined ||
      rpe === null ||
      durationMin === undefined ||
      durationMin === null
    ) {
      return NextResponse.json(
        { error: "Les champs rpe et durationMin sont requis" },
        { status: 400 }
      );
    }

    const rpeNum = parseInt(rpe, 10);
    const durationMinNum = parseInt(durationMin, 10);

    if (isNaN(rpeNum) || rpeNum < 1 || rpeNum > 10) {
      return NextResponse.json(
        { error: "Le RPE doit être un nombre entre 1 et 10" },
        { status: 400 }
      );
    }

    if (isNaN(durationMinNum) || durationMinNum < 1) {
      return NextResponse.json(
        { error: "La durée doit être un nombre positif" },
        { status: 400 }
      );
    }

    const athlete = await prisma.athlete.findUnique({ where: { id } });
    if (!athlete) {
      return NextResponse.json(
        { error: "Athlète introuvable" },
        { status: 404 }
      );
    }

    const loadValue = rpeNum * durationMinNum;
    const dateObj = date ? new Date(date) : new Date();
    const type = sessionType || "TRAINING";

    const record = await prisma.trainingLoad.upsert({
      where: {
        athleteId_date_sessionType: {
          athleteId: id,
          date: dateObj,
          sessionType: type,
        },
      },
      update: {
        rpe: rpeNum,
        durationMin: durationMinNum,
        load: loadValue,
        recordedById: session.userId,
      },
      create: {
        athleteId: id,
        date: dateObj,
        rpe: rpeNum,
        durationMin: durationMinNum,
        load: loadValue,
        sessionType: type,
        recordedById: session.userId,
      },
      select: {
        id: true,
        date: true,
        rpe: true,
        durationMin: true,
        load: true,
        sessionType: true,
      },
    });

    return NextResponse.json({
      message: type === sessionType ? "Charge d'entraînement enregistrée" : "Charge d'entraînement mise à jour",
      record: {
        ...record,
        load: record.load ? Number(record.load) : loadValue,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("POST /api/athletes/[id]/training-load error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}