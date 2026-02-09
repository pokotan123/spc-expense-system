import { describe, it, expect } from 'vitest'
import { createZenginService } from '../zengin-service.js'

describe('ZenginService', () => {
  const service = createZenginService()

  const defaultHeader = {
    senderCode: 'SPC001',
    senderName: 'SPC TRADING CO',
    transferDate: new Date(2024, 11, 15), // Dec 15, 2024
    bankCode: '0001',
    branchCode: '001',
  }

  const defaultPayments = [
    {
      recipientName: 'TANAKA TARO',
      bankCode: '0005',
      branchCode: '012',
      accountType: '1' as const,
      accountNumber: '1234567',
      amount: 50000,
    },
    {
      recipientName: 'SUZUKI HANAKO',
      bankCode: '0009',
      branchCode: '003',
      accountType: '1' as const,
      accountNumber: '7654321',
      amount: 30000,
    },
  ]

  describe('generate', () => {
    it('generates correct number of lines (header + data + trailer + end)', () => {
      const result = service.generate(defaultHeader, defaultPayments)
      const lines = result.split('\r\n')
      // 1 header + 2 data + 1 trailer + 1 end = 5
      expect(lines).toHaveLength(5)
    })

    it('generates header record starting with "1"', () => {
      const result = service.generate(defaultHeader, defaultPayments)
      const lines = result.split('\r\n')
      expect(lines[0]?.[0]).toBe('1')
    })

    it('generates header record of 120 characters', () => {
      const result = service.generate(defaultHeader, defaultPayments)
      const lines = result.split('\r\n')
      expect(lines[0]?.length).toBe(120)
    })

    it('generates data records starting with "2"', () => {
      const result = service.generate(defaultHeader, defaultPayments)
      const lines = result.split('\r\n')
      expect(lines[1]?.[0]).toBe('2')
      expect(lines[2]?.[0]).toBe('2')
    })

    it('generates data records of 120 characters each', () => {
      const result = service.generate(defaultHeader, defaultPayments)
      const lines = result.split('\r\n')
      expect(lines[1]?.length).toBe(120)
      expect(lines[2]?.length).toBe(120)
    })

    it('generates trailer record starting with "8"', () => {
      const result = service.generate(defaultHeader, defaultPayments)
      const lines = result.split('\r\n')
      expect(lines[3]?.[0]).toBe('8')
    })

    it('generates trailer with correct totals', () => {
      const result = service.generate(defaultHeader, defaultPayments)
      const lines = result.split('\r\n')
      const trailer = lines[3]!
      // Record type "8" (1) + count "000002" (6) + amount "000000080000" (12)
      expect(trailer.slice(0, 1)).toBe('8')
      expect(trailer.slice(1, 7)).toBe('000002')
      expect(trailer.slice(7, 19)).toBe('000000080000')
    })

    it('generates end record starting with "9"', () => {
      const result = service.generate(defaultHeader, defaultPayments)
      const lines = result.split('\r\n')
      expect(lines[4]?.[0]).toBe('9')
    })

    it('generates end record of 120 characters', () => {
      const result = service.generate(defaultHeader, defaultPayments)
      const lines = result.split('\r\n')
      expect(lines[4]?.length).toBe(120)
    })

    it('zero-pads amount to 10 digits in data record', () => {
      const payments = [
        {
          recipientName: 'TEST',
          bankCode: '0001',
          branchCode: '001',
          accountType: '1' as const,
          accountNumber: '1234567',
          amount: 500,
        },
      ]
      const result = service.generate(defaultHeader, payments)
      const lines = result.split('\r\n')
      const dataRecord = lines[1]!
      // Amount field: after account type(1) + account number(7) + recipient name(30)
      // Position: 1(type) + 4(bank) + 15(bankName) + 3(branch) + 15(branchName) + 4(clearing) + 1(accType) + 7(accNum) + 30(name) = 80
      // Amount at position 80, length 10
      expect(dataRecord.slice(80, 90)).toBe('0000000500')
    })

    it('zero-pads bank code to 4 digits', () => {
      const payments = [
        {
          recipientName: 'TEST',
          bankCode: '5',
          branchCode: '001',
          accountType: '1' as const,
          accountNumber: '1234567',
          amount: 1000,
        },
      ]
      const result = service.generate(defaultHeader, payments)
      const lines = result.split('\r\n')
      const dataRecord = lines[1]!
      // Bank code starts at position 1 in data record, length 4
      expect(dataRecord.slice(1, 5)).toBe('0005')
    })

    it('right-pads recipient name with spaces', () => {
      const payments = [
        {
          recipientName: 'AB',
          bankCode: '0001',
          branchCode: '001',
          accountType: '1' as const,
          accountNumber: '1234567',
          amount: 1000,
        },
      ]
      const result = service.generate(defaultHeader, payments)
      const lines = result.split('\r\n')
      const dataRecord = lines[1]!
      // Recipient name starts at position 50, length 30
      const recipientField = dataRecord.slice(50, 80)
      expect(recipientField).toBe('AB' + ' '.repeat(28))
    })

    it('uses CRLF line endings', () => {
      const result = service.generate(defaultHeader, defaultPayments)
      expect(result).toContain('\r\n')
      expect(result).not.toContain('\r\n\r\n')
    })

    it('handles single payment correctly', () => {
      const singlePayment = [defaultPayments[0]!]
      const result = service.generate(defaultHeader, singlePayment)
      const lines = result.split('\r\n')
      expect(lines).toHaveLength(4) // header + 1 data + trailer + end
      const trailer = lines[2]!
      expect(trailer.slice(1, 7)).toBe('000001')
      expect(trailer.slice(7, 19)).toBe('000000050000')
    })

    it('handles empty payments array', () => {
      const result = service.generate(defaultHeader, [])
      const lines = result.split('\r\n')
      expect(lines).toHaveLength(3) // header + trailer + end
      const trailer = lines[1]!
      expect(trailer.slice(1, 7)).toBe('000000')
      expect(trailer.slice(7, 19)).toBe('000000000000')
    })
  })

  describe('encodeToShiftJIS', () => {
    it('returns a Buffer', () => {
      const result = service.encodeToShiftJIS('test')
      expect(Buffer.isBuffer(result)).toBe(true)
    })

    it('encodes ASCII text correctly', () => {
      const result = service.encodeToShiftJIS('ABC')
      expect(result.toString('ascii')).toBe('ABC')
    })
  })
})
