'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Bell, Plus, Search, User, LogOut } from 'lucide-react'
import { useState, useMemo } from 'react'

// Map routes to their display titles
const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/monitors': 'Monitors',
  '/monitors/new': 'New Monitor',
  '/incidents': 'Incidents',
  '/alerts': 'Alerts',
  '/analytics': 'Analytics',
  '/team': 'Team',
  '/settings': 'Settings',
}

// Get title based on pathname, with support for dynamic routes
function getPageTitle(pathname: string): string {
  // Check exact match first
  if (routeTitles[pathname]) {
    return routeTitles[pathname]
  }

  // Check for dynamic monitor detail route
  if (pathname.match(/^\/monitors\/[^\/]+$/)) {
    return 'Monitor Details'
  }

  // Check for parent route match
  const parentPath = pathname.split('/').slice(0, 2).join('/')
  if (routeTitles[parentPath]) {
    return routeTitles[parentPath]
  }

  return 'LimeLink'
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth/login')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setLoggingOut(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Could navigate to search results page
      console.log('Search:', searchQuery)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      {/* Spacer for mobile menu button */}
      <div className="w-10 lg:hidden" aria-hidden="true" />

      {/* Breadcrumb / Title */}
      <div className="flex flex-1 items-center gap-4">
        <h1 className="text-lg font-semibold">{pageTitle}</h1>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2">
        <div className="relative">
          <label htmlFor="global-search" className="sr-only">
            Search monitors and incidents
          </label>
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            id="global-search"
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-describedby="search-hint"
          />
          <span id="search-hint" className="sr-only">
            Search for monitors, incidents, or team members
          </span>
        </div>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="hidden sm:flex gap-2" asChild>
          <Link href="/monitors/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New Monitor</span>
          </Link>
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="View notifications"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-status-down" aria-hidden="true" />
          <span className="sr-only">You have new notifications</span>
        </Button>

        {/* User Menu */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="User menu"
        >
          <User className="h-5 w-5" aria-hidden="true" />
        </Button>

        {/* Logout */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label={loggingOut ? 'Signing out...' : 'Sign out'}
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
    </header>
  )
}
