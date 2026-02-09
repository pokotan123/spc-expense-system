/**
 * Zengin (全銀) format file generation service.
 *
 * Zengin format is a fixed-length 120-byte per record format used by Japanese
 * banks for electronic fund transfers. Records are encoded in Shift-JIS.
 *
 * Record types:
 *  - Header (1): Contains sender information, transfer date
 *  - Data (2): One per payment, contains recipient bank/account info
 *  - Trailer (8): Summary record with total count and amount
 *  - End (9): End-of-file marker
 */

import iconv from 'iconv-lite'

interface ZenginPaymentRecord {
  readonly recipientName: string
  readonly bankCode: string
  readonly branchCode: string
  readonly accountType: '1' | '2' // 1=普通, 2=当座
  readonly accountNumber: string
  readonly amount: number
}

interface ZenginHeaderParams {
  readonly senderCode: string
  readonly senderName: string
  readonly transferDate: Date
  readonly bankCode: string
  readonly branchCode: string
}

/**
 * Pad string with spaces on right to specified length (in byte units).
 * For Shift-JIS, full-width characters are 2 bytes each.
 * This implementation works with ASCII (half-width) only for simplicity;
 * full-width characters should be pre-converted to half-width kana.
 */
function padRight(str: string, length: number): string {
  if (str.length >= length) {
    return str.slice(0, length)
  }
  return str + ' '.repeat(length - str.length)
}

function padLeft(str: string, length: number, fillChar = '0'): string {
  if (str.length >= length) {
    return str.slice(0, length)
  }
  return fillChar.repeat(length - str.length) + str
}

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}${day}`
}

export function createZenginService() {
  function buildHeaderRecord(params: ZenginHeaderParams): string {
    const parts = [
      '1',                                        // Record type (1 byte)
      '21',                                       // Classification: 総合振込 (2 bytes)
      '0',                                        // Code classification (1 byte)
      padRight(params.senderCode, 10),             // Sender code (10 bytes)
      padRight(params.senderName, 40),             // Sender name (40 bytes)
      formatDate(params.transferDate),             // Transfer date MMDD (4 bytes)
      padLeft(params.bankCode, 4),                 // Sender bank code (4 bytes)
      padRight('', 15),                            // Sender bank name (15 bytes)
      padLeft(params.branchCode, 3),               // Sender branch code (3 bytes)
      padRight('', 15),                            // Sender branch name (15 bytes)
      '1',                                        // Account type: 普通 (1 byte)
      padLeft('', 7),                              // Account number (7 bytes)
    ]
    const record = parts.join('')
    // Pad to 120 bytes total
    return padRight(record, 120)
  }

  function buildDataRecord(payment: ZenginPaymentRecord): string {
    const parts = [
      '2',                                        // Record type (1 byte)
      padLeft(payment.bankCode, 4),                // Bank code (4 bytes)
      padRight('', 15),                            // Bank name (15 bytes)
      padLeft(payment.branchCode, 3),              // Branch code (3 bytes)
      padRight('', 15),                            // Branch name (15 bytes)
      '0000',                                     // Clearing house code (4 bytes)
      payment.accountType,                         // Account type (1 byte)
      padLeft(payment.accountNumber, 7),           // Account number (7 bytes)
      padRight(payment.recipientName, 30),          // Recipient name (30 bytes)
      padLeft(String(payment.amount), 10),          // Amount (10 bytes)
      '0',                                        // New code (1 byte)
      padRight('', 20),                            // EDI info (20 bytes)
    ]
    const record = parts.join('')
    return padRight(record, 120)
  }

  function buildTrailerRecord(
    totalCount: number,
    totalAmount: number,
  ): string {
    const parts = [
      '8',                                        // Record type (1 byte)
      padLeft(String(totalCount), 6),              // Total count (6 bytes)
      padLeft(String(totalAmount), 12),            // Total amount (12 bytes)
    ]
    const record = parts.join('')
    return padRight(record, 120)
  }

  function buildEndRecord(): string {
    return padRight('9', 120)
  }

  function generate(
    header: ZenginHeaderParams,
    payments: readonly ZenginPaymentRecord[],
  ): string {
    const records: string[] = [buildHeaderRecord(header)]

    let totalAmount = 0
    for (const payment of payments) {
      records.push(buildDataRecord(payment))
      totalAmount += payment.amount
    }

    records.push(buildTrailerRecord(payments.length, totalAmount))
    records.push(buildEndRecord())

    return records.join('\r\n')
  }

  function encodeToShiftJIS(content: string): Buffer {
    return iconv.encode(content, 'Shift_JIS')
  }

  return Object.freeze({ generate, encodeToShiftJIS })
}

export type ZenginService = ReturnType<typeof createZenginService>
