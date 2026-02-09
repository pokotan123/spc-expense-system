import { prisma } from '../lib/prisma.js'
import { AppError } from '../middleware/error-handler.js'
import {
  ERROR_CODES,
  FILE_CONSTRAINTS,
  APPLICATION_STATUSES,
} from '@spc/shared'
import type { StorageService } from './storage-service.js'
import { nanoid } from 'nanoid'

interface OcrUpdateInput {
  readonly extracted_date?: string
  readonly extracted_amount?: number
  readonly extracted_store_name?: string
}

export function createReceiptService(storageService: StorageService) {
  async function upload(
    applicationId: string,
    memberId: string,
    file: {
      readonly name: string
      readonly type: string
      readonly size: number
      readonly arrayBuffer: () => Promise<ArrayBuffer>
    },
  ) {
    const application = await prisma.expenseApplication.findUnique({
      where: { id: applicationId },
    })

    if (!application) {
      throw new AppError('Application not found', ERROR_CODES.NOT_FOUND, 404)
    }

    if (application.memberId !== memberId) {
      throw new AppError('Not authorized', ERROR_CODES.FORBIDDEN, 403)
    }

    if (
      application.status !== APPLICATION_STATUSES.DRAFT &&
      application.status !== APPLICATION_STATUSES.RETURNED
    ) {
      throw new AppError(
        'Can only upload receipts for DRAFT or RETURNED applications',
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        400,
      )
    }

    if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
      throw new AppError(
        `File size exceeds ${FILE_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
        ERROR_CODES.FILE_TOO_LARGE,
        400,
      )
    }

    const allowedTypes: readonly string[] = FILE_CONSTRAINTS.ALLOWED_MIME_TYPES
    if (!allowedTypes.includes(file.type)) {
      throw new AppError(
        `File type ${file.type} is not supported`,
        ERROR_CODES.UNSUPPORTED_FILE_TYPE,
        400,
      )
    }

    const existingCount = await prisma.receipt.count({
      where: { expenseApplicationId: applicationId },
    })

    if (existingCount >= FILE_CONSTRAINTS.MAX_FILES_PER_APPLICATION) {
      throw new AppError(
        `Maximum ${FILE_CONSTRAINTS.MAX_FILES_PER_APPLICATION} files per application`,
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const extension = file.name.split('.').pop() ?? 'bin'
    const key = `receipts/${applicationId}/${nanoid()}.${extension}`

    const buffer = Buffer.from(await file.arrayBuffer())
    await storageService.uploadFile(key, buffer, file.type)

    const receipt = await prisma.receipt.create({
      data: {
        expenseApplicationId: applicationId,
        fileName: file.name,
        filePath: key,
        fileSize: file.size,
        mimeType: file.type,
      },
      include: {
        ocrResult: true,
      },
    })

    return receipt
  }

  async function getSignedUrl(receiptId: string, memberId: string) {
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { expenseApplication: true },
    })

    if (!receipt) {
      throw new AppError('Receipt not found', ERROR_CODES.NOT_FOUND, 404)
    }

    if (receipt.expenseApplication.memberId !== memberId) {
      throw new AppError('Not authorized', ERROR_CODES.FORBIDDEN, 403)
    }

    const url = await storageService.getSignedDownloadUrl(receipt.filePath)
    return Object.freeze({ url, receipt })
  }

  async function triggerOcr(receiptId: string) {
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
    })

    if (!receipt) {
      throw new AppError('Receipt not found', ERROR_CODES.NOT_FOUND, 404)
    }

    await prisma.ocrResult.upsert({
      where: { receiptId },
      create: {
        receiptId,
        status: 'PROCESSING',
      },
      update: {
        status: 'PROCESSING',
        errorMessage: null,
      },
    })

    // OCR processing would be triggered asynchronously here
    // For now, mark as pending for external processing
    const ocrResult = await prisma.ocrResult.findUnique({
      where: { receiptId },
    })

    return ocrResult
  }

  async function updateOcrResult(receiptId: string, input: OcrUpdateInput) {
    const existing = await prisma.ocrResult.findUnique({
      where: { receiptId },
    })

    if (!existing) {
      throw new AppError('OCR result not found', ERROR_CODES.NOT_FOUND, 404)
    }

    const data: Record<string, unknown> = {
      status: 'COMPLETED',
    }

    if (input.extracted_date !== undefined) {
      data.extractedDate = input.extracted_date
    }
    if (input.extracted_amount !== undefined) {
      data.extractedAmount = String(input.extracted_amount)
    }
    if (input.extracted_store_name !== undefined) {
      data.extractedStoreName = input.extracted_store_name
    }

    const updated = await prisma.ocrResult.update({
      where: { receiptId },
      data,
    })

    return updated
  }

  async function deleteReceipt(
    receiptId: string,
    memberId: string,
  ) {
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { expenseApplication: true },
    })

    if (!receipt) {
      throw new AppError('Receipt not found', ERROR_CODES.NOT_FOUND, 404)
    }

    if (receipt.expenseApplication.memberId !== memberId) {
      throw new AppError('Not authorized', ERROR_CODES.FORBIDDEN, 403)
    }

    if (
      receipt.expenseApplication.status !== APPLICATION_STATUSES.DRAFT &&
      receipt.expenseApplication.status !== APPLICATION_STATUSES.RETURNED
    ) {
      throw new AppError(
        'Can only delete receipts for DRAFT or RETURNED applications',
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        400,
      )
    }

    await storageService.deleteFile(receipt.filePath)

    await prisma.ocrResult.deleteMany({ where: { receiptId } })
    await prisma.receipt.delete({ where: { id: receiptId } })
  }

  return Object.freeze({
    upload,
    getSignedUrl,
    triggerOcr,
    updateOcrResult,
    deleteReceipt,
  })
}

export type ReceiptService = ReturnType<typeof createReceiptService>
