import { NextRequest, NextResponse } from "next/server";

// In-memory rate limiter (use Redis in production for distributed systems)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export function getRateLimitConfig(): RateLimitConfig {
  return {
    limit: parseInt(process.env.RATE_LIMIT_REQUESTS || "20", 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  };
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (cfConnectingIP) return cfConnectingIP.split(",")[0].trim();
  if (forwarded) return forwarded.split(",")[0].trim();
  if (realIP) return realIP;

  return "unknown";
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const config = getRateLimitConfig();
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.limit - 1, resetAt: now + config.windowMs };
  }

  if (record.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: config.limit - record.count, resetAt: record.resetAt };
}

// XSS Protection - Sanitize user input
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// Validate file types (Allow all types as requested)
export function isAllowedMimeType(mimeType: string): boolean {
  return true;
}

// Security headers middleware helper
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.gofile.io https://*.gofile.io;"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  return response;
}

// CORS validation
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Allow same-origin requests

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map(o => o.trim());

  return allowedOrigins.includes(origin) || allowedOrigins.includes("*");
}

// Create error response with security headers
export function secureErrorResponse(
  message: string,
  code: string,
  status: number = 400
): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: { code, message: sanitizeInput(message) },
    },
    { status }
  );
  return addSecurityHeaders(response);
}

// Create success response with security headers
export function secureSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  const response = NextResponse.json(
    { success: true, data },
    { status }
  );
  return addSecurityHeaders(response);
}

// Validate request origin and apply rate limiting
export function validateRequest(request: NextRequest): {
  valid: boolean;
  response?: NextResponse;
  ip: string;
} {
  const ip = getClientIP(request);
  const origin = request.headers.get("origin");

  // CORS check
  if (!isAllowedOrigin(origin)) {
    return {
      valid: false,
      ip,
      response: secureErrorResponse("Origin not allowed", "CORS_ERROR", 403),
    };
  }

  // Rate limit check
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    const response = secureErrorResponse(
      "Too many requests. Please try again later.",
      "RATE_LIMIT_EXCEEDED",
      429
    );
    response.headers.set("X-RateLimit-Limit", getRateLimitConfig().limit.toString());
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set("X-RateLimit-Reset", rateLimit.resetAt.toString());
    response.headers.set("Retry-After", Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString());
    return { valid: false, ip, response };
  }

  return { valid: true, ip };
}
