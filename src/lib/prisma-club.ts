import { PrismaClient } from "@prisma/club-client";

const globalForClub = globalThis as unknown as {
  clubPrisma: PrismaClient | undefined;
};

export const clubPrisma = globalForClub.clubPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production")
  globalForClub.clubPrisma = clubPrisma;