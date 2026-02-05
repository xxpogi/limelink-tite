import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { MonitorMethod, MonitorType } from '@prisma/client'

// GET /api/monitors - List all monitors for current user
export async function GET() {
  try {
    const session = await requireAuth()
    
    const monitors = await prisma.monitor.findMany({
      where: { 
        deletedAt: null,
        project: {
          team: {
            members: {
              some: {
                userId: session.id
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: { name: true, id: true }
        }
      }
    })
    
    return NextResponse.json(monitors)
  } catch (error) {
    console.error('Failed to fetch monitors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch monitors' },
      { status: 500 }
    )
  }
}

// POST /api/monitors - Create a new monitor
export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    const { name, url, interval, method, projectId } = await request.json()
    
    // Validate required fields
    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      )
    }
    
    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }
    
    // Get user's team/project if not provided
    let targetProjectId = projectId
    if (!targetProjectId) {
      const teamMember = await prisma.teamMember.findFirst({
        where: { userId: session.id },
        include: {
          team: {
            include: {
              projects: {
                take: 1,
                select: { id: true }
              }
            }
          }
        }
      })
      
      if (!teamMember || teamMember.team.projects.length === 0) {
        // Create default project
        const project = await prisma.project.create({
          data: {
            name: 'Default Project',
            slug: 'default',
            teamId: teamMember?.teamId || (await createDefaultTeam(session.id)),
          }
        })
        targetProjectId = project.id
      } else {
        targetProjectId = teamMember.team.projects[0].id
      }
    }
    
    // Map method to proper type and method values
    let monitorType: MonitorType
    let monitorMethod: MonitorMethod
    const methodInput = String(method || 'GET').toUpperCase()
    
    if (methodInput === 'PING') {
      monitorType = MonitorType.ICMP
      monitorMethod = MonitorMethod.GET
    } else if (methodInput === 'TCP') {
      monitorType = MonitorType.TCP
      monitorMethod = MonitorMethod.GET
    } else {
      // HTTP methods
      monitorType = url.startsWith('https://') ? MonitorType.HTTPS : MonitorType.HTTP
      const allowedMethods: MonitorMethod[] = [
        MonitorMethod.GET,
        MonitorMethod.POST,
        MonitorMethod.PUT,
        MonitorMethod.DELETE,
        MonitorMethod.PATCH,
        MonitorMethod.HEAD,
        MonitorMethod.OPTIONS,
      ]
      monitorMethod = allowedMethods.includes(methodInput as MonitorMethod)
        ? (methodInput as MonitorMethod)
        : MonitorMethod.GET
    }
    
    // Create the monitor
    const monitor = await prisma.monitor.create({
      data: {
        name,
        url,
        type: monitorType,
        interval: interval || 300,
        method: monitorMethod,
        projectId: targetProjectId,
        status: 'ACTIVE',
      }
    })
    
    return NextResponse.json(monitor, { status: 201 })
  } catch (error) {
    console.error('Failed to create monitor:', error)
    return NextResponse.json(
      { error: 'Failed to create monitor' },
      { status: 500 }
    )
  }
}

async function createDefaultTeam(userId: string) {
  const team = await prisma.team.create({
    data: {
      name: 'My Team',
      slug: `team-${userId.slice(0, 8)}`,
      ownerId: userId,
    }
  })
  
  await prisma.teamMember.create({
    data: {
      teamId: team.id,
      userId: userId,
      role: 'OWNER',
    }
  })
  
  return team.id
}
