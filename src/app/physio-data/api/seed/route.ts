import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/physio-client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Force re-seed: drop existing data and recreate
    await prisma.testResult.deleteMany({});
    await prisma.bilan.deleteMany({});
    await prisma.planningEntry.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.conversationParticipant.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.testType.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.athlete.deleteMany({});
    await prisma.user.deleteMany({});

    const passwordHash = await bcrypt.hash("test1234", 12);

    // Users
    const admin = await prisma.user.create({
      data: { email: "admin@test.com", passwordHash, firstName: "Admin", lastName: "Principal", role: "admin" },
    });

    const coach = await prisma.user.create({
      data: { email: "coach@test.com", passwordHash, firstName: "Coach", lastName: "Individuel", role: "coach" },
    });

    // Athletes with linked user accounts
    const athletesData = [
      { firstName: "Clara", lastName: "Dubois", gender: "F" as const, height: 168, weight: 60 },
      { firstName: "Sarah", lastName: "Leroy", gender: "F" as const, height: 172, weight: 63 },
      { firstName: "Lucas", lastName: "Moreau", gender: "M" as const, height: 182, weight: 76 },
      { firstName: "Emma", lastName: "Petit", gender: "F" as const, height: 165, weight: 55 },
    ];

    const athletes = [];
    for (const a of athletesData) {
      const athleteEmail = `${a.firstName.toLowerCase()}.${a.lastName.toLowerCase()}@test.com`;

      const athleteUser = await prisma.user.create({
        data: {
          email: athleteEmail,
          passwordHash,
          firstName: a.firstName,
          lastName: a.lastName,
          role: "athlete",
        },
      });

      const athlete = await prisma.athlete.create({
        data: {
          firstName: a.firstName,
          lastName: a.lastName,
          birthDate: new Date("1998-06-15"),
          gender: a.gender,
          heightCm: a.height,
          weightKg: a.weight,
          createdById: coach.id,
          userId: athleteUser.id,
        },
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
              athleteId: athlete.id,
              testTypeId: testType.id,
              value: Math.round(baseValue * 100) / 100,
              date: new Date(now.getFullYear(), now.getMonth() - monthOffset, Math.floor(Math.random() * 20) + 1),
              recordedById: coach.id,
            },
          });
        }
      }
    }

    // ── Seed bilan modules ──
    const modulesData = [
      { title: "Bilan douleur", tags: ["douleur", "épaule", "genou"], questions: [
        { id: "q1", type: "single_choice", label: "Localisation de la douleur", options: "Épaule, Genou, Cheville, Dos, Coude, Poignet, Hanche" },
        { id: "q2", type: "single_choice", label: "Type de douleur", options: "Aiguë, Chronique, Diffuse, Ponctuelle" },
        { id: "q3", type: "text", label: "Intensité de la douleur (0-10)", options: "" },
      ]},
      { title: "Anamnèse blessure", tags: ["blessure", "historique"], questions: [
        { id: "q4", type: "text", label: "Date estimée de la blessure", options: "" },
        { id: "q5", type: "text", label: "Mécanisme de la blessure", options: "" },
        { id: "q6", type: "multiple_choice", label: "Traitements suivis", options: "Repos, Kinésithérapie, Anti-inflammatoires, Chirurgie, Aucun" },
      ]},
      { title: "Bilan fonctionnel", tags: ["fonctionnel", "mobilité"], questions: [
        { id: "q7", type: "ratio_gd", label: "Ratio force quadriceps G/D", options: "" },
        { id: "q8", type: "ratio_gd", label: "Ratio force ischio-jambiers G/D", options: "" },
        { id: "q9", type: "text", label: "Amplitude articulaire (/10)", options: "" },
      ]},
      { title: "Questionnaire bien-être", tags: ["bien-être", "récupération"], questions: [
        { id: "q10", type: "text", label: "Qualité du sommeil (1-10)", options: "" },
        { id: "q11", type: "text", label: "Niveau d'énergie (1-10)", options: "" },
        { id: "q12", type: "single_choice", label: "Courbatures", options: "Aucunes, Légères, Modérées, Importantes" },
      ]},
      { title: "Bilan pré-saison", tags: ["pré-saison", "évaluation"], questions: [
        { id: "q13", type: "text", label: "Objectifs de la saison", options: "" },
        { id: "q14", type: "multiple_choice", label: "Antécédents médicaux", options: "Aucun, Blessure musculaire, Entorse, Fracture, Tendinite, Opération" },
        { id: "q15", type: "text", label: "Niveau de préparation perçu (1-10)", options: "" },
      ]},
    ]

    for (const mod of modulesData) {
      await prisma.bilanModule.create({ data: mod })
    }

    await prisma.$disconnect();

    return NextResponse.json({
      message: "PhysioData re-seeded!",
      users: 6,
      athletes: athletes.length,
      testTypes: testTypes.length,
      modules: modulesData.length,
    });
  } catch (error) {
    console.error("Seed error:", error);
    await prisma.$disconnect();
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}