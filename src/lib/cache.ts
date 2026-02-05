// Cache utilities for performance optimization

import { cache as reactCache } from 'react'

// React cache for deduplicating requests in same render
export const dedupe = reactCache

/**
 * Generate cache key from arguments
 */
export function generateCacheKey(prefix: string, args: Record<string, unknown>): string {
  return `${prefix}:${JSON.stringify(args)}`
}
