import { prisma } from '../lib/prisma.js'
import { AppError } from '../middleware/error-handler.js'
import { ERROR_CODES } from '@spc/shared'

interface CategoryResult {
  readonly id: string
  readonly name: string
  readonly code: string
  readonly description: string | null
  readonly isActive: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

interface CreateCategoryParams {
  readonly name: string
  readonly code: string
  readonly description?: string | null
}

interface UpdateCategoryParams {
  readonly name?: string
  readonly code?: string
  readonly description?: string | null
  readonly is_active?: boolean
}

const CATEGORY_SELECT = {
  id: true,
  name: true,
  code: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createCategoryService() {
  async function findAll(
    includeInactive = false,
  ): Promise<readonly CategoryResult[]> {
    const where = includeInactive ? {} : { isActive: true }
    return prisma.internalCategory.findMany({
      where,
      select: CATEGORY_SELECT,
      orderBy: { code: 'asc' },
    })
  }

  async function findById(id: string): Promise<CategoryResult> {
    const category = await prisma.internalCategory.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    })

    if (!category) {
      throw new AppError('Category not found', ERROR_CODES.NOT_FOUND, 404)
    }

    return category
  }

  async function create(params: CreateCategoryParams): Promise<CategoryResult> {
    const existing = await prisma.internalCategory.findUnique({
      where: { code: params.code },
    })

    if (existing) {
      throw new AppError(
        `Category with code "${params.code}" already exists`,
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    return prisma.internalCategory.create({
      data: {
        name: params.name,
        code: params.code,
        description: params.description ?? null,
      },
      select: CATEGORY_SELECT,
    })
  }

  async function update(
    id: string,
    params: UpdateCategoryParams,
  ): Promise<CategoryResult> {
    await findById(id)

    if (params.code) {
      const existing = await prisma.internalCategory.findFirst({
        where: { code: params.code, NOT: { id } },
      })
      if (existing) {
        throw new AppError(
          `Category with code "${params.code}" already exists`,
          ERROR_CODES.VALIDATION_ERROR,
          400,
        )
      }
    }

    return prisma.internalCategory.update({
      where: { id },
      data: {
        ...(params.name !== undefined ? { name: params.name } : {}),
        ...(params.code !== undefined ? { code: params.code } : {}),
        ...(params.description !== undefined
          ? { description: params.description }
          : {}),
        ...(params.is_active !== undefined
          ? { isActive: params.is_active }
          : {}),
      },
      select: CATEGORY_SELECT,
    })
  }

  async function remove(id: string): Promise<void> {
    await findById(id)

    const usageCount = await prisma.expenseApplication.count({
      where: { internalCategoryId: id },
    })

    if (usageCount > 0) {
      // Soft-delete: deactivate instead of hard-delete
      await prisma.internalCategory.update({
        where: { id },
        data: { isActive: false },
      })
      return
    }

    await prisma.internalCategory.delete({ where: { id } })
  }

  return Object.freeze({ findAll, findById, create, update, remove })
}

export type CategoryService = ReturnType<typeof createCategoryService>
