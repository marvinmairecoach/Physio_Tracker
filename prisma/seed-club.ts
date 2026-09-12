import { PrismaClient } from "@prisma/club-client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ClubData...");

  // Clean in reverse dependency order
  await prisma.planningEntry.deleteMany();
  await prisma.bilan.deleteMany();
  await prisma.athleteDocument.deleteMany();
  await prisma.sessionInvitation.deleteMany();
  await prisma.sessionAssignment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.trainingLoad.deleteMany();
  await prisma.teamTestType.deleteMany();
  await prisma.testResult.deleteMany();
  await prisma.testType.deleteMany();
  await prisma.injury.deleteMany();
  await prisma.dirigeantRoleAssignment.deleteMany();
  await prisma.dirigeant.deleteMany();
  await prisma.dirigeantRole.deleteMany();
  await prisma.userRoleAssignment.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.athleteTeam.deleteMany();
  await prisma.athlete.deleteMany();
  await prisma.team.deleteMany();
  await prisma.teamCoach.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("test1234", 12);

  // Users
  const admin = await prisma.user.create({
    data: { email: "admin@test.com", passwordHash, firstName: "Admin", lastName: "Club", role: "admin", phone: "+336****5432" },
  });

  const coach = await prisma.user.create({
    data: { email: "coach@test.com", passwordHash, firstName: "Coach", lastName: "Principal", role: "coach", phone: "+336****5678" },
  });

  const coach2 = await prisma.user.create({
    data: { email: "marie@test.com", passwordHash, firstName: "Marie", lastName: "Dupont", role: "coach" },
  });

  const athleteUser = await prisma.user.create({
    data: { email: "athlete@test.com", passwordHash, firstName: "Thomas", lastName: "Joueur", role: "athlete", phone: "+336****1111" },
  });

  // Teams
  const equipeA = await prisma.team.create({
    data: { name: "FC Sénior A", sport: "Football", category: "Sénior", notes: "Équipe première du club", createdById: coach.id },
  });
  const equipeB = await prisma.team.create({
    data: { name: "FC U18", sport: "Football", category: "U18", notes: "Équipe des moins de 18 ans", createdById: coach.id },
  });

  // Team coaches
  await prisma.teamCoach.create({ data: { teamId: equipeA.id, userId: coach.id } });
  await prisma.teamCoach.create({ data: { teamId: equipeB.id, userId: coach.id } });
  await prisma.teamCoach.create({ data: { teamId: equipeB.id, userId: coach2.id } });

  // Athletes
  const athletesData = [
    { firstName: "Lucas", lastName: "Martin", teamId: equipeA.id, position: "Attaquant", jerseyNumber: 9, height: 182, weight: 76 },
    { firstName: "Hugo", lastName: "Bernard", teamId: equipeA.id, position: "Milieu", jerseyNumber: 8, height: 178, weight: 72 },
    { firstName: "Théo", lastName: "Petit", teamId: equipeA.id, position: "Défenseur", jerseyNumber: 4, height: 185, weight: 80 },
    { firstName: "Enzo", lastName: "Robert", teamId: equipeA.id, position: "Gardien", jerseyNumber: 1, height: 190, weight: 85 },
    { firstName: "Nathan", lastName: "Richard", teamId: equipeB.id, position: "Attaquant", jerseyNumber: 11, height: 175, weight: 68 },
    { firstName: "Maxime", lastName: "Simon", teamId: equipeB.id, position: "Milieu", jerseyNumber: 6, height: 177, weight: 70 },
    { firstName: "Jules", lastName: "Laurent", teamId: equipeB.id, position: "Défenseur", jerseyNumber: 5, height: 180, weight: 74 },
    { firstName: "Léo", lastName: "Michel", teamId: equipeB.id, position: "Gardien", jerseyNumber: 16, height: 188, weight: 82 },
  ];

  const athletes = [];
  for (const a of athletesData) {
    const athlete = await prisma.athlete.create({
      data: {
        firstName: a.firstName,
        lastName: a.lastName,
        birthDate: new Date("1998-06-15"),
        gender: "M" as any,
        heightCm: a.height,
        weightKg: a.weight,
        createdById: coach.id,
      },
    });

    await prisma.athleteTeam.create({
      data: { athleteId: athlete.id, teamId: a.teamId, jerseyNumber: a.jerseyNumber, position: a.position, joinedAt: new Date("2024-08-01") },
    });
    athletes.push(athlete);
  }

  // Test types
  const testTypes = [];
  for (const t of [
    { name: "Sprint 10m", category: "field", unit: "secondes", higherIsBetter: false },
    { name: "Sprint 30m", category: "field", unit: "secondes", higherIsBetter: false },
    { name: "Détente Verticale", category: "field", unit: "cm", higherIsBetter: true },
    { name: "Saut en Longueur", category: "field", unit: "cm", higherIsBetter: true },
    { name: "Beep Test", category: "field", unit: "niveaux", higherIsBetter: true },
    { name: "Force Ischio-Jambiers", category: "dynamometer", unit: "N", higherIsBetter: true },
    { name: "Pic de Puissance", category: "force_plate", unit: "W/kg", higherIsBetter: true },
  ]) {
    const tt = await prisma.testType.create({ data: t });
    testTypes.push(tt);
  }

  // Test results
  const now = new Date();
  for (let monthOffset = 3; monthOffset >= 0; monthOffset--) {
    for (const athlete of athletes) {
      for (const testType of testTypes) {
        const baseValue =
          testType.name === "Sprint 10m" ? 1.7 + Math.random() * 0.3 :
          testType.name === "Sprint 30m" ? 4.2 + Math.random() * 0.5 :
          testType.name === "Détente Verticale" ? 40 + Math.random() * 20 :
          testType.name === "Saut en Longueur" ? 200 + Math.random() * 60 :
          testType.name === "Beep Test" ? 10 + Math.random() * 6 :
          testType.name === "Force Ischio-Jambiers" ? 200 + Math.random() * 100 :
          testType.name === "Pic de Puissance" ? 40 + Math.random() * 20 : 50;
        await prisma.testResult.create({
          data: {
            athleteId: athlete.id, testTypeId: testType.id,
            value: Math.round(baseValue * 100) / 100,
            date: new Date(now.getFullYear(), now.getMonth() - monthOffset, Math.floor(Math.random() * 20) + 1),
            recordedById: coach.id,
          },
        });
      }
    }
  }

  // Training loads (last 30 days)
  for (const athlete of athletes) {
    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
      if (date.getDay() !== 0 && Math.random() > 0.4) {
        await prisma.trainingLoad.create({
          data: {
            athleteId: athlete.id, date,
            rpe: Math.floor(Math.random() * 5) + 4,
            durationMin: [45, 60, 75, 90, 120][Math.floor(Math.random() * 5)],
            recordedById: coach.id,
          },
        });
      }
    }
  }

  // Session with training-day
  const session1 = await prisma.session.create({
    data: {
      title: "Séance de VMA",
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      startTime: new Date("2024-01-01T10:00:00"),
      endTime: new Date("2024-01-01T11:30:00"),
      location: "Stade Municipal",
      type: "TRAINING",
      status: "published",
      createdById: coach.id,
    },
  });
  await prisma.sessionAssignment.create({ data: { sessionId: session1.id, teamId: equipeA.id } });

  // Alert
  await prisma.alert.create({
    data: {
      athleteId: athletes[0].id, type: "load_spike",
      severity: "warning",
      message: `${athletes[0].firstName} ${athletes[0].lastName} : charge anormalement élevée cette semaine.`,
    },
  });

  console.log("✅ ClubData seeded!");
  console.log("📧 admin@test.com / test1234");
  console.log("📧 coach@test.com / test1234");
  console.log("📧 marie@test.com / test1234");
  console.log("📧 athlete@test.com / test1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });