import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OCR_STATUSES } from '@spc/shared'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    receipt: { findUnique: vi.fn() },
    ocrResult: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('../../middleware/error-handler.js', () => ({
  AppError: class AppError extends Error {
    readonly code: string
    readonly statusCode: number
    constructor(message: string, code: string, statusCode: number) {
      super(message)
      this.name = 'AppError'
      this.code = code
      this.statusCode = statusCode
    }
  },
}))

import { prisma } from '../../lib/prisma.js'
import { createOcrService } from '../ocr-service.js'

const mockReceipt = prisma.receipt as { findUnique: ReturnType<typeof vi.fn> }
const mockOcrResult = prisma.ocrResult as {
  findUnique: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

function makeOcrResultRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ocr-1',
    receiptId: 'receipt-1',
    extractedDate: null,
    extractedAmount: null,
    extractedStoreName: null,
    extractedText: null,
    confidence: null,
    status: OCR_STATUSES.COMPLETED,
    errorMessage: null,
    createdAt: new Date('2024-12-01T00:00:00Z'),
    updatedAt: new Date('2024-12-01T00:00:00Z'),
    ...overrides,
  }
}

describe('OcrService', () => {
  const service = createOcrService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('processReceipt', () => {
    it('successfully processes receipt and returns COMPLETED result', async () => {
      mockReceipt.findUnique.mockResolvedValue({
        id: 'receipt-1',
        ocrResult: null,
      })
      mockOcrResult.upsert.mockResolvedValue(
        makeOcrResultRow({ status: OCR_STATUSES.PROCESSING }),
      )
      mockOcrResult.update.mockResolvedValue(
        makeOcrResultRow({
          status: OCR_STATUSES.COMPLETED,
          extractedDate: '2024-12-15',
          extractedAmount: '334',
          extractedStoreName: 'セブンイレブン 新宿西口店',
          extractedText: 'mock text',
          confidence: 0.85,
        }),
      )

      const result = await service.processReceipt('receipt-1')

      expect(result.status).toBe(OCR_STATUSES.COMPLETED)
      expect(result.confidence).toBe(0.85)
      expect(result.receiptId).toBe('receipt-1')

      // Verify upsert was called with PROCESSING status
      expect(mockOcrResult.upsert).toHaveBeenCalledWith({
        where: { receiptId: 'receipt-1' },
        create: { receiptId: 'receipt-1', status: OCR_STATUSES.PROCESSING },
        update: { status: OCR_STATUSES.PROCESSING, errorMessage: null },
      })

      // Verify update was called with COMPLETED status and extracted data
      expect(mockOcrResult.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { receiptId: 'receipt-1' },
          data: expect.objectContaining({
            status: OCR_STATUSES.COMPLETED,
            confidence: 0.85,
          }),
        }),
      )
    })

    it('throws NOT_FOUND when receipt does not exist', async () => {
      mockReceipt.findUnique.mockResolvedValue(null)

      await expect(service.processReceipt('nonexistent')).rejects.toThrow(
        'Receipt not found',
      )
    })

    it('handles OCR provider error and sets FAILED status', async () => {
      mockReceipt.findUnique.mockResolvedValue({
        id: 'receipt-1',
        ocrResult: null,
      })
      mockOcrResult.upsert.mockResolvedValue(
        makeOcrResultRow({ status: OCR_STATUSES.PROCESSING }),
      )
      // First update call (from recognizeText success path) should throw
      // to simulate the OCR provider failing. We need to make the update
      // on the first call (COMPLETED path) throw, then succeed on FAILED path.
      // Actually, the recognizeText mock is random. Let's mock the first
      // update to throw, simulating the OCR provider returning but the update
      // itself failing (which triggers catch block).
      mockOcrResult.update
        .mockRejectedValueOnce(new Error('OCR processing failed'))
        .mockResolvedValueOnce(
          makeOcrResultRow({
            status: OCR_STATUSES.FAILED,
            errorMessage: 'OCR processing failed',
          }),
        )

      const result = await service.processReceipt('receipt-1')

      expect(result.status).toBe(OCR_STATUSES.FAILED)
      // Verify the second update was called with FAILED status
      expect(mockOcrResult.update).toHaveBeenCalledTimes(2)
      expect(mockOcrResult.update).toHaveBeenLastCalledWith({
        where: { receiptId: 'receipt-1' },
        data: {
          status: OCR_STATUSES.FAILED,
          errorMessage: 'OCR processing failed',
        },
      })
    })

    it('extracts data from receipt text and stores it', async () => {
      mockReceipt.findUnique.mockResolvedValue({
        id: 'receipt-1',
        ocrResult: null,
      })
      mockOcrResult.upsert.mockResolvedValue(
        makeOcrResultRow({ status: OCR_STATUSES.PROCESSING }),
      )
      // The update mock captures the data argument so we can inspect parsed values
      mockOcrResult.update.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeOcrResultRow({
          status: args.data.status,
          extractedDate: args.data.extractedDate,
          extractedAmount: args.data.extractedAmount,
          extractedStoreName: args.data.extractedStoreName,
          extractedText: args.data.extractedText,
          confidence: args.data.confidence,
        })
      })

      await service.processReceipt('receipt-1')

      // The mock OCR provider returns one of three random receipts.
      // All should have a valid date, amount, and store name extracted.
      const updateCall = mockOcrResult.update.mock.calls[0]![0]
      const updateData = updateCall.data

      expect(updateData.status).toBe(OCR_STATUSES.COMPLETED)
      expect(updateData.confidence).toBe(0.85)
      expect(updateData.extractedDate).toBeTruthy()
      expect(updateData.extractedAmount).toBeTruthy()
      expect(updateData.extractedStoreName).toBeTruthy()
      expect(updateData.extractedText).toBeTruthy()
      expect(updateData.errorMessage).toBeNull()
    })

    it('extracts store name from the first line of text', async () => {
      mockReceipt.findUnique.mockResolvedValue({
        id: 'receipt-1',
        ocrResult: null,
      })
      mockOcrResult.upsert.mockResolvedValue(
        makeOcrResultRow({ status: OCR_STATUSES.PROCESSING }),
      )
      mockOcrResult.update.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeOcrResultRow(args.data)
      })

      await service.processReceipt('receipt-1')

      const updateData = mockOcrResult.update.mock.calls[0]![0].data
      // The mock provider always returns receipts where the first line is a store name
      const possibleStoreNames = [
        'セブンイレブン 新宿西口店',
        'ローソン 渋谷駅前店',
        'ファミリーマート 東京タワー店',
      ]
      expect(possibleStoreNames).toContain(updateData.extractedStoreName)
    })

    it('always sets confidence to 0.85', async () => {
      mockReceipt.findUnique.mockResolvedValue({
        id: 'receipt-1',
        ocrResult: null,
      })
      mockOcrResult.upsert.mockResolvedValue(
        makeOcrResultRow({ status: OCR_STATUSES.PROCESSING }),
      )
      mockOcrResult.update.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeOcrResultRow(args.data)
      })

      await service.processReceipt('receipt-1')

      const updateData = mockOcrResult.update.mock.calls[0]![0].data
      expect(updateData.confidence).toBe(0.85)
    })

    it('extracts valid dates from all mock receipt formats', async () => {
      mockReceipt.findUnique.mockResolvedValue({
        id: 'receipt-1',
        ocrResult: null,
      })
      mockOcrResult.upsert.mockResolvedValue(
        makeOcrResultRow({ status: OCR_STATUSES.PROCESSING }),
      )
      mockOcrResult.update.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeOcrResultRow(args.data)
      })

      await service.processReceipt('receipt-1')

      const updateData = mockOcrResult.update.mock.calls[0]![0].data
      // All three mock receipts produce valid dates:
      // "2024年12月15日" -> "2024-12-15"
      // "2024/11/20" -> "2024-11-20"
      // "令和6年10月5日" -> "2024-10-05"
      const validDates = ['2024-12-15', '2024-11-20', '2024-10-05']
      expect(validDates).toContain(updateData.extractedDate)
    })

    it('extracts valid amounts from all mock receipt formats', async () => {
      mockReceipt.findUnique.mockResolvedValue({
        id: 'receipt-1',
        ocrResult: null,
      })
      mockOcrResult.upsert.mockResolvedValue(
        makeOcrResultRow({ status: OCR_STATUSES.PROCESSING }),
      )
      mockOcrResult.update.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return makeOcrResultRow(args.data)
      })

      await service.processReceipt('receipt-1')

      const updateData = mockOcrResult.update.mock.calls[0]![0].data
      // All three mock receipts have 合計 amounts:
      // "合計 ¥334", "合計 ¥560", "合計 ¥676"
      const validAmounts = ['334', '560', '676']
      expect(validAmounts).toContain(updateData.extractedAmount)
    })

    it('returns data in correct OcrResultData shape with ISO dates', async () => {
      mockReceipt.findUnique.mockResolvedValue({
        id: 'receipt-1',
        ocrResult: null,
      })
      mockOcrResult.upsert.mockResolvedValue(
        makeOcrResultRow({ status: OCR_STATUSES.PROCESSING }),
      )
      mockOcrResult.update.mockResolvedValue(
        makeOcrResultRow({
          status: OCR_STATUSES.COMPLETED,
          extractedDate: '2024-12-15',
          extractedAmount: '334',
          extractedStoreName: 'Test Store',
          extractedText: 'raw text',
          confidence: 0.85,
        }),
      )

      const result = await service.processReceipt('receipt-1')

      expect(result).toEqual(
        expect.objectContaining({
          id: 'ocr-1',
          receiptId: 'receipt-1',
          status: OCR_STATUSES.COMPLETED,
          createdAt: '2024-12-01T00:00:00.000Z',
          updatedAt: '2024-12-01T00:00:00.000Z',
        }),
      )
    })
  })

  describe('updateOcrResult', () => {
    it('updates OCR result successfully', async () => {
      mockReceipt.findUnique.mockResolvedValue({
        id: 'receipt-1',
        expenseApplication: { memberId: 'member-1' },
      })
      mockOcrResult.findUnique.mockResolvedValue(makeOcrResultRow())
      mockOcrResult.update.mockResolvedValue(
        makeOcrResultRow({
          extractedDate: '2024-12-20',
          extractedAmount: '5000',
          extractedStoreName: 'Updated Store',
          status: OCR_STATUSES.COMPLETED,
        }),
      )

      const result = await service.updateOcrResult('receipt-1', 'member-1', {
        extracted_date: '2024-12-20',
        extracted_amount: 5000,
        extracted_store_name: 'Updated Store',
      })

      expect(result.status).toBe(OCR_STATUSES.COMPLETED)
      expect(mockOcrResult.update).toHaveBeenCalledWith({
        where: { receiptId: 'receipt-1' },
        data: expect.objectContaining({
          status: OCR_STATUSES.COMPLETED,
          extractedDate: '2024-12-20',
          extractedAmount: '5000',
          extractedStoreName: 'Updated Store',
        }),
      })
    })

    it('throws NOT_FOUND when receipt does not exist', async () => {
      mockReceipt.findUnique.mockResolvedValue(null)

      await expect(
        service.updateOcrResult('nonexistent', 'member-1', {}),
      ).rejects.toThrow('Receipt not found')
    })

    it('throws NOT_FOUND when member does not own the receipt', async () => {
      mockReceipt.findUnique.mockResolvedValue({
        id: 'receipt-1',
        expenseApplication: { memberId: 'other-member' },
      })

      await expect(
        service.updateOcrResult('receipt-1', 'member-1', {}),
      ).rejects.toThrow('Receipt not found')
    })

    it('throws NOT_FOUND when OCR result does not exist', async () => {
      mockReceipt.findUnique.mockResolvedValue({
        id: 'receipt-1',
        expenseApplication: { memberId: 'member-1' },
      })
      mockOcrResult.findUnique.mockResolvedValue(null)

      await expect(
        service.updateOcrResult('receipt-1', 'member-1', {}),
      ).rejects.toThrow('OCR result not found. Run OCR processing first.')
    })
  })
})
