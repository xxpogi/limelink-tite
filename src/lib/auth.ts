import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { User } from '@prisma/client'

// Validate JWT secret at startup in production
const jwtSecretValue = process.env.JWT_SECRET
if (process.env.NODE_ENV === 'production' && (!jwtSecretValue || jwtSecretValue === 'default-secret-change-in-production')) {
  console.error('CRITICAL: JWT_SECRET environment variable must be set in production!')
  // In production, we want to fail fast rather than use a weak secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production')
  }
}

const JWT_SECRET = new TextEncoder().encode(jwtSecretValue || 'dev-secret-only-for-local-development')
const TOKEN_NAME = 'session'
const TOKEN_EXPIRY = 60 * 60 * 24 * 7 // 7 days

export type SessionUser = {
  id: string
  email: string
  name: string | null
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Create JWT token
export async function createToken(user: SessionUser): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return token
}

// Verify JWT token
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as SessionUser
  } catch {
    return null
  }
}

// Set session cookie
export async function setSession(user: SessionUser): Promise<void> {
  const token = await createToken(user)

  cookies().set({
    name: TOKEN_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_EXPIRY,
  })
}

// Clear session cookie
export async function clearSession(): Promise<void> {
  cookies().delete(TOKEN_NAME)
}

// Get current session
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(TOKEN_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// Get current user with full details
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession()
  if (!session) return null

  return prisma.user.findUnique({
    where: { id: session.id },
  })
}

// Require auth - throws if not authenticated
export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return session !== null
}
