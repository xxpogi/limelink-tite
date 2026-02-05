import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

// Schema for validating monitor updates
const updateMonitorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).optional(),
  interval: z.number().min(30).max(86400).optional(),
  timeout: z.number().min(5).max(120).optional(),
  expectedStatus: z.number().min(100).max(599).optional().nullable(),
  expectedContent: z.string().max(1000).optional().nullable(),
  checkSsl: z.boolean().optional(),
  followRedirects: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'PAUSED']).optional(),
}).strict() // Reject unknown fields

// Helper to verify user has access to monitor
async function verifyMonitorAccess(monitorId: string, userId: string) {
  const monitor = await prisma.monitor.findFirst({
    where: {
      id: monitorId,
      deletedAt: null,
      project: {
        team: {
          members: {
            some: {
              userId: userId
            }
          }
        }
      }
    },
    include: {
      project: { select: { name: true } }
    }
  })

  return monitor
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    const monitor = await verifyMonitorAccess(params.id, session.id)

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    return NextResponse.json(monitor)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch monitor' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    // Verify user has access to this monitor
    const existingMonitor = await verifyMonitorAccess(params.id, session.id)

    if (!existingMonitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    // Parse and validate the request body
    const body = await request.json()
    const validationResult = updateMonitorSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const monitor = await prisma.monitor.update({
      where: { id: params.id },
      data: validationResult.data,
    })

    return NextResponse.json(monitor)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Failed to update monitor:', error)
    return NextResponse.json({ error: 'Failed to update monitor' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    // Verify user has access to this monitor
    const existingMonitor = await verifyMonitorAccess(params.id, session.id)

    if (!existingMonitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    await prisma.monitor.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Failed to delete monitor:', error)
    return NextResponse.json({ error: 'Failed to delete monitor' }, { status: 500 })
  }
}
