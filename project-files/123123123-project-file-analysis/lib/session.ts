import { jwtVerify, SignJWT } from 'jose'
import type { Role, SessionUser } from './types'

/**
 * Edge-safe session primitives (JWT sign/verify with `jose`).
 * Kept dependency-free of Node-only modules so it can be used inside
 * middleware (Edge runtime) as well as server actions / route handlers.
 */

export const SESSION_COOKIE = 'omnidesk_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    // Dev/preview fallback so the app boots without configuration.
    // ALWAYS set AUTH_SECRET in production (e.g. `openssl rand -base64 32`).
    'dev-only-insecure-secret-change-me-in-production-0000'
  return new TextEncoder().encode(secret)
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    role: user.role,
    email: user.email,
    name: user.name,
    // Session version: re-checked against the DB on every request so a
    // password change / block can revoke outstanding tokens immediately.
    sv: user.sv ?? 0,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret())
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (!payload.sub || !payload.role) return null
    return {
      sub: payload.sub,
      role: payload.role as Role,
      email: (payload.email as string) ?? '',
      name: (payload.name as string) ?? '',
      sv: typeof payload.sv === 'number' ? payload.sv : 0,
    }
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE,
}
