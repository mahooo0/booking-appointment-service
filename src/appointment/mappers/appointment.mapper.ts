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
      userId: appointment.userId,
      serviceId: appointment.serviceId,
      serviceVariationId: appointment.serviceVariationId ?? undefined,
      branchId: appointment.branchId,
      organizationId: appointment.organizationId,
      name: appointment.name,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      comment: appointment.comment ?? undefined,
      status: appointment.status,
      price: appointment.price ? Number(appointment.price) : undefined,
      durationMinutes: appointment.durationMinutes ?? undefined,
      companyNotes: appointment.companyNotes ?? undefined,
      declineReason: appointment.declineReason ?? undefined,
      cancellationReason: appointment.cancellationReason ?? undefined,
      cancelledBy: appointment.cancelledBy ?? undefined,
      rescheduledDate: appointment.rescheduledDate ?? undefined,
      rescheduledStartTime: appointment.rescheduledStartTime ?? undefined,
      rescheduledEndTime: appointment.rescheduledEndTime ?? undefined,
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
