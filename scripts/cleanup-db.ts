// Script to clean database: delete all data except User records
// Run: npx tsx scripts/cleanup-db.ts
// Or: npx prisma db push and then this script via Railway Shell

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Nettoyage de la base de données...");
  console.log("   (Les utilisateurs sont conservés)\n");

  // Order matters — delete child tables first, then parent tables
  const deletions = [
    { name: "Documents", model: prisma.athleteDocument.deleteMany() },
    { name: "Invitations athlète", model: prisma.athleteUserInvitation.deleteMany() },
    { name: "Bilans", model: prisma.bilan.deleteMany() },
    { name: "Résultats de tests", model: prisma.testResult.deleteMany() },
    { name: "Charges d'entraînement", model: prisma.trainingLoad.deleteMany() },
    { name: "Alertes", model: prisma.alert.deleteMany() },
    { name: "Invitations sessions", model: prisma.sessionInvitation.deleteMany() },
    { name: "Exercices sessions", model: prisma.sessionExercise.deleteMany() },
    { name: "Assignations sessions", model: prisma.sessionAssignment.deleteMany() },
    { name: "Blessures", model: prisma.injury.deleteMany() },
    { name: "Athlètes équipes", model: prisma.athleteTeam.deleteMany() },
    { name: "Sessions", model: prisma.session.deleteMany() },
    { name: "Exercices", model: prisma.exercise.deleteMany() },
    { name: "Coach d'équipes", model: prisma.teamCoach.deleteMany() },
    { name: "Équipes", model: prisma.team.deleteMany() },
    { name: "Athlètes", model: prisma.athlete.deleteMany() },
    { name: "Types de test", model: prisma.testType.deleteMany() },
    { name: "Catégories", model: prisma.category.deleteMany() },
  ];

  for (const { name, model } of deletions) {
    try {
      const result = await model;
      console.log(`  ✅ ${name} — ${result.count} supprimé(s)`);
    } catch (err) {
      console.error(`  ❌ ${name} — Erreur:`, err);
    }
  }

  console.log("\n✨ Nettoyage terminé !");
  console.log("   Les utilisateurs sont conservés.");
  console.log("   Tu peux maintenant recréer des équipes, athlètes, etc.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());