// Edge Function for performing health checks
// This runs on Vercel Edge Network for global check execution

import { NextRequest, NextResponse } from 'next/server'
import { executeCheck } from '@/services/monitoring'

export const runtime = 'edge'
export const preferredRegion = ['iad1', 'lhr1', 'sin1']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      monitorId,
      url,
      method = 'GET',
      headers,
      body: requestBody,
      timeout = 30,
      expectedStatus,
      expectedContent,
      followRedirects = true,
      checkSsl = true,
    } = body

    // Get the current region from the request
    const region = request.geo?.region || 'unknown'
    const city = request.geo?.city || 'unknown'

    // Execute the check
    const result = await executeCheck(
      {
        url,
        method,
        headers,
        body: requestBody,
        timeout,
        expectedStatus,
        expectedContent,
        followRedirects,
        checkSsl,
      },
      `${region}-${city}`
    )

    // Add monitor ID to result
    result.monitorId = monitorId

    return NextResponse.json({
      success: true,
      result,
      region: {
        code: region,
        city,
      },
    })
  } catch (error) {
    console.error('Check execution error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
