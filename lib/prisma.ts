import { PrismaClient } from '@prisma/client';

// This ensures we only have one instance of Prisma Client
// in development with Next.js hot-reloading.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;