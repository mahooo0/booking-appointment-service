export const APPOINTMENT_CONFIG = {
  verification: {
    codeLength: 6,
    expirationMinutes: 10,
    maxAttempts: 3,
    resendCooldownSeconds: 60,
  },
  appointmentNumber: {
    length: 6,
    maxRetries: 10,
  },
  exchanges: {
    appointmentEvents: 'appointment.events',
  },
  queues: {
    notificationService: 'notification-service',
  },
} as const;
