import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AppointmentStatus, CancelledBy, Prisma } from 'prisma/__generated__';

@Injectable()
export class AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AppointmentCreateInput) {
    return this.prisma.appointment.create({
      data,
      include: { statusHistory: true },
    });
  }

  async findById(id: string) {
    return this.prisma.appointment.findFirst({
      where: { id, isDeleted: false },
      include: { statusHistory: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async findByIdOrThrow(id: string) {
    const appointment = await this.findById(id);
    if (!appointment) {
      throw new Error(`Appointment with id ${id} not found`);
    }
    return appointment;
  }

  async findByNumber(appointmentNumber: string) {
    return this.prisma.appointment.findFirst({
      where: { appointmentNumber, isDeleted: false },
      include: { statusHistory: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async findMany(params: {
    where?: Prisma.AppointmentWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.AppointmentOrderByWithRelationInput;
  }) {
    const { where, skip, take, orderBy } = params;
    const baseWhere: Prisma.AppointmentWhereInput = {
      ...where,
      isDeleted: false,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where: baseWhere,
        skip,
        take,
        orderBy: orderBy || { createdAt: 'desc' },
        include: { statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
      this.prisma.appointment.count({ where: baseWhere }),
    ]);

    return { data, total };
  }

  async updateStatus(
    id: string,
    status: AppointmentStatus,
    extra: Partial<{
      companyNotes: string;
      declineReason: string;
      cancellationReason: string;
      cancelledBy: CancelledBy;
      rescheduledDate: Date;
      rescheduledStartTime: Date;
      rescheduledEndTime: Date;
      rescheduleComment: string;
      confirmedAt: Date;
      declinedAt: Date;
      rescheduledAt: Date;
      completedAt: Date;
      cancelledAt: Date;
    }> = {},
    changedBy?: string,
    reason?: string,
  ) {
    const appointment = await this.findByIdOrThrow(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: { status, ...extra },
        include: { statusHistory: { orderBy: { createdAt: 'desc' } } },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus: status,
          changedBy,
          reason,
        },
      });

      return updated;
    });
  }

  async softDelete(id: string) {
    return this.prisma.appointment.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  buildWhereClause(params: {
    userId?: string;
    status?: AppointmentStatus[];
    branchId?: string;
    organizationId?: string;
    serviceId?: string;
    specialistId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Prisma.AppointmentWhereInput {
    const where: Prisma.AppointmentWhereInput = {};

    if (params.userId) where.userId = params.userId;
    if (params.status?.length) where.status = { in: params.status };
    if (params.branchId) where.branchId = params.branchId;
    if (params.organizationId) where.organizationId = params.organizationId;
    if (params.serviceId) where.serviceId = params.serviceId;
    if (params.specialistId) where.specialistId = params.specialistId;

    if (params.dateFrom || params.dateTo) {
      where.date = {};
      if (params.dateFrom) where.date.gte = new Date(params.dateFrom);
      if (params.dateTo) where.date.lte = new Date(params.dateTo);
    }

    if (params.search) {
      where.appointmentNumber = { contains: params.search, mode: 'insensitive' };
    }

    return where;
  }
}
