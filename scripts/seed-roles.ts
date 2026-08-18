import { prisma } from "../src/lib/prisma";

const ROLE_MAP: Record<string, string> = {
  administrateur: "Administrateur",
  admin: "Administrateur",
  coach: "Coach",
  athlete: "Athlète",
} as const;

const DEFAULT_ROLES = [
  "Administrateur",
  "Coach",
  "Athlète",
  "Secrétaire",
  "Trésorier",
  "Président",
];

async function main() {
  console.log("🌱 Début du seed des rôles...\n");

  // 1. Create default roles
  console.log("📦 Création des rôles par défaut...");
  const createdRoles: Record<string, string> = {};

  for (const roleName of DEFAULT_ROLES) {
    const role = await prisma.userRole.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    createdRoles[roleName.toLowerCase()] = role.id;
    console.log(`   ✅ Rôle créé : ${roleName} (${role.id})`);
  }
  console.log("");

  // 2. Auto-assign roles to existing users based on their `role` enum
  console.log("👥 Attribution des rôles aux utilisateurs existants...");
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });

  let assignedCount = 0;

  for (const user of users) {
    const mappedRoleName = ROLE_MAP[user.role];
    if (!mappedRoleName) {
      console.log(`   ⚠️  Utilisateur ${user.email} : rôle '${user.role}' non reconnu, ignoré`);
      continue;
    }

    const roleId = createdRoles[mappedRoleName.toLowerCase()];
    if (!roleId) {
      console.log(`   ⚠️  Utilisateur ${user.email} : rôle cible '${mappedRoleName}' introuvable, ignoré`);
      continue;
    }

    // Check if already assigned
    const existing = await prisma.userRoleAssignment.findUnique({
      where: {
        userId_roleId: { userId: user.id, roleId },
      },
    });

    if (!existing) {
      await prisma.userRoleAssignment.create({
        data: { userId: user.id, roleId },
      });
      assignedCount++;
      console.log(`   ✅ ${user.email} → ${mappedRoleName}`);
    } else {
      console.log(`   ➡️  ${user.email} → déjà assigné à ${mappedRoleName}`);
    }
  }

  console.log(`\n🎉 Seed terminé ! ${assignedCount} nouvelles assignations créées.`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });