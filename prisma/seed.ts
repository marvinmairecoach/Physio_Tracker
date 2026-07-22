import { PrismaClient, Role, Gender } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.alert.deleteMany();
  await prisma.trainingLoad.deleteMany();
  await prisma.testResult.deleteMany();
  await prisma.sessionAssignment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.testType.deleteMany();
  await prisma.athleteTeam.deleteMany();
  await prisma.athlete.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  // Create coaches
  const passwordHash = await bcrypt.hash("test1234", 12);

  const coach1 = await prisma.user.create({
    data: {
      email: "coach@test.com",
      passwordHash,
      firstName: "Coach",
      lastName: "Test",
      role: Role.coach,
      phone: "+33612345678",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@test.com",
      passwordHash,
      firstName: "Admin",
      lastName: "Principal",
      role: Role.admin,
      phone: "+33698765432",
    },
  });

  const coach2 = await prisma.user.create({
    data: {
      email: "marie@test.com",
      passwordHash,
      firstName: "Marie",
      lastName: "Dupont",
      role: Role.coach,
    },
  });

  // Athlete user
  const athleteUser = await prisma.user.create({
    data: {
      email: "athlete@test.com",
      passwordHash,
      firstName: "Thomas",
      lastName: "Joueur",
      role: "athlete",
      phone: "+336****1111",
    },
  });

  // Create teams
  const equipeA = await prisma.team.create({
    data: {
      name: "FC Sénior A",
      sport: "Football",
      category: "Sénior",
      notes: "Équipe première du club",
      createdById: coach1.id,
    },
  });

  const equipeB = await prisma.team.create({
    data: {
      name: "FC U18",
      sport: "Football",
      category: "U18",
      notes: "Équipe des moins de 18 ans",
      createdById: coach1.id,
    },
  });

  // Create athletes
  const athletesData = [
    { firstName: "Lucas", lastName: "Martin", teamId: equipeA.id, gender: Gender.M, position: "Attaquant", jerseyNumber: 9, height: 182, weight: 76 },
    { firstName: "Hugo", lastName: "Bernard", teamId: equipeA.id, gender: Gender.M, position: "Milieu", jerseyNumber: 8, height: 178, weight: 72 },
    { firstName: "Théo", lastName: "Petit", teamId: equipeA.id, gender: Gender.M, position: "Défenseur", jerseyNumber: 4, height: 185, weight: 80 },
    { firstName: "Enzo", lastName: "Robert", teamId: equipeA.id, gender: Gender.M, position: "Gardien", jerseyNumber: 1, height: 190, weight: 85 },
    { firstName: "Nathan", lastName: "Richard", teamId: equipeB.id, gender: Gender.M, position: "Attaquant", jerseyNumber: 11, height: 175, weight: 68 },
    { firstName: "Maxime", lastName: "Simon", teamId: equipeB.id, gender: Gender.M, position: "Milieu", jerseyNumber: 6, height: 177, weight: 70 },
    { firstName: "Jules", lastName: "Laurent", teamId: equipeB.id, gender: Gender.M, position: "Défenseur", jerseyNumber: 5, height: 180, weight: 74 },
    { firstName: "Léo", lastName: "Michel", teamId: equipeB.id, gender: Gender.M, position: "Gardien", jerseyNumber: 16, height: 188, weight: 82 },
    // Individual athletes (no team)
    { firstName: "Clara", lastName: "Dubois", teamId: null, gender: Gender.F, position: null, jerseyNumber: null, height: 168, weight: 60 },
    { firstName: "Sarah", lastName: "Leroy", teamId: null, gender: Gender.F, position: null, jerseyNumber: null, height: 172, weight: 63 },
  ];

  const athletes = [];
  for (const a of athletesData) {
    const athlete = await prisma.athlete.create({
      data: {
        firstName: a.firstName,
        lastName: a.lastName,
        birthDate: new Date(1998 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        phone: `+336${Math.floor(Math.random() * 100000000).toString().padStart(8, "0")}`,
        email: `${a.firstName.toLowerCase()}.${a.lastName.toLowerCase()}@email.com`,
        gender: a.gender,
        heightCm: a.height,
        weightKg: a.weight,
        createdById: coach1.id,
      },
    });
    athletes.push(athlete);

    if (a.teamId) {
      await prisma.athleteTeam.create({
        data: {
          athleteId: athlete.id,
          teamId: a.teamId,
          jerseyNumber: a.jerseyNumber,
          position: a.position,
          joinedAt: new Date("2024-08-01"),
        },
      });
    }
  }

  // Create test types
  const testTypesData = [
    { name: "Sprint 10m", category: "field", unit: "secondes", higherIsBetter: false },
    { name: "Sprint 30m", category: "field", unit: "secondes", higherIsBetter: false },
    { name: "Détente Verticale", category: "field", unit: "cm", higherIsBetter: true },
    { name: "Saut en Longueur", category: "field", unit: "cm", higherIsBetter: true },
    { name: "Beep Test", category: "field", unit: "niveaux", higherIsBetter: true },
    { name: "Force Ischio-Jambiers", category: "dynamometer", unit: "N", higherIsBetter: true },
    { name: "Pic de Puissance", category: "force_plate", unit: "W/kg", higherIsBetter: true },
    { name: "Taille (cm)", category: "anthropometric", unit: "cm", higherIsBetter: false, isSystem: true },
    { name: "Poids (kg)", category: "anthropometric", unit: "kg", higherIsBetter: false, isSystem: true },
  ];

  const testTypes = [];
  for (const t of testTypesData) {
    const testType = await prisma.testType.create({ data: t });
    testTypes.push(testType);
  }

  // Create test results (multiple dates for progression)
  const now = new Date();
  for (let monthOffset = 3; monthOffset >= 0; monthOffset--) {
    for (const athlete of athletes.slice(0, 6)) { // First 6 athletes have results
      for (const testType of testTypes) {
        if (Math.random() > 0.3) { // 70% chance of having a result
          const baseValue = testType.name === "Sprint 10m" ? 1.7 + Math.random() * 0.3 :
                           testType.name === "Sprint 30m" ? 4.2 + Math.random() * 0.5 :
                           testType.name === "Détente Verticale" ? 40 + Math.random() * 20 :
                           testType.name === "Saut en Longueur" ? 200 + Math.random() * 60 :
                           testType.name === "Beep Test" ? 10 + Math.random() * 6 :
                           testType.name === "Force Ischio-Jambiers" ? 200 + Math.random() * 100 :
                           testType.name === "Pic de Puissance" ? 40 + Math.random() * 20 : 50;

          await prisma.testResult.create({
            data: {
              athleteId: athlete.id,
              testTypeId: testType.id,
              value: Math.round(baseValue * 100) / 100,
              date: new Date(now.getFullYear(), now.getMonth() - monthOffset, Math.floor(Math.random() * 20) + 1),
              recordedById: coach1.id,
            },
          });
        }
      }
    }
  }

  // Create training loads
  for (const athlete of athletes.slice(0, 6)) {
    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      if (Math.random() > 0.4) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
        if (date.getDay() !== 0) { // Skip Sundays
          const rpe = Math.floor(Math.random() * 5) + 4; // RPE 4-8
          const duration = [45, 60, 75, 90, 120][Math.floor(Math.random() * 5)];
          await prisma.trainingLoad.create({
            data: {
              athleteId: athlete.id,
              date,
              rpe,
              durationMin: duration,
              sessionType: Math.random() > 0.2 ? "training" : "match",
              recordedById: coach1.id,
            },
          });
        }
      }
    }
  }

  // Create alerts
  for (const athlete of athletes.slice(0, 3)) {
    await prisma.alert.create({
      data: {
        athleteId: athlete.id,
        type: "load_spike",
        severity: "warning",
        message: `${athlete.firstName} ${athlete.lastName} : charge d'entraînement anormalement élevée cette semaine.`,
      },
    });
  }

  await prisma.alert.create({
    data: {
      athleteId: athletes[0].id,
      type: "injury_risk",
      severity: "critical",
      message: `${athletes[0].firstName} ${athletes[0].lastName} : risque de blessure détecté (baisse de performance + charge élevée).`,
    },
  });

  // Create sessions
  const session1 = await prisma.session.create({
    data: {
      title: "Séance de VMA",
      description: "<h3>Objectif</h3><p>Travail de la Vitesse Maximale Aérobie</p><h3>Échauffement</h3><ul><li>10 min footing léger</li><li>5 min gammes</li></ul><h3>Principal</h3><ul><li>8 x 400m à 105% VMA (récup 1min30)</li><li>4 x 200m à 110% VMA (récup 1min)</li></ul><h3>Retour au calme</h3><p>10 min footing + étirements</p>",
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      startTime: new Date(2024, 0, 1, 10, 0),
      endTime: new Date(2024, 0, 1, 11, 30),
      location: "Stade Municipal",
      type: "TRAINING",
      status: "published",
      createdById: coach1.id,
    },
  });

  await prisma.sessionAssignment.create({
    data: { sessionId: session1.id, teamId: equipeA.id },
  });

  const session2 = await prisma.session.create({
    data: {
      title: "Séance en individuel : travail de vitesse",
      description: "<p><strong>Exercices de sprint</strong> avec chronométrage</p>",
      type: "TRAINING",
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2),
      startTime: new Date(2024, 0, 1, 14, 0),
      endTime: new Date(2024, 0, 1, 15, 0),
      status: "draft",
      createdById: coach1.id,
    },
  });

  await prisma.sessionAssignment.create({
    data: { sessionId: session2.id, athleteId: athletes[athletes.length - 1].id }, // Assign to last athlete (individual)
  });

  console.log("✅ Seed completed!");
  console.log("📧 Comptes de test :");
  console.log("   coach@test.com / test1234");
  console.log("   admin@test.com / test1234");
  console.log("   marie@test.com / test1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });