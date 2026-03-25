import { AppointmentStatus, CancelledBy } from 'prisma/__generated__';

export interface AppointmentCreatedEvent {
  appointmentId: string;
  appointmentNumber: string;
  userId?: string;
  serviceId: string;
  serviceVariationId?: string;
  branchId: string;
  organizationId: string;
  name: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  price?: number;
  durationMinutes?: number;
  createdAt: Date;
}

export interface AppointmentVerifiedEvent {
  appointmentId: string;
  appointmentNumber: string;
  userId?: string;
  branchId: string;
  organizationId: string;
  name: string;
  date: Date;
  startTime: Date;
  endTime: Date;
}

export interface AppointmentStatusChangedEvent {
  appointmentId: string;
  appointmentNumber: string;
  userId?: string;
  branchId: string;
  organizationId: string;
  previousStatus: AppointmentStatus;
  newStatus: AppointmentStatus;
  reason?: string;
  changedBy?: string;
}

export interface AppointmentCancelledEvent {
  appointmentId: string;
  appointmentNumber: string;
  userId?: string;
  branchId: string;
  organizationId: string;
  cancelledBy: CancelledBy;
  cancellationReason?: string;
}

export interface AppointmentRescheduledEvent {
  appointmentId: string;
  appointmentNumber: string;
  userId?: string;
  branchId: string;
  organizationId: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  comment?: string;
}

export interface NotificationMessage {
  type: string;
  title: string;
  message: string;
  data?: any;
  userId?: string;
  accountId?: string;
  organizationId?: string;
  branchId?: string;
  channels?: string[];
  recipients?: {
    email?: string;
    phone?: string;
    telegramId?: string;
    viberId?: string;
    deviceToken?: string;
  };
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  metadata?: Record<string, any>;
}
