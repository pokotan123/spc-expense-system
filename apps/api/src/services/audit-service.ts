import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

interface AuditLogEntry {
  readonly action: string
  readonly entity: string
  readonly entityId?: string
  readonly memberId?: string
  readonly details?: Record<string, unknown>
  readonly ipAddress?: string
}

interface AuditLogFilters {
  readonly action?: string
  readonly entity?: string
  readonly memberId?: string
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly page: number
  readonly limit: number
}

export function createAuditService() {
  async function log(entry: AuditLogEntry) {
    return prisma.auditLog.create({
      data: {
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        memberId: entry.memberId ?? null,
        details: (entry.details as Prisma.InputJsonValue) ?? undefined,
        ipAddress: entry.ipAddress ?? null,
      },
    })
  }

  async function list(filters: AuditLogFilters) {
    const where: Record<string, unknown> = {}
    if (filters.action) where.action = filters.action
    if (filters.entity) where.entity = filters.entity
    if (filters.memberId) where.memberId = filters.memberId
    if (filters.dateFrom || filters.dateTo) {
      const createdAt: Record<string, Date> = {}
      if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom)
      if (filters.dateTo) createdAt.lte = new Date(filters.dateTo)
      where.createdAt = createdAt
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return Object.freeze({
      items,
      meta: Object.freeze({
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      }),
    })
  }

  return Object.freeze({ log, list })
}

export type AuditService = ReturnType<typeof createAuditService>
