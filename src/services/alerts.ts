// Alerting service - handles notifications to various channels
import { prisma } from '@/lib/prisma'
import { AlertPayload, AlertChannelType } from '@/types'
import crypto from 'crypto'

/**
 * Sign webhook payload for verification
 */
function signWebhookPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Send webhook alert
 */
async function sendWebhook(
  url: string,
  payload: AlertPayload,
  secret?: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const body = JSON.stringify(payload, null, 2)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'LimeLink-Webhook/1.0',
      'X-LimeLink-Event': payload.event,
      'X-LimeLink-Timestamp': Date.now().toString(),
    }

    if (secret) {
      headers['X-LimeLink-Signature'] = signWebhookPayload(body, secret)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    })

    return {
      success: response.ok,
      statusCode: response.status,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send Discord webhook
 */
async function sendDiscord(
  webhookUrl: string,
  payload: AlertPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const colorMap: Record<string, number> = {
    up: 0x10b981,      // green
    down: 0xef4444,    // red
    degraded: 0xf59e0b, // yellow
    paused: 0x6b7280,  // gray
  }

  const emojiMap: Record<string, string> = {
    MONITOR_DOWN: '🔴',
    MONITOR_UP: '🟢',
    MONITOR_DEGRADED: '🟡',
    INCIDENT_CREATED: '🚨',
    INCIDENT_RESOLVED: '✅',
    ANOMALY_DETECTED: '⚠️',
    DDOS_SUSPECTED: '🔥',
    SLO_BREACH: '📉',
    SSL_EXPIRING: '🔒',
  }

  const embed = {
    title: `${emojiMap[payload.event] || '🔔'} ${payload.monitor.name}`,
    description: `**${payload.event.replace(/_/g, ' ')}** detected for ${payload.monitor.url}`,
    color: colorMap[payload.monitor.status] || 0x6b7280,
    timestamp: payload.timestamp.toISOString(),
    fields: [] as Array<{ name: string; value: string; inline?: boolean }>,
    footer: {
      text: 'LimeLink Monitoring',
    },
  }

  // Add monitor details
  embed.fields.push(
    { name: 'Status', value: payload.monitor.status.toUpperCase(), inline: true },
    { name: 'URL', value: payload.monitor.url, inline: true }
  )

  // Add incident details if present
  if (payload.incident) {
    embed.fields.push(
      { name: 'Incident', value: payload.incident.title, inline: false },
      { name: 'Severity', value: payload.incident.severity, inline: true },
      { name: 'Regions', value: payload.incident.affectedRegions.join(', '), inline: true }
    )
  }

  // Add additional details
  if (payload.details) {
    for (const [key, value] of Object.entries(payload.details)) {
      if (typeof value === 'string' || typeof value === 'number') {
        embed.fields.push({
          name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: String(value),
          inline: true,
        })
      }
    }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })

    return {
      success: response.ok,
      statusCode: response.status,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send Slack webhook
 */
async function sendSlack(
  webhookUrl: string,
  payload: AlertPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const emojiMap: Record<string, string> = {
    up: ':white_check_mark:',
    down: ':x:',
    degraded: ':warning:',
    paused: ':pause_button:',
  }

  const colorMap: Record<string, string> = {
    up: '#10b981',
    down: '#ef4444',
    degraded: '#f59e0b',
    paused: '#6b7280',
  }

  const blocks: Array<{
    type: string
    text?: { type: string; text: string }
    fields?: Array<{ type: string; text: string }>
  }> = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emojiMap[payload.monitor.status]} ${payload.monitor.name} - ${payload.event.replace(/_/g, ' ')}`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Status:*\n${payload.monitor.status.toUpperCase()}`,
        },
        {
          type: 'mrkdwn',
          text: `*URL:*\n${payload.monitor.url}`,
        },
      ],
    },
  ]

  // Add incident details
  if (payload.incident) {
    blocks.push(
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Incident:* ${payload.incident.title}\n*Severity:* ${payload.incident.severity}\n*Regions:* ${payload.incident.affectedRegions.join(', ')}`,
        },
      }
    )
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks,
        attachments: [
          {
            color: colorMap[payload.monitor.status],
            footer: 'LimeLink Monitoring',
            ts: Math.floor(payload.timestamp.getTime() / 1000),
          },
        ],
      }),
    })

    return {
      success: response.ok,
      statusCode: response.status,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send email alert (placeholder - would integrate with email service)
 */
async function sendEmail(
  addresses: string[],
  payload: AlertPayload
): Promise<{ success: boolean; error?: string }> {
  // In production, this would integrate with SendGrid, AWS SES, etc.
  console.log(`[Email Alert] Would send to ${addresses.join(', ')}:`, payload)
  return { success: true }
}

/**
 * Dispatch alert to configured channels
 */
export async function dispatchAlert(
  projectId: string,
  payload: AlertPayload
): Promise<Array<{ channelId: string; success: boolean; error?: string }>> {
  // Get active alert configs for this project
  const configs = await prisma.alertConfig.findMany({
    where: {
      projectId,
      isActive: true,
      deletedAt: null,
      events: {
        has: payload.event,
      },
    },
  })

  const results: Array<{ channelId: string; success: boolean; error?: string }> = []

  for (const config of configs) {
    // Check monitor filter
    if (config.monitorIds.length > 0 && !config.monitorIds.includes(payload.monitor.id)) {
      continue
    }

    // Check severity filter
    if (config.severityFilter.length > 0 && payload.incident) {
      if (!config.severityFilter.includes(payload.incident.severity as any)) {
        continue
      }
    }

    // Check cooldown
    const recentAlert = await prisma.alertHistory.findFirst({
      where: {
        alertConfigId: config.id,
        eventType: payload.event,
        monitorId: payload.monitor.id,
        createdAt: {
          gte: new Date(Date.now() - config.cooldownMinutes * 60 * 1000),
        },
      },
    })

    if (recentAlert) {
      results.push({
        channelId: config.id,
        success: false,
        error: 'Cooldown period active',
      })
      continue
    }

    // Build alert payload
    let dispatchResult: { success: boolean; error?: string }

    switch (config.channelType) {
      case 'WEBHOOK':
        if (config.webhookUrl) {
          const result = await sendWebhook(config.webhookUrl, payload, config.webhookSecret || undefined)
          dispatchResult = {
            success: result.success,
            error: result.error,
          }
        } else {
          dispatchResult = { success: false, error: 'No webhook URL configured' }
        }
        break

      case 'DISCORD':
        if (config.discordWebhookUrl) {
          const result = await sendDiscord(config.discordWebhookUrl, payload)
          dispatchResult = {
            success: result.success,
            error: result.error,
          }
        } else {
          dispatchResult = { success: false, error: 'No Discord webhook URL configured' }
        }
        break

      case 'SLACK':
        if (config.slackWebhookUrl) {
          const result = await sendSlack(config.slackWebhookUrl, payload)
          dispatchResult = {
            success: result.success,
            error: result.error,
          }
        } else {
          dispatchResult = { success: false, error: 'No Slack webhook URL configured' }
        }
        break

      case 'EMAIL':
        if (config.emailAddresses.length > 0) {
          dispatchResult = await sendEmail(config.emailAddresses, payload)
        } else {
          dispatchResult = { success: false, error: 'No email addresses configured' }
        }
        break

      default:
        dispatchResult = { success: false, error: 'Unknown channel type' }
    }

    // Log alert history
    await prisma.alertHistory.create({
      data: {
        alertConfigId: config.id,
        eventType: payload.event,
        monitorId: payload.monitor.id,
        status: dispatchResult.success ? 'sent' : 'failed',
        payload: payload as any,
        errorMessage: dispatchResult.error,
        sentAt: dispatchResult.success ? new Date() : null,
      },
    })

    results.push({
      channelId: config.id,
      success: dispatchResult.success,
      error: dispatchResult.error,
    })
  }

  return results
}

/**
 * Retry failed alerts
 */
export async function retryFailedAlerts(): Promise<void> {
  const failedAlerts = await prisma.alertHistory.findMany({
    where: {
      status: 'failed',
      attemptCount: {
        lt: 3,
      },
      nextRetryAt: {
        lte: new Date(),
      },
    },
    include: {
      alertConfig: true,
    },
  })

  for (const alert of failedAlerts) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = alert.payload as any
    
    // Calculate next retry time (exponential backoff)
    const nextAttempt = alert.attemptCount + 1
    const delayMs = Math.min(1000 * Math.pow(2, nextAttempt), 30000) // Max 30s

    let result: { success: boolean; error?: string }

    switch (alert.alertConfig.channelType) {
      case 'WEBHOOK':
        if (alert.alertConfig.webhookUrl) {
          const r = await sendWebhook(alert.alertConfig.webhookUrl, payload as AlertPayload, alert.alertConfig.webhookSecret || undefined)
          result = { success: r.success, error: r.error }
        } else {
          result = { success: false, error: 'No webhook URL' }
        }
        break

      case 'DISCORD':
        if (alert.alertConfig.discordWebhookUrl) {
          const r = await sendDiscord(alert.alertConfig.discordWebhookUrl, payload as AlertPayload)
          result = { success: r.success, error: r.error }
        } else {
          result = { success: false, error: 'No Discord URL' }
        }
        break

      case 'SLACK':
        if (alert.alertConfig.slackWebhookUrl) {
          const r = await sendSlack(alert.alertConfig.slackWebhookUrl, payload as AlertPayload)
          result = { success: r.success, error: r.error }
        } else {
          result = { success: false, error: 'No Slack URL' }
        }
        break

      default:
        result = { success: false, error: 'Unsupported channel type' }
    }

    // Update alert history
    await prisma.alertHistory.update({
      where: { id: alert.id },
      data: {
        status: result.success ? 'sent' : 'failed',
        attemptCount: nextAttempt,
        nextRetryAt: result.success ? null : new Date(Date.now() + delayMs),
        errorMessage: result.error,
        sentAt: result.success ? new Date() : null,
      },
    })
  }
}
