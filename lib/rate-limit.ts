import { prisma } from './db'
import { RateLimitStatus } from '@/types'

const MAX_REQUESTS_PER_SESSION = parseInt(process.env.MAX_REQUESTS_PER_SESSION || '20', 10)
const MAX_TOKENS_PER_SESSION = parseInt(process.env.MAX_TOKENS_PER_SESSION || '10000', 10)
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000', 10) // 1 hour default

export class RateLimitService {
  async checkRateLimit(sessionId: string): Promise<RateLimitStatus> {
    const now = new Date()
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS)

    // Get or create rate limit record
    let rateLimit = await prisma.rateLimit.findUnique({
      where: { sessionId },
    })

    // If no record or window has expired, reset
    if (!rateLimit || rateLimit.windowStart < windowStart) {
      rateLimit = await prisma.rateLimit.upsert({
        where: { sessionId },
        update: {
          requestCount: 0,
          tokenCount: 0,
          windowStart: now,
        },
        create: {
          sessionId,
          requestCount: 0,
          tokenCount: 0,
          windowStart: now,
        },
      })
    }

    const allowed =
      rateLimit.requestCount < MAX_REQUESTS_PER_SESSION &&
      rateLimit.tokenCount < MAX_TOKENS_PER_SESSION

    const resetAt = new Date(rateLimit.windowStart.getTime() + RATE_LIMIT_WINDOW_MS)

    return {
      allowed,
      requestCount: rateLimit.requestCount,
      tokenCount: rateLimit.tokenCount,
      remainingRequests: Math.max(0, MAX_REQUESTS_PER_SESSION - rateLimit.requestCount),
      remainingTokens: Math.max(0, MAX_TOKENS_PER_SESSION - rateLimit.tokenCount),
      resetAt,
    }
  }

  async incrementRateLimit(sessionId: string, tokenCount: number): Promise<void> {
    await prisma.rateLimit.update({
      where: { sessionId },
      data: {
        requestCount: { increment: 1 },
        tokenCount: { increment: tokenCount },
      },
    })
  }

  async getRateLimitStatus(sessionId: string): Promise<RateLimitStatus> {
    return this.checkRateLimit(sessionId)
  }
}

export const rateLimitService = new RateLimitService()

