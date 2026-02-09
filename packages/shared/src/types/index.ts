import type { z } from 'zod'
import type {
  loginSchema,
  tokenResponseSchema,
  memberSchema,
  createMemberSchema,
  updateMemberSchema,
  departmentSchema,
  createDepartmentSchema,
  internalCategorySchema,
  createCategorySchema,
  updateCategorySchema,
  expenseApplicationSchema,
  createExpenseApplicationSchema,
  updateExpenseApplicationSchema,
  submitApplicationSchema,
  approveApplicationSchema,
  returnApplicationSchema,
  rejectApplicationSchema,
  receiptSchema,
  ocrResultSchema,
  updateOcrResultSchema,
  paymentSchema,
  generatePaymentSchema,
  applicationCommentSchema,
  createCommentSchema,
  paginationSchema,
  applicationFilterSchema,
} from '../schemas/index.js'

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export type LoginInput = z.infer<typeof loginSchema>
export type TokenResponse = z.infer<typeof tokenResponseSchema>

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------
export type Member = z.infer<typeof memberSchema>
export type CreateMemberInput = z.infer<typeof createMemberSchema>
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>

// ---------------------------------------------------------------------------
// Department
// ---------------------------------------------------------------------------
export type Department = z.infer<typeof departmentSchema>
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>

// ---------------------------------------------------------------------------
// Internal category
// ---------------------------------------------------------------------------
export type InternalCategory = z.infer<typeof internalCategorySchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

// ---------------------------------------------------------------------------
// Expense application
// ---------------------------------------------------------------------------
export type ExpenseApplication = z.infer<typeof expenseApplicationSchema>
export type CreateExpenseApplicationInput = z.infer<
  typeof createExpenseApplicationSchema
>
export type UpdateExpenseApplicationInput = z.infer<
  typeof updateExpenseApplicationSchema
>
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>
export type ApproveApplicationInput = z.infer<typeof approveApplicationSchema>
export type ReturnApplicationInput = z.infer<typeof returnApplicationSchema>
export type RejectApplicationInput = z.infer<typeof rejectApplicationSchema>

// ---------------------------------------------------------------------------
// Receipt & OCR
// ---------------------------------------------------------------------------
export type Receipt = z.infer<typeof receiptSchema>
export type OcrResult = z.infer<typeof ocrResultSchema>
export type UpdateOcrResultInput = z.infer<typeof updateOcrResultSchema>

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------
export type Payment = z.infer<typeof paymentSchema>
export type GeneratePaymentInput = z.infer<typeof generatePaymentSchema>

// ---------------------------------------------------------------------------
// Comment
// ---------------------------------------------------------------------------
export type ApplicationComment = z.infer<typeof applicationCommentSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>

// ---------------------------------------------------------------------------
// Query / Pagination / Filters
// ---------------------------------------------------------------------------
export type PaginationInput = z.infer<typeof paginationSchema>
export type ApplicationFilterInput = z.infer<typeof applicationFilterSchema>

// ---------------------------------------------------------------------------
// API Response
// ---------------------------------------------------------------------------
export interface ApiResponse<T> {
  readonly success: boolean
  readonly data?: T
  readonly error?: {
    readonly code: string
    readonly message: string
    readonly details?: unknown
  }
  readonly meta?: {
    readonly total: number
    readonly page: number
    readonly limit: number
    readonly totalPages: number
  }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export interface DashboardStats {
  readonly totalApplications: number
  readonly totalAmount: number
  readonly byStatus: Readonly<
    Record<string, { readonly count: number; readonly amount: number }>
  >
  readonly recentApplications: ReadonlyArray<{
    readonly id: string
    readonly applicationNumber: string
    readonly status: string
    readonly amount: number
    readonly expenseDate: string
    readonly createdAt: string
  }>
}

// ---------------------------------------------------------------------------
// JWT Token
// ---------------------------------------------------------------------------
export interface TokenPayload {
  readonly sub: string // member UUID
  readonly memberId: string // display ID like "SPC-0001"
  readonly role: string // MemberRole
  readonly iat: number
  readonly exp: number
}
