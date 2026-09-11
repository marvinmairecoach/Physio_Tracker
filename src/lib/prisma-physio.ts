import { PrismaClient } from "@prisma/physio-client";

const globalForPhysio = globalThis as unknown as {
  physioPrisma: PrismaClient | undefined;
};

export const physioPrisma = globalForPhysio.physioPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production")
  globalForPhysio.physioPrisma = physioPrisma;