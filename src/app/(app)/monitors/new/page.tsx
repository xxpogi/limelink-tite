'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Check } from 'lucide-react'

const METHODS = [
  { value: 'GET', label: 'GET - Standard HTTP GET request' },
  { value: 'POST', label: 'POST - HTTP POST with optional body' },
  { value: 'PUT', label: 'PUT - HTTP PUT request' },
  { value: 'DELETE', label: 'DELETE - HTTP DELETE request' },
  { value: 'HEAD', label: 'HEAD - HTTP HEAD (headers only)' },
  { value: 'OPTIONS', label: 'OPTIONS - HTTP OPTIONS' },
  { value: 'PING', label: 'PING - ICMP Ping (for IP addresses)' },
  { value: 'TCP', label: 'TCP - TCP Port Check' },
]

export default function NewMonitorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      url: formData.get('url') as string,
      interval: parseInt(formData.get('interval') as string) || 300,
      method: formData.get('method') as string || 'GET',
      expectedStatus: formData.get('expectedStatus') ? parseInt(formData.get('expectedStatus') as string) : undefined,
    }
    
    try {
      const response = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create monitor')
      }
      
      setSuccess(true)
      
      setTimeout(() => {
        router.push('/monitors')
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Monitor</CardTitle>
          <CardDescription>
            Set up monitoring for your website, API, or server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            
            {success && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-500 text-sm">
                <Check className="h-4 w-4 flex-shrink-0" />
                Monitor created successfully! Redirecting...
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Monitor Name *</Label>
              <Input 
                id="name" 
                name="name"
                placeholder="My Website" 
                required 
                disabled={loading || success}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="url">URL / IP Address / Host *</Label>
              <Input 
                id="url" 
                name="url"
                placeholder="https://example.com or 192.168.1.1" 
                required 
                disabled={loading || success}
              />
              <p className="text-xs text-muted-foreground">
                For HTTP: include https:// | For TCP/PING: use IP or domain
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="method">Method / Protocol</Label>
                <select 
                  id="method" 
                  name="method"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={loading || success}
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="interval">Check Interval</Label>
                <select 
                  id="interval" 
                  name="interval"
                  defaultValue="300"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={loading || success}
                >
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="300">5 minutes</option>
                  <option value="600">10 minutes</option>
                  <option value="1800">30 minutes</option>
                  <option value="3600">1 hour</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedStatus">Expected Status Code (optional)</Label>
              <Input 
                id="expectedStatus" 
                name="expectedStatus"
                type="number"
                placeholder="200" 
                disabled={loading || success}
              />
              <p className="text-xs text-muted-foreground">
                Only for HTTP methods. Leave empty to accept 2xx and 3xx responses.
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || success}>
                {loading ? 'Creating...' : success ? 'Created!' : 'Create Monitor'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
