import { Injectable } from '@nestjs/common';
import { RabbitmqService } from '@/rabbitmq/rabbitmq.service';
import { LogService } from '@/log/log.service';
import { APPOINTMENT_CONFIG } from '@/config/appointment.config';
import {
  AppointmentCreatedEvent,
  AppointmentVerifiedEvent,
  AppointmentStatusChangedEvent,
  AppointmentCancelledEvent,
  AppointmentRescheduledEvent,
  NotificationMessage,
} from '../interfaces/appointment-events.interface';

@Injectable()
export class AppointmentEventsService {
  private readonly exchange = APPOINTMENT_CONFIG.exchanges.appointmentEvents;
  private readonly notificationQueue = APPOINTMENT_CONFIG.queues.notificationService;

  constructor(
    private readonly rabbitmq: RabbitmqService,
    private readonly logger: LogService,
  ) {}

  async publishCreated(event: AppointmentCreatedEvent) {
    await this.publishEvent('appointment.created', event);
  }

  async publishVerified(event: AppointmentVerifiedEvent) {
    await this.publishEvent('appointment.verified', event);

    // Notify company about new appointment
    await this.sendNotification({
      type: 'appointment.verified',
      title: 'Нова заявка на послугу',
      message: `Нова заявка #${event.appointmentNumber} на "${event.name}"`,
      data: {
        appointmentId: event.appointmentId,
        appointmentNumber: event.appointmentNumber,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
      },
      branchId: event.branchId,
      channels: ['SMS', 'WEBSOCKET'],
      priority: 'HIGH',
    });
  }

  async publishConfirmed(event: AppointmentStatusChangedEvent) {
    await this.publishEvent('appointment.confirmed', event);

    // Notify user
    await this.sendNotification({
      type: 'appointment.confirmed',
      title: 'Заявку підтверджено',
      message: `Вашу заявку #${event.appointmentNumber} підтверджено`,
      data: {
        appointmentId: event.appointmentId,
        appointmentNumber: event.appointmentNumber,
      },
      userId: event.userId,
      channels: ['WEBSOCKET'],
      priority: 'HIGH',
    });
  }

  async publishDeclined(event: AppointmentStatusChangedEvent) {
    await this.publishEvent('appointment.declined', event);

    await this.sendNotification({
      type: 'appointment.declined',
      title: 'Заявку відхилено',
      message: `Вашу заявку #${event.appointmentNumber} відхилено${event.reason ? ': ' + event.reason : ''}`,
      data: {
        appointmentId: event.appointmentId,
        appointmentNumber: event.appointmentNumber,
        reason: event.reason,
      },
      userId: event.userId,
      channels: ['WEBSOCKET'],
      priority: 'HIGH',
    });
  }

  async publishRescheduled(event: AppointmentRescheduledEvent) {
    await this.publishEvent('appointment.rescheduled', event);

    await this.sendNotification({
      type: 'appointment.rescheduled',
      title: 'Заявку перенесено',
      message: `Вашу заявку #${event.appointmentNumber} перенесено на ${event.newDate} ${event.newStartTime}`,
      data: {
        appointmentId: event.appointmentId,
        appointmentNumber: event.appointmentNumber,
        newDate: event.newDate,
        newStartTime: event.newStartTime,
        newEndTime: event.newEndTime,
        comment: event.comment,
      },
      userId: event.userId,
      channels: ['WEBSOCKET'],
      priority: 'HIGH',
    });
  }

  async publishCompleted(event: AppointmentStatusChangedEvent) {
    await this.publishEvent('appointment.completed', event);
  }

  async publishNoShow(event: AppointmentStatusChangedEvent) {
    await this.publishEvent('appointment.no_show', event);
  }

  async publishCancelled(event: AppointmentCancelledEvent) {
    await this.publishEvent('appointment.cancelled', event);

    if (event.cancelledBy === 'CLIENT') {
      // Notify company
      await this.sendNotification({
        type: 'appointment.cancelled',
        title: 'Заявку скасовано клієнтом',
        message: `Заявку #${event.appointmentNumber} скасовано клієнтом${event.cancellationReason ? ': ' + event.cancellationReason : ''}`,
        data: {
          appointmentId: event.appointmentId,
          appointmentNumber: event.appointmentNumber,
          cancelledBy: event.cancelledBy,
        },
        branchId: event.branchId,
        channels: ['WEBSOCKET'],
        priority: 'MEDIUM',
      });
    } else {
      // Notify user
      await this.sendNotification({
        type: 'appointment.cancelled',
        title: 'Заявку скасовано',
        message: `Вашу заявку #${event.appointmentNumber} скасовано компанією${event.cancellationReason ? ': ' + event.cancellationReason : ''}`,
        data: {
          appointmentId: event.appointmentId,
          appointmentNumber: event.appointmentNumber,
          cancelledBy: event.cancelledBy,
        },
        userId: event.userId,
        channels: ['WEBSOCKET'],
        priority: 'HIGH',
      });
    }
  }

  private async publishEvent(routingKey: string, event: any) {
    try {
      await this.rabbitmq.publishFanoutExchange(this.exchange, routingKey, {
        event: routingKey,
        data: event,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`Event published: ${routingKey}`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${routingKey}:`, error);
    }
  }

  private async sendNotification(notification: NotificationMessage) {
    try {
      await this.rabbitmq.publishToQueue(this.notificationQueue, notification);
      this.logger.log(`Notification sent: ${notification.type}`);
    } catch (error) {
      this.logger.error(
        `Failed to send notification ${notification.type}:`,
        error,
      );
    }
  }

  async sendVerificationSms(phone: string, code: string) {
    try {
      await this.rabbitmq.publishToQueue(this.notificationQueue, {
        type: 'notification',
        title: 'Код підтвердження',
        message: `Ваш код підтвердження запису: ${code}`,
        channels: ['SMS'],
        recipients: { phone },
        priority: 'URGENT',
      });
      this.logger.log(`Verification SMS sent to ${phone}`);
    } catch (error) {
      this.logger.error(`Failed to send verification SMS:`, error);
    }
  }
}
