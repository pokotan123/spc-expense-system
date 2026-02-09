// Member roles
export const MEMBER_ROLES = { MEMBER: 'MEMBER', ADMIN: 'ADMIN' } as const
export type MemberRole = (typeof MEMBER_ROLES)[keyof typeof MEMBER_ROLES]

// Application statuses
export const APPLICATION_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  RETURNED: 'RETURNED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const
export type ApplicationStatus =
  (typeof APPLICATION_STATUSES)[keyof typeof APPLICATION_STATUSES]

// Status display labels (Japanese)
export const APPLICATION_STATUS_LABELS: Readonly<
  Record<ApplicationStatus, string>
> = {
  DRAFT: '下書き',
  SUBMITTED: '申請中',
  RETURNED: '差戻し',
  APPROVED: '承認済',
  REJECTED: '却下',
} as const

// Payment statuses
export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const
export type PaymentStatus =
  (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES]

// OCR statuses
export const OCR_STATUSES = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const
export type OcrStatus = (typeof OCR_STATUSES)[keyof typeof OCR_STATUSES]

// Comment types
export const COMMENT_TYPES = {
  SUBMISSION: 'SUBMISSION',
  APPROVAL: 'APPROVAL',
  RETURN: 'RETURN',
  REJECTION: 'REJECTION',
  GENERAL: 'GENERAL',
} as const
export type CommentType = (typeof COMMENT_TYPES)[keyof typeof COMMENT_TYPES]

// Valid status transitions
export const VALID_STATUS_TRANSITIONS: Readonly<
  Record<ApplicationStatus, readonly ApplicationStatus[]>
> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['RETURNED', 'APPROVED', 'REJECTED'],
  RETURNED: ['SUBMITTED'],
  APPROVED: [],
  REJECTED: [],
} as const

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  OCR_FAILED: 'OCR_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

// File upload constraints
export const FILE_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ] as const,
  MAX_FILES_PER_APPLICATION: 10,
} as const

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const
