import { z } from 'zod'
import {
  APPLICATION_STATUSES,
  COMMENT_TYPES,
  MEMBER_ROLES,
  OCR_STATUSES,
  PAGINATION,
  PAYMENT_STATUSES,
} from '../constants/index.js'

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  member_id: z.string().min(1, 'Member ID is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
})

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------
export const memberSchema = z.object({
  id: z.string().uuid(),
  member_id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.nativeEnum({
    MEMBER: MEMBER_ROLES.MEMBER,
    ADMIN: MEMBER_ROLES.ADMIN,
  } as const),
  department_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const createMemberSchema = z.object({
  member_id: z.string().min(1, 'Member ID is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z
    .nativeEnum({
      MEMBER: MEMBER_ROLES.MEMBER,
      ADMIN: MEMBER_ROLES.ADMIN,
    } as const)
    .default(MEMBER_ROLES.MEMBER),
  department_id: z.string().uuid().nullable().default(null),
})

export const updateMemberSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z
    .nativeEnum({
      MEMBER: MEMBER_ROLES.MEMBER,
      ADMIN: MEMBER_ROLES.ADMIN,
    } as const)
    .optional(),
  department_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Department
// ---------------------------------------------------------------------------
export const departmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  code: z.string().min(1, 'Department code is required'),
})

// ---------------------------------------------------------------------------
// Internal category
// ---------------------------------------------------------------------------
export const internalCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  code: z.string().min(1, 'Category code is required'),
  description: z.string().nullable().default(null),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Expense application
// ---------------------------------------------------------------------------
export const expenseApplicationSchema = z.object({
  id: z.string().uuid(),
  application_number: z.string(),
  member_id: z.string().uuid(),
  expense_date: z.string().datetime(),
  amount: z.number().int().min(1),
  description: z.string(),
  is_cash_payment: z.boolean(),
  status: z.nativeEnum({
    DRAFT: APPLICATION_STATUSES.DRAFT,
    SUBMITTED: APPLICATION_STATUSES.SUBMITTED,
    RETURNED: APPLICATION_STATUSES.RETURNED,
    APPROVED: APPLICATION_STATUSES.APPROVED,
    REJECTED: APPLICATION_STATUSES.REJECTED,
  } as const),
  internal_category_id: z.string().uuid().nullable(),
  proposed_amount: z.number().int().nullable(),
  final_amount: z.number().int().nullable(),
  approved_by: z.string().uuid().nullable(),
  approved_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const createExpenseApplicationSchema = z.object({
  expense_date: z.string().min(1, 'Expense date is required'),
  amount: z.number().int().min(1, 'Amount must be at least 1'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be 500 characters or less'),
  is_cash_payment: z.boolean(),
})

export const updateExpenseApplicationSchema =
  createExpenseApplicationSchema.partial()

export const submitApplicationSchema = z.object({
  id: z.string().uuid(),
})

export const approveApplicationSchema = z.object({
  internal_category_id: z.string().uuid('Valid category ID is required'),
  final_amount: z.number().int().min(0, 'Final amount must be 0 or more'),
  comment: z.string().optional(),
})

export const returnApplicationSchema = z.object({
  comment: z.string().min(1, 'Comment is required when returning'),
})

export const rejectApplicationSchema = z.object({
  comment: z.string().min(1, 'Comment is required when rejecting'),
})

// ---------------------------------------------------------------------------
// Receipt & OCR
// ---------------------------------------------------------------------------
export const receiptSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  file_path: z.string(),
  file_name: z.string(),
  mime_type: z.string(),
  file_size: z.number().int(),
  ocr_status: z.nativeEnum({
    PENDING: OCR_STATUSES.PENDING,
    PROCESSING: OCR_STATUSES.PROCESSING,
    COMPLETED: OCR_STATUSES.COMPLETED,
    FAILED: OCR_STATUSES.FAILED,
  } as const),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const ocrResultSchema = z.object({
  id: z.string().uuid(),
  receipt_id: z.string().uuid(),
  extracted_date: z.string().nullable(),
  extracted_amount: z.number().nullable(),
  extracted_store_name: z.string().nullable(),
  raw_text: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const updateOcrResultSchema = z.object({
  extracted_date: z.string().optional(),
  extracted_amount: z.number().optional(),
  extracted_store_name: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------
export const paymentSchema = z.object({
  id: z.string().uuid(),
  payment_number: z.string(),
  status: z.nativeEnum({
    PENDING: PAYMENT_STATUSES.PENDING,
    COMPLETED: PAYMENT_STATUSES.COMPLETED,
    FAILED: PAYMENT_STATUSES.FAILED,
  } as const),
  total_amount: z.number().int(),
  processed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const generatePaymentSchema = z.object({
  application_ids: z
    .array(z.string().uuid())
    .min(1, 'At least one application is required'),
})

// ---------------------------------------------------------------------------
// Comment
// ---------------------------------------------------------------------------
export const applicationCommentSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid(),
  member_id: z.string().uuid(),
  comment: z.string(),
  comment_type: z.nativeEnum({
    SUBMISSION: COMMENT_TYPES.SUBMISSION,
    APPROVAL: COMMENT_TYPES.APPROVAL,
    RETURN: COMMENT_TYPES.RETURN,
    REJECTION: COMMENT_TYPES.REJECTION,
    GENERAL: COMMENT_TYPES.GENERAL,
  } as const),
  created_at: z.string().datetime(),
})

export const createCommentSchema = z.object({
  comment: z.string().min(1, 'Comment is required'),
  comment_type: z.nativeEnum({
    SUBMISSION: COMMENT_TYPES.SUBMISSION,
    APPROVAL: COMMENT_TYPES.APPROVAL,
    RETURN: COMMENT_TYPES.RETURN,
    REJECTION: COMMENT_TYPES.REJECTION,
    GENERAL: COMMENT_TYPES.GENERAL,
  } as const),
})

// ---------------------------------------------------------------------------
// Query / Pagination / Filters
// ---------------------------------------------------------------------------
export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
})

export const applicationFilterSchema = z.object({
  status: z
    .nativeEnum({
      DRAFT: APPLICATION_STATUSES.DRAFT,
      SUBMITTED: APPLICATION_STATUSES.SUBMITTED,
      RETURNED: APPLICATION_STATUSES.RETURNED,
      APPROVED: APPLICATION_STATUSES.APPROVED,
      REJECTED: APPLICATION_STATUSES.REJECTED,
    } as const)
    .optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  member_id: z.string().uuid().optional(),
  department_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
})
