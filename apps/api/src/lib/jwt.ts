import { SignJWT, jwtVerify, errors } from 'jose'
import { nanoid } from 'nanoid'
import type { TokenPayload } from '@spc/shared'

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/)
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid duration format: ${duration}`)
  }
  const value = Number(match[1])
  const unit: string = match[2]
  const multipliers: Readonly<Record<string, number>> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  }
  const multiplier = multipliers[unit]
  if (multiplier === undefined) {
    throw new Error(`Unknown duration unit: ${unit}`)
  }
  return value * multiplier
}

export class AuthError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

export async function signAccessToken(
  payload: {
    readonly sub: string
    readonly memberId: string
    readonly role: string
  },
  secret: string,
  expiresIn: string,
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)
  const expiresInSeconds = parseDuration(expiresIn)

  return new SignJWT({
    sub: payload.sub,
    memberId: payload.memberId,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .setJti(nanoid())
    .sign(secretKey)
}

export async function signRefreshToken(
  payload: { readonly sub: string },
  secret: string,
  expiresIn: string,
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)
  const expiresInSeconds = parseDuration(expiresIn)

  return new SignJWT({ sub: payload.sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .setJti(nanoid())
    .sign(secretKey)
}

export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<TokenPayload> {
  try {
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    })
    return payload as unknown as TokenPayload
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new AuthError('Token expired', 'TOKEN_EXPIRED')
    }
    throw new AuthError('Invalid token', 'INVALID_TOKEN')
  }
}

export async function verifyRefreshToken(
  token: string,
  secret: string,
): Promise<{ readonly sub: string }> {
  try {
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    })
    return { sub: payload.sub as string }
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new AuthError('Refresh token expired', 'REFRESH_TOKEN_EXPIRED')
    }
    throw new AuthError('Invalid refresh token', 'INVALID_REFRESH_TOKEN')
  }
}

export function getRefreshTokenExpiresAt(expiresIn: string): Date {
  const seconds = parseDuration(expiresIn)
  return new Date(Date.now() + seconds * 1000)
}
