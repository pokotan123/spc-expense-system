import { prisma } from '../lib/prisma.js'
import { AppError } from '../middleware/error-handler.js'
import { ERROR_CODES, OCR_STATUSES } from '@spc/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OcrResultData {
  readonly id: string
  readonly receiptId: string
  readonly extractedDate: string | null
  readonly extractedAmount: string | null
  readonly extractedStoreName: string | null
  readonly extractedText: string | null
  readonly confidence: number | null
  readonly status: string
  readonly createdAt: string
  readonly updatedAt: string
}

interface ParsedReceiptData {
  readonly date: string | null
  readonly amount: string | null
  readonly storeName: string | null
  readonly rawText: string
  readonly confidence: number
}

// ---------------------------------------------------------------------------
// OCR Provider interface (swap mock for real Google Cloud Vision)
// ---------------------------------------------------------------------------

interface OcrProvider {
  recognizeText(imageBuffer: ArrayBuffer): Promise<string>
}

function createMockOcrProvider(): OcrProvider {
  const mockTexts = [
    [
      'セブンイレブン 新宿西口店',
      '2024年12月15日',
      'おにぎり 鮭    ¥150',
      'お茶 500ml     ¥160',
      '小計           ¥310',
      '消費税(8%)     ¥24',
      '合計           ¥334',
      'お預かり       ¥500',
      'お釣り         ¥166',
    ].join('\n'),
    [
      'ローソン 渋谷駅前店',
      '2024/11/20',
      'サンドイッチ   ¥380',
      'コーヒー       ¥180',
      '合計           ¥560',
      'VISA           ¥560',
    ].join('\n'),
    [
      'ファミリーマート 東京タワー店',
      '令和6年10月5日',
      '弁当           ¥498',
      'ドリンク       ¥128',
      '小計           ¥626',
      '消費税(8%)     ¥50',
      '合計           ¥676',
    ].join('\n'),
  ] as const

  return Object.freeze({
    async recognizeText(_imageBuffer: ArrayBuffer): Promise<string> {
      const index = Math.floor(Math.random() * mockTexts.length)
      return mockTexts[index] ?? mockTexts[0]
    },
  })
}

// ---------------------------------------------------------------------------
// Japanese receipt text parsing helpers
// ---------------------------------------------------------------------------

function extractDate(text: string): string | null {
  // Pattern: YYYY年MM月DD日
  const jpPattern = /(\d{4})年(\d{1,2})月(\d{1,2})日/
  const jpMatch = text.match(jpPattern)
  if (jpMatch) {
    const [, year, month, day] = jpMatch
    return `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`
  }

  // Pattern: YYYY/MM/DD or YYYY-MM-DD
  const slashPattern = /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/
  const slashMatch = text.match(slashPattern)
  if (slashMatch) {
    const [, year, month, day] = slashMatch
    return `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`
  }

  // Pattern: 令和N年M月D日
  const reiwaPat = /令和(\d{1,2})年(\d{1,2})月(\d{1,2})日/
  const reiwaMatch = text.match(reiwaPat)
  if (reiwaMatch) {
    const [, reiwaYear, month, day] = reiwaMatch
    const year = 2018 + Number(reiwaYear)
    return `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`
  }

  return null
}

function extractAmount(text: string): string | null {
  // Look for 合計 (total) line first
  const totalPattern = /合計\s*[¥￥]?\s*([\d,]+)/
  const totalMatch = text.match(totalPattern)
  if (totalMatch?.[1]) {
    return totalMatch[1].replace(/,/g, '')
  }

  // Fallback: look for 小計 (subtotal)
  const subtotalPattern = /小計\s*[¥￥]?\s*([\d,]+)/
  const subtotalMatch = text.match(subtotalPattern)
  if (subtotalMatch?.[1]) {
    return subtotalMatch[1].replace(/,/g, '')
  }

  // Fallback: find largest ¥ amount
  const yenPattern = /[¥￥]\s*([\d,]+)/g
  let maxAmount = 0
  let match: RegExpExecArray | null = yenPattern.exec(text)
  while (match !== null) {
    const amount = parseInt(match[1]?.replace(/,/g, '') ?? '0', 10)
    if (amount > maxAmount) {
      maxAmount = amount
    }
    match = yenPattern.exec(text)
  }

  return maxAmount > 0 ? String(maxAmount) : null
}

function extractStoreName(text: string): string | null {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return lines.length > 0 ? (lines[0] ?? null) : null
}

function parseReceiptText(rawText: string): ParsedReceiptData {
  return Object.freeze({
    date: extractDate(rawText),
    amount: extractAmount(rawText),
    storeName: extractStoreName(rawText),
    rawText,
    confidence: 0.85,
  })
}

// ---------------------------------------------------------------------------
// Result mapper
// ---------------------------------------------------------------------------

function toOcrResultData(result: {
  id: string
  receiptId: string
  extractedDate: string | null
  extractedAmount: string | null
  extractedStoreName: string | null
  extractedText: string | null
  confidence: number | null
  status: string
  createdAt: Date
  updatedAt: Date
}): OcrResultData {
  return Object.freeze({
    id: result.id,
    receiptId: result.receiptId,
    extractedDate: result.extractedDate,
    extractedAmount: result.extractedAmount,
    extractedStoreName: result.extractedStoreName,
    extractedText: result.extractedText,
    confidence: result.confidence,
    status: result.status,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  })
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const ocrProvider: OcrProvider = createMockOcrProvider()

export function createOcrService() {
  async function processReceipt(receiptId: string): Promise<OcrResultData> {
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { ocrResult: true },
    })

    if (!receipt) {
      throw new AppError('Receipt not found', ERROR_CODES.NOT_FOUND, 404)
    }

    // Upsert OCR result with PROCESSING status
    await prisma.ocrResult.upsert({
      where: { receiptId },
      create: { receiptId, status: OCR_STATUSES.PROCESSING },
      update: { status: OCR_STATUSES.PROCESSING, errorMessage: null },
    })

    try {
      const rawText = await ocrProvider.recognizeText(new ArrayBuffer(0))
      const parsed = parseReceiptText(rawText)

      const result = await prisma.ocrResult.update({
        where: { receiptId },
        data: {
          extractedDate: parsed.date,
          extractedAmount: parsed.amount,
          extractedStoreName: parsed.storeName,
          extractedText: parsed.rawText,
          confidence: parsed.confidence,
          status: OCR_STATUSES.COMPLETED,
          errorMessage: null,
        },
      })

      return toOcrResultData(result)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown OCR error'

      const result = await prisma.ocrResult.update({
        where: { receiptId },
        data: {
          status: OCR_STATUSES.FAILED,
          errorMessage,
        },
      })

      return toOcrResultData(result)
    }
  }

  async function updateOcrResult(
    receiptId: string,
    memberId: string,
    data: {
      extracted_date?: string
      extracted_amount?: number
      extracted_store_name?: string
    },
  ): Promise<OcrResultData> {
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        expenseApplication: { select: { memberId: true } },
      },
    })

    if (!receipt || receipt.expenseApplication.memberId !== memberId) {
      throw new AppError('Receipt not found', ERROR_CODES.NOT_FOUND, 404)
    }

    const existing = await prisma.ocrResult.findUnique({
      where: { receiptId },
    })

    if (!existing) {
      throw new AppError(
        'OCR result not found. Run OCR processing first.',
        ERROR_CODES.NOT_FOUND,
        404,
      )
    }

    const updateData: Record<string, unknown> = {
      status: OCR_STATUSES.COMPLETED,
    }

    if (data.extracted_date !== undefined) {
      updateData.extractedDate = data.extracted_date
    }
    if (data.extracted_amount !== undefined) {
      updateData.extractedAmount = String(data.extracted_amount)
    }
    if (data.extracted_store_name !== undefined) {
      updateData.extractedStoreName = data.extracted_store_name
    }

    const result = await prisma.ocrResult.update({
      where: { receiptId },
      data: updateData,
    })

    return toOcrResultData(result)
  }

  return Object.freeze({ processReceipt, updateOcrResult })
}

export type OcrService = ReturnType<typeof createOcrService>
