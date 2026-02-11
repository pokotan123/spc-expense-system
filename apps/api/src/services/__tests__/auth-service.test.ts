import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthError } from '../../lib/jwt.js'
import type { Env } from '../../config/env.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    member: {
      findUnique: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('../../lib/password.js', () => ({
  verifyPassword: vi.fn(),
}))

vi.mock('../../lib/jwt.js', async () => {
  const actual = await vi.importActual('../../lib/jwt.js')
  return {
    ...actual,
    signAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
    signRefreshToken: vi.fn().mockResolvedValue('mock-refresh-token'),
    verifyRefreshToken: vi.fn().mockResolvedValue({ sub: 'uuid-1' }),
    getRefreshTokenExpiresAt: vi.fn().mockReturnValue(new Date('2025-01-08')),
  }
})

import { prisma } from '../../lib/prisma.js'
import { verifyPassword } from '../../lib/password.js'
import { createAuthService } from '../auth-service.js'

const mockPrisma = prisma as unknown as {
  member: {
    findUnique: ReturnType<typeof vi.fn>
  }
  refreshToken: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
}

const mockVerifyPassword = verifyPassword as ReturnType<typeof vi.fn>

const mockEnv: Env = {
  NODE_ENV: 'test',
  PORT: 3001,
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars-long',
  JWT_ACCESS_TOKEN_EXPIRES_IN: '15m',
  JWT_REFRESH_TOKEN_EXPIRES_IN: '7d',
  CORS_ORIGIN: 'http://localhost:3000',
  S3_BUCKET_NAME: 'spc-receipts',
  S3_REGION: 'auto',
}

const sampleMember = {
  id: 'uuid-1',
  memberId: 'EMP001',
  name: '田中太郎',
  email: 'tanaka@spc.co.jp',
  role: 'MEMBER',
  departmentId: 'dept-1',
  passwordHash: '$2a$12$hashed-password',
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

const inactiveMember = {
  ...sampleMember,
  id: 'uuid-inactive',
  memberId: 'EMP999',
  isActive: false,
}

describe('AuthService', () => {
  const service = createAuthService(mockEnv)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('returns tokens and member info on successful login', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(sampleMember)
      mockVerifyPassword.mockResolvedValue(true)
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' })

      const result = await service.login('EMP001', 'correct-password')

      expect(result.accessToken).toBe('mock-access-token')
      expect(result.refreshToken).toBe('mock-refresh-token')
      expect(result.member).toEqual({
        id: 'uuid-1',
        memberId: 'EMP001',
        name: '田中太郎',
        email: 'tanaka@spc.co.jp',
        role: 'MEMBER',
        departmentId: 'dept-1',
      })
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          memberId: 'uuid-1',
          token: 'mock-refresh-token',
        }),
      })
    })

    it('throws AuthError when memberId is not found', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(null)

      await expect(
        service.login('UNKNOWN', 'password'),
      ).rejects.toThrow(AuthError)
      await expect(
        service.login('UNKNOWN', 'password'),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    })

    it('throws AuthError when password is incorrect', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(sampleMember)
      mockVerifyPassword.mockResolvedValue(false)

      await expect(
        service.login('EMP001', 'wrong-password'),
      ).rejects.toThrow(AuthError)
      await expect(
        service.login('EMP001', 'wrong-password'),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    })

    it('throws AuthError when account is inactive', async () => {
      mockPrisma.member.findUnique.mockResolvedValue(inactiveMember)

      await expect(
        service.login('EMP999', 'password'),
      ).rejects.toThrow(AuthError)
      await expect(
        service.login('EMP999', 'password'),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    })
  })

  describe('refreshAccessToken', () => {
    const storedToken = {
      id: 'rt-1',
      memberId: 'uuid-1',
      token: 'current-refresh-token',
      expiresAt: new Date(Date.now() + 86400000), // 1 day from now
      member: sampleMember,
    }

    it('rotates tokens successfully (deletes old, creates new)', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken)
      mockPrisma.refreshToken.delete.mockResolvedValue(storedToken)
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' })

      const result = await service.refreshAccessToken('current-refresh-token')

      expect(result.accessToken).toBe('mock-access-token')
      expect(result.refreshToken).toBe('mock-refresh-token')
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
      })
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          memberId: 'uuid-1',
          token: 'mock-refresh-token',
        }),
      })
    })

    it('throws AuthError when token is not found in DB', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null)

      await expect(
        service.refreshAccessToken('nonexistent-token'),
      ).rejects.toThrow(AuthError)
      await expect(
        service.refreshAccessToken('nonexistent-token'),
      ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' })
    })

    it('throws AuthError and deletes expired token from DB', async () => {
      const expiredToken = {
        ...storedToken,
        expiresAt: new Date('2024-01-01'), // expired
      }
      mockPrisma.refreshToken.findUnique.mockResolvedValue(expiredToken)
      mockPrisma.refreshToken.delete.mockResolvedValue(expiredToken)

      await expect(
        service.refreshAccessToken('current-refresh-token'),
      ).rejects.toThrow(AuthError)
      await expect(
        service.refreshAccessToken('current-refresh-token'),
      ).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' })

      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
      })
    })

    it('throws AuthError when member account is inactive', async () => {
      const tokenWithInactiveMember = {
        ...storedToken,
        member: inactiveMember,
        memberId: 'uuid-inactive',
      }
      mockPrisma.refreshToken.findUnique.mockResolvedValue(
        tokenWithInactiveMember,
      )
      mockPrisma.refreshToken.delete.mockResolvedValue(tokenWithInactiveMember)

      await expect(
        service.refreshAccessToken('current-refresh-token'),
      ).rejects.toThrow(AuthError)
      await expect(
        service.refreshAccessToken('current-refresh-token'),
      ).rejects.toMatchObject({ code: 'ACCOUNT_DISABLED' })
    })
  })

  describe('logout', () => {
    it('deletes the refresh token from DB', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 })

      await service.logout('some-refresh-token')

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-refresh-token' },
      })
    })
  })
})
