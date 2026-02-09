import { describe, it, expect, beforeAll } from 'vitest'
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiresAt,
  AuthError,
} from '../jwt.js'

const JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'
const JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-chars'

describe('signAccessToken / verifyAccessToken', () => {
  it('creates a valid JWT and decodes it', async () => {
    const payload = { sub: 'user-uuid-1', memberId: 'SPC-0001', role: 'MEMBER' }
    const token = await signAccessToken(payload, JWT_SECRET, '15m')

    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)

    const decoded = await verifyAccessToken(token, JWT_SECRET)
    expect(decoded.sub).toBe('user-uuid-1')
    expect(decoded.memberId).toBe('SPC-0001')
    expect(decoded.role).toBe('MEMBER')
  })

  it('contains correct payload fields (sub, memberId, role, iat, exp)', async () => {
    const payload = { sub: 'uuid-abc', memberId: 'SPC-0002', role: 'ADMIN' }
    const token = await signAccessToken(payload, JWT_SECRET, '1h')
    const decoded = await verifyAccessToken(token, JWT_SECRET)

    expect(decoded).toHaveProperty('sub', 'uuid-abc')
    expect(decoded).toHaveProperty('memberId', 'SPC-0002')
    expect(decoded).toHaveProperty('role', 'ADMIN')
    expect(decoded).toHaveProperty('iat')
    expect(decoded).toHaveProperty('exp')
    expect(typeof decoded.iat).toBe('number')
    expect(typeof decoded.exp).toBe('number')
  })

  it('rejects an expired token', async () => {
    const payload = { sub: 'user-uuid-1', memberId: 'SPC-0001', role: 'MEMBER' }
    const token = await signAccessToken(payload, JWT_SECRET, '1s')

    // Wait for token to expire
    await new Promise((resolve) => setTimeout(resolve, 1500))

    await expect(verifyAccessToken(token, JWT_SECRET)).rejects.toThrow(AuthError)
    await expect(verifyAccessToken(token, JWT_SECRET)).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
    })
  })

  it('rejects a token signed with a different secret', async () => {
    const payload = { sub: 'user-uuid-1', memberId: 'SPC-0001', role: 'MEMBER' }
    const token = await signAccessToken(payload, JWT_SECRET, '15m')

    const wrongSecret = 'completely-different-secret-at-least-32-chars!'
    await expect(verifyAccessToken(token, wrongSecret)).rejects.toThrow(AuthError)
    await expect(verifyAccessToken(token, wrongSecret)).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    })
  })

  it('rejects a tampered token', async () => {
    const payload = { sub: 'user-uuid-1', memberId: 'SPC-0001', role: 'MEMBER' }
    const token = await signAccessToken(payload, JWT_SECRET, '15m')

    const parts = token.split('.')
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: 'hacker', memberId: 'HACK', role: 'ADMIN' }),
    ).toString('base64url')
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`

    await expect(verifyAccessToken(tampered, JWT_SECRET)).rejects.toThrow(
      AuthError,
    )
  })
})

describe('signRefreshToken / verifyRefreshToken', () => {
  it('creates and verifies a refresh token pair', async () => {
    const payload = { sub: 'user-uuid-refresh' }
    const token = await signRefreshToken(payload, JWT_REFRESH_SECRET, '7d')

    expect(typeof token).toBe('string')

    const decoded = await verifyRefreshToken(token, JWT_REFRESH_SECRET)
    expect(decoded.sub).toBe('user-uuid-refresh')
  })

  it('rejects expired refresh token', async () => {
    const payload = { sub: 'user-uuid-refresh' }
    const token = await signRefreshToken(payload, JWT_REFRESH_SECRET, '1s')

    await new Promise((resolve) => setTimeout(resolve, 1500))

    await expect(
      verifyRefreshToken(token, JWT_REFRESH_SECRET),
    ).rejects.toThrow(AuthError)
    await expect(
      verifyRefreshToken(token, JWT_REFRESH_SECRET),
    ).rejects.toMatchObject({
      code: 'REFRESH_TOKEN_EXPIRED',
    })
  })

  it('rejects refresh token with wrong secret', async () => {
    const payload = { sub: 'user-uuid-refresh' }
    const token = await signRefreshToken(payload, JWT_REFRESH_SECRET, '7d')

    const wrongSecret = 'wrong-refresh-secret-at-least-32-characters!'
    await expect(verifyRefreshToken(token, wrongSecret)).rejects.toThrow(
      AuthError,
    )
    await expect(verifyRefreshToken(token, wrongSecret)).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    })
  })
})

describe('getRefreshTokenExpiresAt', () => {
  it('returns a future Date for "7d"', () => {
    const now = Date.now()
    const expiresAt = getRefreshTokenExpiresAt('7d')

    expect(expiresAt).toBeInstanceOf(Date)
    const expectedMs = 7 * 24 * 3600 * 1000
    const diff = expiresAt.getTime() - now
    expect(diff).toBeGreaterThan(expectedMs - 1000)
    expect(diff).toBeLessThan(expectedMs + 1000)
  })

  it('returns a future Date for "15m"', () => {
    const now = Date.now()
    const expiresAt = getRefreshTokenExpiresAt('15m')

    const expectedMs = 15 * 60 * 1000
    const diff = expiresAt.getTime() - now
    expect(diff).toBeGreaterThan(expectedMs - 1000)
    expect(diff).toBeLessThan(expectedMs + 1000)
  })
})
