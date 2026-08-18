// Migration: Create User accounts for all Athletes without one
// Run: npx tsx scripts/migrate-athletes-to-users.ts

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("🔄 Migration : Création de comptes Utilisateur pour les athlètes...\n");

  // Find all athletes without a linked user account
  const athletes = await prisma.athlete.findMany({
    where: { userId: null },
    include: {
      teams: {
        where: { isActive: true },
        include: { team: true },
      },
    },
  });

  console.log(`📊 ${athletes.length} athlète(s) sans compte utilisateur trouvé(s)\n`);

  if (athletes.length === 0) {
    console.log("✅ Tous les athlètes ont déjà un compte utilisateur !");
    return;
  }

  // Find or create the "Athlète" role
  let athleteRole = await prisma.userRole.findUnique({ where: { name: "Athlète" } });
  if (!athleteRole) {
    athleteRole = await prisma.userRole.create({ data: { name: "Athlète" } });
    console.log("  ✅ Rôle 'Athlète' créé\n");
  }

  let created = 0;
  let skipped = 0;

  for (const athlete of athletes) {
    const email = athlete.email || `athlete-${athlete.id.slice(0, 8)}@placeholder.pp`;
    const defaultPassword = "changeme123";

    try {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        // Just link the existing user to this athlete
        await prisma.athlete.update({
          where: { id: athlete.id },
          data: { userId: existingUser.id },
        });
        
        // Ensure Athlète role assignment
        const existingAssignment = await prisma.userRoleAssignment.findUnique({
          where: { userId_roleId: { userId: existingUser.id, roleId: athleteRole!.id } },
        });
        if (!existingAssignment) {
          await prisma.userRoleAssignment.create({
            data: { userId: existingUser.id, roleId: athleteRole!.id },
          });
        }
        
        console.log(`  🔗 ${athlete.firstName} ${athlete.lastName} — lié à l'utilisateur existant ${email}`);
        skipped++;
        continue;
      }

      const passwordHash = await hashPassword(defaultPassword);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName: athlete.firstName,
          lastName: athlete.lastName,
          phone: athlete.phone || null,
          role: "athlete",
          isActive: true,
        },
      });

      // Link athlete to user
      await prisma.athlete.update({
        where: { id: athlete.id },
        data: { userId: user.id },
      });

      // Assign "Athlète" role
      await prisma.userRoleAssignment.create({
        data: { userId: user.id, roleId: athleteRole!.id },
      });

      const teamInfo = athlete.teams?.length > 0 ? ` (${athlete.teams.map(t => t.team.name).join(", ")})` : "";
      console.log(`  ✅ ${athlete.firstName} ${athlete.lastName}${teamInfo} — ${email} / mot de passe: ${defaultPassword}`);
      created++;
    } catch (err) {
      console.error(`  ❌ ${athlete.firstName} ${athlete.lastName} — Erreur:`, err);
    }
  }

  console.log(`\n📊 Résumé : ${created} compte(s) créé(s), ${skipped} lié(s) à un utilisateur existant`);
  console.log("ℹ️  Mot de passe par défaut pour les nouveaux comptes : changeme123");
  console.log("   Les athlètes pourront le changer lors de leur première connexion.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());