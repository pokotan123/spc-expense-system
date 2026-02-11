import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ERROR_CODES,
  FILE_CONSTRAINTS,
  APPLICATION_STATUSES,
} from '@spc/shared'
import { AppError } from '../../middleware/error-handler.js'
import { createReceiptService } from '../receipt-service.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    expenseApplication: { findUnique: vi.fn() },
    receipt: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), delete: vi.fn() },
    ocrResult: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  },
}))

vi.mock('nanoid', () => ({ nanoid: () => 'mock-nanoid-123' }))

import { prisma } from '../../lib/prisma.js'
import type { StorageService } from '../storage-service.js'

const mockStorageService: StorageService = {
  uploadFile: vi.fn().mockResolvedValue('receipts/app-1/mock-nanoid-123.pdf'),
  getSignedDownloadUrl: vi.fn().mockResolvedValue('https://signed-url.example.com/file'),
  deleteFile: vi.fn().mockResolvedValue(undefined),
}

function createMockFile(overrides?: {
  readonly name?: string
  readonly type?: string
  readonly size?: number
}) {
  return {
    name: overrides?.name ?? 'receipt.pdf',
    type: overrides?.type ?? 'application/pdf',
    size: overrides?.size ?? 1024,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(overrides?.size ?? 1024)),
  }
}

const memberId = 'member-1'
const otherMemberId = 'member-2'
const applicationId = 'app-1'
const receiptId = 'receipt-1'

const draftApplication = {
  id: applicationId,
  memberId,
  status: APPLICATION_STATUSES.DRAFT,
}

const returnedApplication = {
  id: applicationId,
  memberId,
  status: APPLICATION_STATUSES.RETURNED,
}

const submittedApplication = {
  id: applicationId,
  memberId,
  status: APPLICATION_STATUSES.SUBMITTED,
}

const otherMemberApplication = {
  id: applicationId,
  memberId: otherMemberId,
  status: APPLICATION_STATUSES.DRAFT,
}

const mockReceipt = {
  id: receiptId,
  expenseApplicationId: applicationId,
  fileName: 'receipt.pdf',
  filePath: 'receipts/app-1/mock-nanoid-123.pdf',
  fileSize: 1024,
  mimeType: 'application/pdf',
  ocrResult: null,
}

const mockReceiptWithApp = {
  ...mockReceipt,
  expenseApplication: draftApplication,
}

describe('ReceiptService', () => {
  let service: ReturnType<typeof createReceiptService>

  beforeEach(() => {
    vi.clearAllMocks()
    service = createReceiptService(mockStorageService)
  })

  describe('upload', () => {
    it('creates receipt with correct storage key', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(draftApplication as never)
      vi.mocked(prisma.receipt.count).mockResolvedValue(0 as never)
      vi.mocked(prisma.receipt.create).mockResolvedValue(mockReceipt as never)

      const file = createMockFile()
      const result = await service.upload(applicationId, memberId, file)

      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        'receipts/app-1/mock-nanoid-123.pdf',
        expect.any(Buffer),
        'application/pdf',
      )
      expect(prisma.receipt.create).toHaveBeenCalledWith({
        data: {
          expenseApplicationId: applicationId,
          fileName: 'receipt.pdf',
          filePath: 'receipts/app-1/mock-nanoid-123.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
        include: { ocrResult: true },
      })
      expect(result).toEqual(mockReceipt)
    })

    it('allows upload for RETURNED applications', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(returnedApplication as never)
      vi.mocked(prisma.receipt.count).mockResolvedValue(0 as never)
      vi.mocked(prisma.receipt.create).mockResolvedValue(mockReceipt as never)

      const file = createMockFile()
      await expect(service.upload(applicationId, memberId, file)).resolves.toBeDefined()
    })

    it('throws NOT_FOUND when application does not exist', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(null as never)

      const file = createMockFile()

      await expect(service.upload(applicationId, memberId, file)).rejects.toThrow(AppError)
      await expect(service.upload(applicationId, memberId, file)).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
      })
    })

    it('throws FORBIDDEN when member does not own the application', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(otherMemberApplication as never)

      const file = createMockFile()

      await expect(service.upload(applicationId, memberId, file)).rejects.toThrow(AppError)
      await expect(service.upload(applicationId, memberId, file)).rejects.toMatchObject({
        code: ERROR_CODES.FORBIDDEN,
        statusCode: 403,
      })
    })

    it('throws INVALID_STATUS_TRANSITION for SUBMITTED application', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(submittedApplication as never)

      const file = createMockFile()

      await expect(service.upload(applicationId, memberId, file)).rejects.toThrow(AppError)
      await expect(service.upload(applicationId, memberId, file)).rejects.toMatchObject({
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
        statusCode: 400,
      })
    })

    it('throws FILE_TOO_LARGE when file exceeds MAX_FILE_SIZE', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(draftApplication as never)

      const oversizedFile = createMockFile({ size: FILE_CONSTRAINTS.MAX_FILE_SIZE + 1 })

      await expect(service.upload(applicationId, memberId, oversizedFile)).rejects.toThrow(AppError)
      await expect(service.upload(applicationId, memberId, oversizedFile)).rejects.toMatchObject({
        code: ERROR_CODES.FILE_TOO_LARGE,
        statusCode: 400,
      })
    })

    it('throws UNSUPPORTED_FILE_TYPE for invalid MIME type', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(draftApplication as never)

      const badFile = createMockFile({ type: 'text/plain' })

      await expect(service.upload(applicationId, memberId, badFile)).rejects.toThrow(AppError)
      await expect(service.upload(applicationId, memberId, badFile)).rejects.toMatchObject({
        code: ERROR_CODES.UNSUPPORTED_FILE_TYPE,
        statusCode: 400,
      })
    })

    it('throws VALIDATION_ERROR when max files per application exceeded', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(draftApplication as never)
      vi.mocked(prisma.receipt.count).mockResolvedValue(FILE_CONSTRAINTS.MAX_FILES_PER_APPLICATION as never)

      const file = createMockFile()

      await expect(service.upload(applicationId, memberId, file)).rejects.toThrow(AppError)
      await expect(service.upload(applicationId, memberId, file)).rejects.toMatchObject({
        code: ERROR_CODES.VALIDATION_ERROR,
        statusCode: 400,
      })
    })

    it('generates storage key with correct format', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(draftApplication as never)
      vi.mocked(prisma.receipt.count).mockResolvedValue(0 as never)
      vi.mocked(prisma.receipt.create).mockResolvedValue(mockReceipt as never)

      const file = createMockFile({ name: 'photo.jpeg' })
      await service.upload(applicationId, memberId, file)

      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        'receipts/app-1/mock-nanoid-123.jpeg',
        expect.any(Buffer),
        'application/pdf',
      )
    })
  })

  describe('getSignedUrl', () => {
    it('returns signed URL and receipt', async () => {
      vi.mocked(prisma.receipt.findUnique).mockResolvedValue(mockReceiptWithApp as never)

      const result = await service.getSignedUrl(receiptId, memberId)

      expect(result.url).toBe('https://signed-url.example.com/file')
      expect(result.receipt).toEqual(mockReceiptWithApp)
      expect(mockStorageService.getSignedDownloadUrl).toHaveBeenCalledWith(
        'receipts/app-1/mock-nanoid-123.pdf',
      )
    })

    it('throws NOT_FOUND when receipt does not exist', async () => {
      vi.mocked(prisma.receipt.findUnique).mockResolvedValue(null as never)

      await expect(service.getSignedUrl(receiptId, memberId)).rejects.toThrow(AppError)
      await expect(service.getSignedUrl(receiptId, memberId)).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
      })
    })

    it('throws FORBIDDEN when member does not own the application', async () => {
      const receiptOtherMember = {
        ...mockReceipt,
        expenseApplication: otherMemberApplication,
      }
      vi.mocked(prisma.receipt.findUnique).mockResolvedValue(receiptOtherMember as never)

      await expect(service.getSignedUrl(receiptId, memberId)).rejects.toThrow(AppError)
      await expect(service.getSignedUrl(receiptId, memberId)).rejects.toMatchObject({
        code: ERROR_CODES.FORBIDDEN,
        statusCode: 403,
      })
    })
  })

  describe('triggerOcr', () => {
    it('sets OCR status to PROCESSING', async () => {
      vi.mocked(prisma.receipt.findUnique).mockResolvedValue(mockReceipt as never)
      const mockOcr = { receiptId, status: 'PROCESSING' }
      vi.mocked(prisma.ocrResult.upsert).mockResolvedValue(mockOcr as never)
      vi.mocked(prisma.ocrResult.findUnique).mockResolvedValue(mockOcr as never)

      const result = await service.triggerOcr(receiptId)

      expect(prisma.ocrResult.upsert).toHaveBeenCalledWith({
        where: { receiptId },
        create: { receiptId, status: 'PROCESSING' },
        update: { status: 'PROCESSING', errorMessage: null },
      })
      expect(result).toEqual(mockOcr)
    })

    it('throws NOT_FOUND when receipt does not exist', async () => {
      vi.mocked(prisma.receipt.findUnique).mockResolvedValue(null as never)

      await expect(service.triggerOcr(receiptId)).rejects.toThrow(AppError)
      await expect(service.triggerOcr(receiptId)).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
      })
    })
  })

  describe('updateOcrResult', () => {
    it('updates OCR result fields and sets status to COMPLETED', async () => {
      const existingOcr = { receiptId, status: 'PROCESSING' }
      vi.mocked(prisma.ocrResult.findUnique).mockResolvedValue(existingOcr as never)
      const updatedOcr = {
        receiptId,
        status: 'COMPLETED',
        extractedDate: '2024-01-15',
        extractedAmount: '5000',
        extractedStoreName: 'Test Store',
      }
      vi.mocked(prisma.ocrResult.update).mockResolvedValue(updatedOcr as never)

      const result = await service.updateOcrResult(receiptId, {
        extracted_date: '2024-01-15',
        extracted_amount: 5000,
        extracted_store_name: 'Test Store',
      })

      expect(prisma.ocrResult.update).toHaveBeenCalledWith({
        where: { receiptId },
        data: {
          status: 'COMPLETED',
          extractedDate: '2024-01-15',
          extractedAmount: '5000',
          extractedStoreName: 'Test Store',
        },
      })
      expect(result).toEqual(updatedOcr)
    })

    it('updates only provided fields', async () => {
      const existingOcr = { receiptId, status: 'PROCESSING' }
      vi.mocked(prisma.ocrResult.findUnique).mockResolvedValue(existingOcr as never)
      vi.mocked(prisma.ocrResult.update).mockResolvedValue({ ...existingOcr, status: 'COMPLETED' } as never)

      await service.updateOcrResult(receiptId, {
        extracted_amount: 3000,
      })

      expect(prisma.ocrResult.update).toHaveBeenCalledWith({
        where: { receiptId },
        data: {
          status: 'COMPLETED',
          extractedAmount: '3000',
        },
      })
    })

    it('throws NOT_FOUND when OCR result does not exist', async () => {
      vi.mocked(prisma.ocrResult.findUnique).mockResolvedValue(null as never)

      await expect(
        service.updateOcrResult(receiptId, { extracted_amount: 1000 }),
      ).rejects.toThrow(AppError)
      await expect(
        service.updateOcrResult(receiptId, { extracted_amount: 1000 }),
      ).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
      })
    })
  })

  describe('deleteReceipt', () => {
    it('deletes ocrResult, receipt, and storage file', async () => {
      vi.mocked(prisma.receipt.findUnique).mockResolvedValue(mockReceiptWithApp as never)

      await service.deleteReceipt(receiptId, memberId)

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
        'receipts/app-1/mock-nanoid-123.pdf',
      )
      expect(prisma.ocrResult.deleteMany).toHaveBeenCalledWith({
        where: { receiptId },
      })
      expect(prisma.receipt.delete).toHaveBeenCalledWith({
        where: { id: receiptId },
      })
    })

    it('throws FORBIDDEN when member does not own the application', async () => {
      const receiptOtherMember = {
        ...mockReceipt,
        expenseApplication: otherMemberApplication,
      }
      vi.mocked(prisma.receipt.findUnique).mockResolvedValue(receiptOtherMember as never)

      await expect(service.deleteReceipt(receiptId, memberId)).rejects.toThrow(AppError)
      await expect(service.deleteReceipt(receiptId, memberId)).rejects.toMatchObject({
        code: ERROR_CODES.FORBIDDEN,
        statusCode: 403,
      })
    })

    it('throws INVALID_STATUS_TRANSITION for SUBMITTED application', async () => {
      const receiptSubmitted = {
        ...mockReceipt,
        expenseApplication: submittedApplication,
      }
      vi.mocked(prisma.receipt.findUnique).mockResolvedValue(receiptSubmitted as never)

      await expect(service.deleteReceipt(receiptId, memberId)).rejects.toThrow(AppError)
      await expect(service.deleteReceipt(receiptId, memberId)).rejects.toMatchObject({
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
        statusCode: 400,
      })
    })

    it('throws NOT_FOUND when receipt does not exist', async () => {
      vi.mocked(prisma.receipt.findUnique).mockResolvedValue(null as never)

      await expect(service.deleteReceipt(receiptId, memberId)).rejects.toThrow(AppError)
      await expect(service.deleteReceipt(receiptId, memberId)).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        statusCode: 404,
      })
    })
  })
})
