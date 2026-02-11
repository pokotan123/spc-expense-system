import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEmailClient } from '../email.js'

vi.mock('resend', () => {
  const mockSend = vi.fn().mockResolvedValue({ data: { id: 'email-1' } })
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: { send: mockSend },
    })),
  }
})

describe('createEmailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('console fallback (no API key)', () => {
    it('should log to console when no API key provided', async () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const client = createEmailClient()

      const result = await client.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      })

      expect(result.success).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com'),
      )
      consoleSpy.mockRestore()
    })

    it('should handle array recipients', async () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const client = createEmailClient()

      const result = await client.sendEmail({
        to: ['a@example.com', 'b@example.com'],
        subject: 'Test',
        html: '<p>Hello</p>',
      })

      expect(result.success).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('a@example.com, b@example.com'),
      )
      consoleSpy.mockRestore()
    })
  })

  describe('Resend client (with API key)', () => {
    it('should send email via Resend SDK', async () => {
      const client = createEmailClient('re_test_key', 'noreply@test.com')

      const result = await client.sendEmail({
        to: 'user@example.com',
        subject: 'Subject',
        html: '<p>Body</p>',
      })

      expect(result.success).toBe(true)
    })

    it('should return error on Resend failure', async () => {
      const { Resend } = await import('resend')
      const mockResend = new Resend('key') as { emails: { send: ReturnType<typeof vi.fn> } }
      mockResend.emails.send.mockRejectedValueOnce(new Error('API rate limited'))

      const client = createEmailClient('re_test_key')

      const result = await client.sendEmail({
        to: 'user@example.com',
        subject: 'Subject',
        html: '<p>Body</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('API rate limited')
    })
  })
})
