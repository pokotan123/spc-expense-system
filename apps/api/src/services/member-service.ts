import { prisma } from '../lib/prisma.js'
import { AppError } from '../middleware/error-handler.js'
import { ERROR_CODES } from '@spc/shared'

interface MemberResult {
  readonly id: string
  readonly memberId: string
  readonly name: string
  readonly email: string
  readonly role: string
  readonly isActive: boolean
  readonly departmentId: string | null
  readonly department: {
    readonly id: string
    readonly name: string
    readonly code: string
  } | null
}

const MEMBER_SELECT = {
  id: true,
  memberId: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  departmentId: true,
  department: {
    select: { id: true, name: true, code: true },
  },
} as const

export function createMemberService() {
  async function findById(id: string): Promise<MemberResult> {
    const member = await prisma.member.findUnique({
      where: { id },
      select: MEMBER_SELECT,
    })

    if (!member) {
      throw new AppError('Member not found', ERROR_CODES.NOT_FOUND, 404)
    }

    return member
  }

  async function findByMemberId(memberId: string): Promise<MemberResult> {
    const member = await prisma.member.findUnique({
      where: { memberId },
      select: MEMBER_SELECT,
    })

    if (!member) {
      throw new AppError('Member not found', ERROR_CODES.NOT_FOUND, 404)
    }

    return member
  }

  async function findAll(): Promise<readonly MemberResult[]> {
    const members = await prisma.member.findMany({
      where: { isActive: true },
      select: MEMBER_SELECT,
      orderBy: { memberId: 'asc' },
    })
    return members
  }

  return Object.freeze({ findById, findByMemberId, findAll })
}

export type MemberService = ReturnType<typeof createMemberService>
