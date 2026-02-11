import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createNotificationService } from '../notification-service.js'
import type { EmailClient } from '../../lib/email.js'

function createMockEmailClient(): EmailClient & {
  sendEmail: ReturnType<typeof vi.fn>
} {
  return {
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
  }
}

function createMockPrisma() {
  return {
    member: {
      findMany: vi.fn().mockResolvedValue([
        { email: 'admin1@example.com' },
        { email: 'admin2@example.com' },
      ]),
    },
    notificationLog: {
      create: vi.fn().mockResolvedValue({ id: 'log-1' }),
    },
  } as unknown as Parameters<typeof createNotificationService>[0]
}

const mockApp = Object.freeze({
  id: 'app-1',
  applicationNumber: 'EXP-2024-001',
  amount: 15000,
  description: '交通費',
  member: Object.freeze({
    name: '田中太郎',
    email: 'tanaka@example.com',
  }),
})

describe('NotificationService', () => {
  let emailClient: ReturnType<typeof createMockEmailClient>
  let mockPrisma: ReturnType<typeof createMockPrisma>
  let service: ReturnType<typeof createNotificationService>

  beforeEach(() => {
    emailClient = createMockEmailClient()
    mockPrisma = createMockPrisma()
    service = createNotificationService(mockPrisma, emailClient)
  })

  describe('notifyApplicationSubmitted', () => {
    it('should send email to all admin users', async () => {
      await service.notifyApplicationSubmitted(mockApp)

      expect(mockPrisma.member.findMany).toHaveBeenCalledWith({
        where: { role: 'ADMIN', isActive: true },
        select: { email: true },
      })

      expect(emailClient.sendEmail).toHaveBeenCalledWith({
        to: ['admin1@example.com', 'admin2@example.com'],
        subject: '【SPC経費精算】新規経費申請 EXP-2024-001',
        html: expect.stringContaining('新規経費申請のお知らせ'),
      })
    })

    it('should include application details in email body', async () => {
      await service.notifyApplicationSubmitted(mockApp)

      const call = emailClient.sendEmail.mock.calls[0][0]
      expect(call.html).toContain('EXP-2024-001')
      expect(call.html).toContain('田中太郎')
      expect(call.html).toContain('15,000')
      expect(call.html).toContain('交通費')
    })

    it('should log notification for each admin', async () => {
      await service.notifyApplicationSubmitted(mockApp)

      expect(mockPrisma.notificationLog.create).toHaveBeenCalledTimes(2)
      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
        data: {
          type: 'SUBMISSION',
          recipientEmail: 'admin1@example.com',
          applicationId: 'app-1',
          status: 'SENT',
          error: null,
        },
      })
    })

    it('should not send email when no admins exist', async () => {
      ;(mockPrisma.member.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      await service.notifyApplicationSubmitted(mockApp)

      expect(emailClient.sendEmail).not.toHaveBeenCalled()
    })

    it('should log FAILED status when email fails', async () => {
      emailClient.sendEmail.mockResolvedValue({
        success: false,
        error: 'SMTP error',
      })

      await service.notifyApplicationSubmitted(mockApp)

      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'FAILED',
          error: 'SMTP error',
        }),
      })
    })

    it('should not throw when email sending throws', async () => {
      emailClient.sendEmail.mockRejectedValue(new Error('Network error'))

      await expect(
        service.notifyApplicationSubmitted(mockApp),
      ).resolves.toBeUndefined()
    })
  })

  describe('notifyApplicationApproved', () => {
    it('should send email to applicant', async () => {
      await service.notifyApplicationApproved(mockApp)

      expect(emailClient.sendEmail).toHaveBeenCalledWith({
        to: 'tanaka@example.com',
        subject: '【SPC経費精算】申請 EXP-2024-001 が承認されました',
        html: expect.stringContaining('承認されました'),
      })
    })

    it('should log notification', async () => {
      await service.notifyApplicationApproved(mockApp)

      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
        data: {
          type: 'APPROVAL',
          recipientEmail: 'tanaka@example.com',
          applicationId: 'app-1',
          status: 'SENT',
          error: null,
        },
      })
    })

    it('should not throw on failure', async () => {
      emailClient.sendEmail.mockRejectedValue(new Error('fail'))

      await expect(
        service.notifyApplicationApproved(mockApp),
      ).resolves.toBeUndefined()
    })
  })

  describe('notifyApplicationReturned', () => {
    it('should send email with return reason', async () => {
      await service.notifyApplicationReturned(mockApp, '領収書が不鮮明です')

      expect(emailClient.sendEmail).toHaveBeenCalledWith({
        to: 'tanaka@example.com',
        subject: '【SPC経費精算】申請 EXP-2024-001 が差し戻されました',
        html: expect.stringContaining('領収書が不鮮明です'),
      })
    })

    it('should include return-specific content in email', async () => {
      await service.notifyApplicationReturned(mockApp, '修正してください')

      const call = emailClient.sendEmail.mock.calls[0][0]
      expect(call.html).toContain('差し戻されました')
      expect(call.html).toContain('修正してください')
    })

    it('should log notification as RETURN type', async () => {
      await service.notifyApplicationReturned(mockApp, '理由')

      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'RETURN',
        }),
      })
    })
  })

  describe('notifyApplicationRejected', () => {
    it('should send email with rejection reason', async () => {
      await service.notifyApplicationRejected(mockApp, '規定外の経費です')

      expect(emailClient.sendEmail).toHaveBeenCalledWith({
        to: 'tanaka@example.com',
        subject: '【SPC経費精算】申請 EXP-2024-001 が却下されました',
        html: expect.stringContaining('規定外の経費です'),
      })
    })

    it('should include rejection-specific content in email', async () => {
      await service.notifyApplicationRejected(mockApp, '却下理由')

      const call = emailClient.sendEmail.mock.calls[0][0]
      expect(call.html).toContain('却下されました')
      expect(call.html).toContain('却下理由')
    })

    it('should log notification as REJECTION type', async () => {
      await service.notifyApplicationRejected(mockApp, '理由')

      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'REJECTION',
        }),
      })
    })

    it('should handle logging failure gracefully', async () => {
      ;(mockPrisma.notificationLog.create as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('DB error'),
      )

      await expect(
        service.notifyApplicationRejected(mockApp, '理由'),
      ).resolves.toBeUndefined()
    })
  })
})
