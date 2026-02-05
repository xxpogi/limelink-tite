import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Helper to exclude soft-deleted records
export const withSoftDelete = {
  deletedAt: null,
}

// Helper for pagination
export const paginate = (page: number = 1, pageSize: number = 20) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
})
