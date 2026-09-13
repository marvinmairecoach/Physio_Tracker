import { NextResponse } from "next/server";
import { physioPrisma } from "@/lib/prisma-physio";
import { requireAuth } from "@/lib/auth-physio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    const currentUser = await physioPrisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let contacts: any[] = [];

    if (currentUser.role === "admin") {
      // Admin can see everyone
      contacts = await physioPrisma.user.findMany({
        where: { id: { not: userId }, isActive: true },
        select: { id: true, firstName: true, lastName: true, role: true },
        orderBy: { lastName: "asc" },
      });
    } else if (currentUser.role === "coach") {
      // Coach can see their athletes + admins
      const myAthletes = await physioPrisma.athlete.findMany({
        where: { createdById: userId, isArchived: false },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      });

      const athletes = myAthletes
        .filter((a) => a.user)
        .map((a) => a.user!);

      const admins = await physioPrisma.user.findMany({
        where: { role: "admin", isActive: true },
        select: { id: true, firstName: true, lastName: true, role: true },
      });

      contacts = [...athletes, ...admins];
    } else {
      // Athlete can only see their coach
      const myAthleteRecord = await physioPrisma.athlete.findFirst({
        where: { userId },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      });

      if (myAthleteRecord?.creator) {
        contacts = [myAthleteRecord.creator];
      } else {
        contacts = [];
      }
    }

    // Deduplicate by id
    const seen = new Set<string>();
    const uniqueContacts = contacts.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    return NextResponse.json({ contacts: uniqueContacts });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/messaging/contacts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}