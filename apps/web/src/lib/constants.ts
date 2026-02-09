// Local constants until @spc/shared is ready
// These will be replaced by imports from @spc/shared

export const MEMBER_ROLES = { MEMBER: 'MEMBER', ADMIN: 'ADMIN' } as const
export type MemberRole = (typeof MEMBER_ROLES)[keyof typeof MEMBER_ROLES]

export const APPLICATION_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  RETURNED: 'RETURNED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const
export type ApplicationStatus =
  (typeof APPLICATION_STATUSES)[keyof typeof APPLICATION_STATUSES]

export const APPLICATION_STATUS_LABELS: Readonly<
  Record<ApplicationStatus, string>
> = {
  DRAFT: '下書き',
  SUBMITTED: '申請中',
  RETURNED: '差戻し',
  APPROVED: '承認済',
  REJECTED: '却下',
} as const

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const
