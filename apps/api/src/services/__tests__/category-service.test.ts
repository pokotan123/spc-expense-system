import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ERROR_CODES } from '@spc/shared'
import { AppError } from '../../middleware/error-handler.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    internalCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    expenseApplication: {
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma.js'
import { createCategoryService } from '../category-service.js'

const mockPrisma = prisma as unknown as {
  internalCategory: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  expenseApplication: {
    count: ReturnType<typeof vi.fn>
  }
}

const sampleCategory = {
  id: 'cat-1',
  name: '交通費',
  code: 'TRANSPORT',
  description: '交通費カテゴリ',
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

const sampleCategory2 = {
  id: 'cat-2',
  name: '宿泊費',
  code: 'HOTEL',
  description: '宿泊費カテゴリ',
  isActive: true,
  createdAt: new Date('2025-01-02'),
  updatedAt: new Date('2025-01-02'),
}

const inactiveCategory = {
  id: 'cat-3',
  name: '旧カテゴリ',
  code: 'OLD',
  description: null,
  isActive: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2025-01-01'),
}

describe('CategoryService', () => {
  const service = createCategoryService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findAll', () => {
    it('returns only active categories by default', async () => {
      mockPrisma.internalCategory.findMany.mockResolvedValue([
        sampleCategory,
        sampleCategory2,
      ])

      const result = await service.findAll()

      expect(result).toEqual([sampleCategory, sampleCategory2])
      expect(mockPrisma.internalCategory.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: expect.objectContaining({ id: true, name: true, code: true }),
        orderBy: { code: 'asc' },
      })
    })

    it('returns all categories when includeInactive is true', async () => {
      mockPrisma.internalCategory.findMany.mockResolvedValue([
        sampleCategory,
        sampleCategory2,
        inactiveCategory,
      ])

      const result = await service.findAll(true)

      expect(result).toHaveLength(3)
      expect(mockPrisma.internalCategory.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.objectContaining({ id: true }),
        orderBy: { code: 'asc' },
      })
    })

    it('orders results by code ascending', async () => {
      mockPrisma.internalCategory.findMany.mockResolvedValue([
        sampleCategory2,
        sampleCategory,
      ])

      await service.findAll()

      expect(mockPrisma.internalCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { code: 'asc' } }),
      )
    })
  })

  describe('findById', () => {
    it('returns category when found', async () => {
      mockPrisma.internalCategory.findUnique.mockResolvedValue(sampleCategory)

      const result = await service.findById('cat-1')

      expect(result).toEqual(sampleCategory)
      expect(mockPrisma.internalCategory.findUnique).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        select: expect.objectContaining({ id: true, name: true }),
      })
    })

    it('throws AppError 404 when category not found', async () => {
      mockPrisma.internalCategory.findUnique.mockResolvedValue(null)

      await expect(service.findById('nonexistent')).rejects.toThrow(AppError)
      await expect(service.findById('nonexistent')).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
      })
    })
  })

  describe('create', () => {
    it('creates a new category successfully', async () => {
      mockPrisma.internalCategory.findUnique.mockResolvedValue(null)
      mockPrisma.internalCategory.create.mockResolvedValue(sampleCategory)

      const result = await service.create({
        name: '交通費',
        code: 'TRANSPORT',
        description: '交通費カテゴリ',
      })

      expect(result).toEqual(sampleCategory)
      expect(mockPrisma.internalCategory.create).toHaveBeenCalledWith({
        data: {
          name: '交通費',
          code: 'TRANSPORT',
          description: '交通費カテゴリ',
        },
        select: expect.objectContaining({ id: true }),
      })
    })

    it('throws AppError 400 when code already exists', async () => {
      mockPrisma.internalCategory.findUnique.mockResolvedValue(sampleCategory)

      await expect(
        service.create({ name: 'Duplicate', code: 'TRANSPORT' }),
      ).rejects.toThrow(AppError)
      await expect(
        service.create({ name: 'Duplicate', code: 'TRANSPORT' }),
      ).rejects.toMatchObject({
        code: ERROR_CODES.VALIDATION_ERROR,
        statusCode: 400,
      })
    })

    it('sets description to null when not provided', async () => {
      mockPrisma.internalCategory.findUnique.mockResolvedValue(null)
      mockPrisma.internalCategory.create.mockResolvedValue({
        ...sampleCategory,
        description: null,
      })

      await service.create({ name: '交通費', code: 'TRANSPORT' })

      expect(mockPrisma.internalCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      )
    })
  })

  describe('update', () => {
    it('updates category fields successfully', async () => {
      const updated = { ...sampleCategory, name: '更新後の交通費' }
      mockPrisma.internalCategory.findUnique.mockResolvedValue(sampleCategory)
      mockPrisma.internalCategory.update.mockResolvedValue(updated)

      const result = await service.update('cat-1', { name: '更新後の交通費' })

      expect(result).toEqual(updated)
      expect(mockPrisma.internalCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { name: '更新後の交通費' },
        select: expect.objectContaining({ id: true }),
      })
    })

    it('throws AppError 404 when category does not exist', async () => {
      mockPrisma.internalCategory.findUnique.mockResolvedValue(null)

      await expect(
        service.update('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(AppError)
      await expect(
        service.update('nonexistent', { name: 'New Name' }),
      ).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
      })
    })

    it('throws AppError 400 when updated code conflicts with another category', async () => {
      mockPrisma.internalCategory.findUnique.mockResolvedValue(sampleCategory)
      mockPrisma.internalCategory.findFirst.mockResolvedValue(sampleCategory2)

      await expect(
        service.update('cat-1', { code: 'HOTEL' }),
      ).rejects.toThrow(AppError)
      await expect(
        service.update('cat-1', { code: 'HOTEL' }),
      ).rejects.toMatchObject({
        code: ERROR_CODES.VALIDATION_ERROR,
        statusCode: 400,
      })
    })
  })

  describe('remove', () => {
    it('hard-deletes category when no applications use it', async () => {
      mockPrisma.internalCategory.findUnique.mockResolvedValue(sampleCategory)
      mockPrisma.expenseApplication.count.mockResolvedValue(0)
      mockPrisma.internalCategory.delete.mockResolvedValue(sampleCategory)

      await service.remove('cat-1')

      expect(mockPrisma.internalCategory.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      })
      expect(mockPrisma.internalCategory.update).not.toHaveBeenCalled()
    })

    it('soft-deletes (deactivates) category when applications use it', async () => {
      mockPrisma.internalCategory.findUnique.mockResolvedValue(sampleCategory)
      mockPrisma.expenseApplication.count.mockResolvedValue(3)
      mockPrisma.internalCategory.update.mockResolvedValue({
        ...sampleCategory,
        isActive: false,
      })

      await service.remove('cat-1')

      expect(mockPrisma.internalCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { isActive: false },
      })
      expect(mockPrisma.internalCategory.delete).not.toHaveBeenCalled()
    })

    it('throws AppError 404 when category does not exist', async () => {
      mockPrisma.internalCategory.findUnique.mockResolvedValue(null)

      await expect(service.remove('nonexistent')).rejects.toThrow(AppError)
      await expect(service.remove('nonexistent')).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
      })
    })
  })
})
