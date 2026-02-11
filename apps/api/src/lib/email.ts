import { Resend } from 'resend'

interface SendEmailParams {
  readonly to: string | readonly string[]
  readonly subject: string
  readonly html: string
}

interface EmailClient {
  sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }>
}

export function createEmailClient(apiKey?: string, fromEmail?: string): EmailClient {
  const from = fromEmail ?? 'noreply@spc-expense.com'

  if (!apiKey) {
    return createConsoleEmailClient(from)
  }

  const resend = new Resend(apiKey)

  async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
    try {
      const recipients = Array.isArray(params.to) ? [...params.to] : [params.to]

      await resend.emails.send({
        from,
        to: recipients,
        subject: params.subject,
        html: params.html,
      })

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email error'
      return { success: false, error: message }
    }
  }

  return Object.freeze({ sendEmail })
}

function createConsoleEmailClient(from: string): EmailClient {
  async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
    const recipients = Array.isArray(params.to) ? params.to.join(', ') : params.to
    console.info(
      `[Email] From: ${from} | To: ${recipients} | Subject: ${params.subject}`,
    )
    return { success: true }
  }

  return Object.freeze({ sendEmail })
}

export type { EmailClient, SendEmailParams }
