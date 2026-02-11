// Local type definitions for API responses
// Will be replaced by @spc/shared types when available

import type { ApplicationStatus } from '@/lib/constants'

export interface OcrResult {
  readonly id: string
  readonly receiptId: string
  readonly extractedDate: string | null
  readonly extractedAmount: string | null
  readonly extractedStoreName: string | null
  readonly extractedText: string | null
  readonly confidence: number | null
  readonly status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  readonly errorMessage: string | null
  readonly createdAt: string
}

export interface Receipt {
  readonly id: string
  readonly expenseApplicationId: string
  readonly fileName: string
  readonly filePath: string
  readonly fileUrl: string | null
  readonly fileSize: number
  readonly mimeType: string
  readonly createdAt: string
  readonly ocrResult: OcrResult | null
}

export interface ApplicationComment {
  readonly id: string
  readonly expenseApplicationId: string
  readonly memberId: string
  readonly memberName: string
  readonly comment: string
  readonly commentType: 'SUBMISSION' | 'APPROVAL' | 'RETURN' | 'REJECTION' | 'GENERAL'
  readonly createdAt: string
}

export interface ExpenseApplication {
  readonly id: string
  readonly applicationNumber: string
  readonly memberId: string
  readonly memberName: string
  readonly status: ApplicationStatus
  readonly expenseDate: string
  readonly amount: number
  readonly proposedAmount: number | null
  readonly finalAmount: number | null
  readonly description: string
  readonly internalCategoryId: string | null
  readonly internalCategoryName: string | null
  readonly isCashPayment: boolean
  readonly submittedAt: string | null
  readonly approvedAt: string | null
  readonly rejectedAt: string | null
  readonly approvedByName: string | null
  readonly createdAt: string
  readonly updatedAt: string
  readonly receipts: readonly Receipt[]
  readonly comments: readonly ApplicationComment[]
}

export interface DashboardStats {
  readonly totalCount: number
  readonly totalAmount: number
  readonly draftCount: number
  readonly draftAmount: number
  readonly pendingCount: number
  readonly pendingAmount: number
  readonly approvedCount: number
  readonly approvedAmount: number
  readonly rejectedCount: number
  readonly rejectedAmount: number
}

export interface PaginatedResponse<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly page: number
  readonly limit: number
  readonly totalPages: number
}

export interface ApplicationFormData {
  readonly expenseDate: string
  readonly amount: number
  readonly description: string
  readonly isCashPayment: boolean
  readonly internalCategoryId?: string
}
