import { Injectable } from '@nestjs/common';
import { Appointment } from 'prisma/__generated__';
import {
  AppointmentResponseDto,
  AppointmentListResponseDto,
} from '../dto/appointment-response.dto';

@Injectable()
export class AppointmentMapper {
  toResponseDto(appointment: Appointment): AppointmentResponseDto {
    return {
      id: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      userId: appointment.userId ?? undefined,
      serviceId: appointment.serviceId,
      serviceVariationId: appointment.serviceVariationId ?? undefined,
      specialistId: appointment.specialistId ?? undefined,
      branchId: appointment.branchId,
      organizationId: appointment.organizationId,
      serviceName: appointment.serviceName ?? undefined,
      specialistFirstName: appointment.specialistFirstName ?? undefined,
      specialistLastName: appointment.specialistLastName ?? undefined,
      branchAddress: appointment.branchAddress ?? undefined,
      name: appointment.name,
      clientPhone: appointment.clientPhone ?? undefined,
      date: this.formatDate(appointment.date),
      startTime: this.formatTime(appointment.startTime),
      endTime: this.formatTime(appointment.endTime),
      comment: appointment.comment ?? undefined,
      status: appointment.status,
      price: appointment.price ? Number(appointment.price) : undefined,
      durationMinutes: appointment.durationMinutes ?? undefined,
      companyNotes: appointment.companyNotes ?? undefined,
      declineReason: appointment.declineReason ?? undefined,
      cancellationReason: appointment.cancellationReason ?? undefined,
      cancelledBy: appointment.cancelledBy ?? undefined,
      rescheduledDate: appointment.rescheduledDate
        ? this.formatDate(appointment.rescheduledDate)
        : undefined,
      rescheduledStartTime: appointment.rescheduledStartTime
        ? this.formatTime(appointment.rescheduledStartTime)
        : undefined,
      rescheduledEndTime: appointment.rescheduledEndTime
        ? this.formatTime(appointment.rescheduledEndTime)
        : undefined,
      rescheduleComment: appointment.rescheduleComment ?? undefined,
      confirmedAt: appointment.confirmedAt ?? undefined,
      declinedAt: appointment.declinedAt ?? undefined,
      rescheduledAt: appointment.rescheduledAt ?? undefined,
      completedAt: appointment.completedAt ?? undefined,
      cancelledAt: appointment.cancelledAt ?? undefined,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }

  private formatDate(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  private formatTime(time: Date): string {
    return `${String(time.getUTCHours()).padStart(2, '0')}:${String(time.getUTCMinutes()).padStart(2, '0')}`;
  }

  toListResponseDto(
    appointments: Appointment[],
    total: number,
    page: number,
    limit: number,
  ): AppointmentListResponseDto {
    const totalPages = Math.ceil(total / limit);

    return {
      data: appointments.map((a) => this.toResponseDto(a)),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
