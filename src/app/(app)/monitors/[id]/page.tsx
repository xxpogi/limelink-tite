'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Pause, Play, Trash2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface Monitor {
  id: string
  name: string
  url: string
  method: string
  interval: number
  status: string
  lastStatus: string | null
  lastCheckedAt: string | null
  uptimePercentage: number | null
  avgResponseTime: number | null
  regions: string[]
  project: {
    name: string
  }
}

interface Check {
  id: string
  region: string
  status: string
  statusCode: number | null
  totalTime: number
  error: string | null
  checkedAt: string
}

function formatRelativeTime(date: string | null): string {
  if (!date) return 'Never'
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function MonitorDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [monitor, setMonitor] = useState<Monitor | null>(null)
  const [checks, setChecks] = useState<Check[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchMonitor()
    fetchChecks()
    const interval = setInterval(() => {
      fetchMonitor()
      fetchChecks()
    }, 30000)
    return () => clearInterval(interval)
  }, [params.id])

  async function fetchMonitor() {
    try {
      const response = await fetch(`/api/monitors/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch monitor')
      const data = await response.json()
      setMonitor(data)
    } catch (err) {
      setError('Failed to load monitor')
    } finally {
      setLoading(false)
    }
  }

  async function fetchChecks() {
    try {
      const response = await fetch(`/api/monitors/${params.id}/checks`)
      if (!response.ok) throw new Error('Failed to fetch checks')
      const data = await response.json()
      setChecks(data)
    } catch (err) {
      console.error('Failed to load checks:', err)
    }
  }

  async function toggleStatus() {
    if (!monitor) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/monitors/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: monitor.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
        }),
      })
      if (!response.ok) throw new Error('Failed to update monitor')
      fetchMonitor()
    } catch (err) {
      setError('Failed to update monitor')
    } finally {
      setActionLoading(false)
    }
  }

  async function deleteMonitor() {
    if (!confirm('Are you sure you want to delete this monitor?')) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/monitors/${params.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete monitor')
      router.push('/monitors')
    } catch (err) {
      setError('Failed to delete monitor')
      setActionLoading(false)
    }
  }

  async function triggerCheck() {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/monitors/${params.id}/check`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to trigger check')
      await fetchMonitor()
      await fetchChecks()
    } catch (err) {
      setError('Failed to trigger check')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !monitor) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error || 'Monitor not found'}</p>
        <Button asChild>
          <Link href="/monitors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Monitors
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/monitors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{monitor.name}</h2>
            <p className="text-muted-foreground">{monitor.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerCheck}
            disabled={actionLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`} />
            Check Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleStatus}
            disabled={actionLoading}
          >
            {monitor.status === 'ACTIVE' ? (
              <><Pause className="mr-2 h-4 w-4" /> Pause</>
            ) : (
              <><Play className="mr-2 h-4 w-4" /> Resume</>
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={deleteMonitor}
            disabled={actionLoading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <StatusIndicator 
                status={(monitor.lastStatus as any) || 'unknown'} 
                size="md" 
              />
              <span className="text-2xl font-bold capitalize">
                {monitor.lastStatus || 'Unknown'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitor.uptimePercentage?.toFixed(2) || '100'}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitor.avgResponseTime || 0}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Checked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {formatRelativeTime(monitor.lastCheckedAt)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Method</p>
              <p className="font-medium">{monitor.method}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Interval</p>
              <p className="font-medium">{monitor.interval / 60} minutes</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Project</p>
              <p className="font-medium">{monitor.project.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Regions</p>
              <p className="font-medium">{monitor.regions.length} regions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Checks</CardTitle>
          <CardDescription>Last 50 checks from all regions</CardDescription>
        </CardHeader>
        <CardContent>
          {checks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No checks yet. Click &quot;Check Now&quot; to start monitoring.
            </div>
          ) : (
            <div className="space-y-2">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <StatusIndicator status={check.status as any} size="sm" />
                    <div>
                      <p className="font-medium">{check.region}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(check.checkedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{check.totalTime}ms</p>
                    {check.statusCode && (
                      <Badge variant="outline" className="text-xs">
                        HTTP {check.statusCode}
                      </Badge>
                    )}
                    {check.error && (
                      <p className="text-xs text-destructive truncate max-w-[200px]">
                        {check.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
