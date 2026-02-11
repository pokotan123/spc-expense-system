import type { PrismaClient } from '@prisma/client'
import type { EmailClient } from '../lib/email.js'

interface ApplicationInfo {
  readonly id: string
  readonly applicationNumber: string
  readonly amount: unknown
  readonly description: string
  readonly member: {
    readonly name: string
    readonly email: string
  }
}

function buildSubmissionHtml(app: ApplicationInfo): string {
  return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1a56db;">新規経費申請のお知らせ</h2>
  <p>新しい経費申請が提出されました。</p>
  <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">申請番号</td><td style="padding: 8px; border: 1px solid #ddd;">${app.applicationNumber}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">申請者</td><td style="padding: 8px; border: 1px solid #ddd;">${app.member.name}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">金額</td><td style="padding: 8px; border: 1px solid #ddd;">&yen;${Number(app.amount).toLocaleString()}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">内容</td><td style="padding: 8px; border: 1px solid #ddd;">${app.description}</td></tr>
  </table>
  <p>管理画面から確認・承認してください。</p>
</div>`
}

function buildApprovalHtml(app: ApplicationInfo): string {
  return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #059669;">経費申請が承認されました</h2>
  <p>${app.member.name} 様</p>
  <p>あなたの経費申請が承認されました。</p>
  <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">申請番号</td><td style="padding: 8px; border: 1px solid #ddd;">${app.applicationNumber}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">金額</td><td style="padding: 8px; border: 1px solid #ddd;">&yen;${Number(app.amount).toLocaleString()}</td></tr>
  </table>
</div>`
}

function buildReturnHtml(app: ApplicationInfo, comment: string): string {
  return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #d97706;">経費申請が差し戻されました</h2>
  <p>${app.member.name} 様</p>
  <p>あなたの経費申請が差し戻されました。内容を修正して再申請してください。</p>
  <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">申請番号</td><td style="padding: 8px; border: 1px solid #ddd;">${app.applicationNumber}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">差戻し理由</td><td style="padding: 8px; border: 1px solid #ddd;">${comment}</td></tr>
  </table>
</div>`
}

function buildRejectionHtml(app: ApplicationInfo, comment: string): string {
  return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc2626;">経費申請が却下されました</h2>
  <p>${app.member.name} 様</p>
  <p>あなたの経費申請が却下されました。</p>
  <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">申請番号</td><td style="padding: 8px; border: 1px solid #ddd;">${app.applicationNumber}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">却下理由</td><td style="padding: 8px; border: 1px solid #ddd;">${comment}</td></tr>
  </table>
</div>`
}

export function createNotificationService(
  prismaClient: PrismaClient,
  emailClient: EmailClient,
) {
  async function logNotification(
    type: 'SUBMISSION' | 'APPROVAL' | 'RETURN' | 'REJECTION',
    recipientEmail: string,
    applicationId: string,
    success: boolean,
    error?: string,
  ) {
    try {
      await prismaClient.notificationLog.create({
        data: {
          type,
          recipientEmail,
          applicationId,
          status: success ? 'SENT' : 'FAILED',
          error: error ?? null,
        },
      })
    } catch (logError) {
      console.error('[Notification] Failed to log notification:', logError)
    }
  }

  async function notifyApplicationSubmitted(app: ApplicationInfo) {
    try {
      const admins = await prismaClient.member.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { email: true },
      })

      if (admins.length === 0) return

      const emails = admins.map((a) => a.email)
      const result = await emailClient.sendEmail({
        to: emails,
        subject: `【SPC経費精算】新規経費申請 ${app.applicationNumber}`,
        html: buildSubmissionHtml(app),
      })

      for (const email of emails) {
        await logNotification('SUBMISSION', email, app.id, result.success, result.error)
      }
    } catch (error) {
      console.error('[Notification] Failed to send submission notification:', error)
    }
  }

  async function notifyApplicationApproved(app: ApplicationInfo) {
    try {
      const result = await emailClient.sendEmail({
        to: app.member.email,
        subject: `【SPC経費精算】申請 ${app.applicationNumber} が承認されました`,
        html: buildApprovalHtml(app),
      })

      await logNotification('APPROVAL', app.member.email, app.id, result.success, result.error)
    } catch (error) {
      console.error('[Notification] Failed to send approval notification:', error)
    }
  }

  async function notifyApplicationReturned(app: ApplicationInfo, comment: string) {
    try {
      const result = await emailClient.sendEmail({
        to: app.member.email,
        subject: `【SPC経費精算】申請 ${app.applicationNumber} が差し戻されました`,
        html: buildReturnHtml(app, comment),
      })

      await logNotification('RETURN', app.member.email, app.id, result.success, result.error)
    } catch (error) {
      console.error('[Notification] Failed to send return notification:', error)
    }
  }

  async function notifyApplicationRejected(app: ApplicationInfo, comment: string) {
    try {
      const result = await emailClient.sendEmail({
        to: app.member.email,
        subject: `【SPC経費精算】申請 ${app.applicationNumber} が却下されました`,
        html: buildRejectionHtml(app, comment),
      })

      await logNotification('REJECTION', app.member.email, app.id, result.success, result.error)
    } catch (error) {
      console.error('[Notification] Failed to send rejection notification:', error)
    }
  }

  return Object.freeze({
    notifyApplicationSubmitted,
    notifyApplicationApproved,
    notifyApplicationReturned,
    notifyApplicationRejected,
  })
}

export type NotificationService = ReturnType<typeof createNotificationService>
