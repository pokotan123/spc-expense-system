import { prisma } from '../lib/prisma.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiresAt,
  AuthError,
} from '../lib/jwt.js'
import { verifyPassword } from '../lib/password.js'
import type { Env } from '../config/env.js'

interface MemberInfo {
  readonly id: string
  readonly memberId: string
  readonly name: string
  readonly email: string
  readonly role: string
  readonly departmentId: string | null
}

interface LoginResult {
  readonly accessToken: string
  readonly refreshToken: string
  readonly member: MemberInfo
}

interface RefreshResult {
  readonly accessToken: string
  readonly refreshToken: string
}

export function createAuthService(env: Env) {
  async function login(
    memberId: string,
    password: string,
  ): Promise<LoginResult> {
    const member = await prisma.member.findUnique({
      where: { memberId },
    })

    if (!member || !member.isActive) {
      throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS')
    }

    const valid = await verifyPassword(password, member.passwordHash)
    if (!valid) {
      throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS')
    }

    const accessToken = await signAccessToken(
      { sub: member.id, memberId: member.memberId, role: member.role },
      env.JWT_SECRET,
      env.JWT_ACCESS_TOKEN_EXPIRES_IN,
    )

    const refreshToken = await signRefreshToken(
      { sub: member.id },
      env.JWT_REFRESH_SECRET,
      env.JWT_REFRESH_TOKEN_EXPIRES_IN,
    )

    const expiresAt = getRefreshTokenExpiresAt(env.JWT_REFRESH_TOKEN_EXPIRES_IN)

    await prisma.refreshToken.create({
      data: {
        memberId: member.id,
        token: refreshToken,
        expiresAt,
      },
    })

    return Object.freeze({
      accessToken,
      refreshToken,
      member: Object.freeze({
        id: member.id,
        memberId: member.memberId,
        name: member.name,
        email: member.email,
        role: member.role,
        departmentId: member.departmentId,
      }),
    })
  }

  async function refreshAccessToken(
    currentRefreshToken: string,
  ): Promise<RefreshResult> {
    const payload = await verifyRefreshToken(
      currentRefreshToken,
      env.JWT_REFRESH_SECRET,
    )

    const stored = await prisma.refreshToken.findUnique({
      where: { token: currentRefreshToken },
      include: { member: true },
    })

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } })
      }
      throw new AuthError(
        'Invalid or expired refresh token',
        'INVALID_REFRESH_TOKEN',
      )
    }

    if (!stored.member.isActive) {
      throw new AuthError('Account is disabled', 'ACCOUNT_DISABLED')
    }

    if (stored.memberId !== payload.sub) {
      throw new AuthError('Token mismatch', 'INVALID_REFRESH_TOKEN')
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } })

    const accessToken = await signAccessToken(
      {
        sub: stored.member.id,
        memberId: stored.member.memberId,
        role: stored.member.role,
      },
      env.JWT_SECRET,
      env.JWT_ACCESS_TOKEN_EXPIRES_IN,
    )

    const newRefreshToken = await signRefreshToken(
      { sub: stored.member.id },
      env.JWT_REFRESH_SECRET,
      env.JWT_REFRESH_TOKEN_EXPIRES_IN,
    )

    const expiresAt = getRefreshTokenExpiresAt(env.JWT_REFRESH_TOKEN_EXPIRES_IN)

    await prisma.refreshToken.create({
      data: {
        memberId: stored.member.id,
        token: newRefreshToken,
        expiresAt,
      },
    })

    return Object.freeze({
      accessToken,
      refreshToken: newRefreshToken,
    })
  }

  async function logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    })
  }

  async function logoutAll(memberId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { memberId },
    })
  }

  return Object.freeze({ login, refreshAccessToken, logout, logoutAll })
}

export type AuthService = ReturnType<typeof createAuthService>
