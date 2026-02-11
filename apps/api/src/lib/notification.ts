import { prisma } from './prisma.js'
import { createEmailClient } from './email.js'
import { createNotificationService } from '../services/notification-service.js'

const globalForNotification = globalThis as unknown as {
  notificationService: ReturnType<typeof createNotificationService> | undefined
}

function getNotificationService() {
  if (globalForNotification.notificationService) {
    return globalForNotification.notificationService
  }

  const emailClient = createEmailClient(
    process.env.RESEND_API_KEY,
    process.env.NOTIFICATION_FROM_EMAIL,
  )

  const service = createNotificationService(prisma, emailClient)

  if (process.env.NODE_ENV !== 'production') {
    globalForNotification.notificationService = service
  }

  return service
}

export { getNotificationService }
