import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    const checks = await prisma.monitorCheck.findMany({
      where: { monitorId: params.id },
      orderBy: { checkedAt: 'desc' },
      take: 50,
    })
    
    return NextResponse.json(checks)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch checks' }, { status: 500 })
  }
}
