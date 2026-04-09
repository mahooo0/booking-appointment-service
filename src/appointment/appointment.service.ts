import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentStatus, CancelledBy } from 'prisma/__generated__';
import { PrismaService } from '@/prisma/prisma.service';
import { AppointmentRepository } from './repositories/appointment.repository';
import { AppointmentMapper } from './mappers/appointment.mapper';
import { AppointmentNumberService } from './services/appointment-number.service';
import { VerificationCodeService } from './services/verification-code.service';
import { StatusMachineService } from './services/status-machine.service';
import { AppointmentEventsService } from '@/events/services/appointment-events.service';
import { LogService } from '@/log/log.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import {
  AppointmentResponseDto,
  AppointmentListResponseDto,
} from './dto/appointment-response.dto';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: AppointmentRepository,
    private readonly mapper: AppointmentMapper,
    private readonly numberService: AppointmentNumberService,
    private readonly verificationService: VerificationCodeService,
    private readonly statusMachine: StatusMachineService,
    private readonly events: AppointmentEventsService,
    private readonly logger: LogService,
  ) {}

  // ─── User Actions ───────────────────────────────────────────

  async create(
    userId: string | null,
    dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appointmentNumber = await this.numberService.generateUniqueNumber();

    // Resolve enrichment data from local DB if not provided by client
    const enrichment = await this.resolveEnrichment(dto);

    const appointment = await this.repository.create({
      appointmentNumber,
      userId: userId ?? undefined,
      serviceId: dto.serviceId,
      serviceVariationId: dto.serviceVariationId,
      specialistId: dto.specialistId,
      branchId: dto.branchId,
      organizationId: dto.organizationId,
      name: dto.name,
      clientPhone: dto.phone,
      serviceName: enrichment.serviceName,
      specialistFirstName: enrichment.specialistFirstName,
      specialistLastName: enrichment.specialistLastName,
      branchAddress: enrichment.branchAddress,
      date: new Date(dto.date),
      startTime: this.parseTime(dto.startTime),
      endTime: this.parseTime(dto.endTime),
      comment: dto.comment,
      price: dto.price,
      durationMinutes: dto.durationMinutes,
      status: AppointmentStatus.PENDING_VERIFICATION,
      statusHistory: {
        create: {
          toStatus: AppointmentStatus.PENDING_VERIFICATION,
          changedBy: userId ?? 'guest',
        },
      },
    });

    this.logger.log(
      `Appointment created: ${appointment.id} (${appointmentNumber})`,
    );

    // Auto-send OTP on creation
    const verification = await this.verificationService.createVerification(
      appointment.id,
      dto.phone,
    );
    await this.events.sendVerificationSms(
      dto.phone,
      verification.verificationCode,
    );

    await this.events.publishCreated({
      appointmentId: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      userId: appointment.userId ?? undefined,
      serviceId: appointment.serviceId,
      serviceVariationId: appointment.serviceVariationId ?? undefined,
      branchId: appointment.branchId,
      organizationId: appointment.organizationId,
      name: appointment.name,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      price: appointment.price ? Number(appointment.price) : undefined,
      durationMinutes: appointment.durationMinutes ?? undefined,
      createdAt: appointment.createdAt,
    });

    const response = this.mapper.toResponseDto(appointment);
    return {
      ...response,
      verification: {
        expiresAt: verification.expiresAt,
        nextResendAt: verification.nextResendAt,
      },
    } as any;
  }

  async requestVerification(
    appointmentId: string,
    phone: string,
    userId: string | null,
  ) {
    const appointment = await this.getAppointmentOrThrow(appointmentId);
    if (appointment.userId) {
      this.ensureOwner(appointment.userId, userId);
    }

    if (appointment.status !== AppointmentStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Appointment is not pending verification');
    }

    const verification = await this.verificationService.createVerification(
      appointmentId,
      phone,
    );

    await this.events.sendVerificationSms(phone, verification.verificationCode);

    return {
      message: 'Verification code sent',
      expiresAt: verification.expiresAt,
      nextResendAt: verification.nextResendAt,
    };
  }

  async resendVerification(appointmentId: string, userId: string | null) {
    const appointment = await this.getAppointmentOrThrow(appointmentId);
    if (appointment.userId) {
      this.ensureOwner(appointment.userId, userId);
    }

    if (appointment.status !== AppointmentStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Appointment is not pending verification');
    }

    const verification =
      await this.verificationService.resendVerification(appointmentId);

    await this.events.sendVerificationSms(
      verification.phone,
      verification.verificationCode,
    );

    return {
      message: 'Verification code resent',
      expiresAt: verification.expiresAt,
      nextResendAt: verification.nextResendAt,
    };
  }

  async confirmVerification(
    appointmentId: string,
    code: string,
    userId: string | null,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.getAppointmentOrThrow(appointmentId);
    if (appointment.userId) {
      this.ensureOwner(appointment.userId, userId);
    }

    if (appointment.status !== AppointmentStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Appointment is not pending verification');
    }

    await this.verificationService.verifyCode(appointmentId, code);

    const updated = await this.repository.updateStatus(
      appointmentId,
      AppointmentStatus.PENDING,
      {},
      userId ?? 'guest',
      'Verification confirmed',
    );

    this.logger.log(`Appointment verified: ${appointmentId}`);

    await this.events.publishVerified({
      appointmentId: updated.id,
      appointmentNumber: updated.appointmentNumber,
      userId: updated.userId ?? undefined,
      branchId: updated.branchId,
      organizationId: updated.organizationId,
      name: updated.name,
      date: updated.date,
      startTime: updated.startTime,
      endTime: updated.endTime,
    });

    return this.mapper.toResponseDto(updated);
  }

  async getUserAppointments(
    userId: string,
    query: AppointmentQueryDto,
  ): Promise<AppointmentListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = this.repository.buildWhereClause({
      userId,
      ...query,
    });

    const skip = (page - 1) * limit;

    const { data, total } = await this.repository.findMany({
      where,
      skip,
      take: limit,
    });

    return this.mapper.toListResponseDto(data, total, page, limit);
  }

  async getAppointmentById(
    id: string,
    userId: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.getAppointmentOrThrow(id);
    this.ensureOwner(appointment.userId, userId);
    return this.mapper.toResponseDto(appointment);
  }

  async cancelByUser(
    id: string,
    userId: string,
    reason?: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.getAppointmentOrThrow(id);
    this.ensureOwner(appointment.userId, userId);

    this.statusMachine.validateTransition(
      appointment.status,
      AppointmentStatus.CANCELLED,
    );

    const updated = await this.repository.updateStatus(
      id,
      AppointmentStatus.CANCELLED,
      {
        cancelledBy: CancelledBy.CLIENT,
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
      userId,
      reason || 'Cancelled by client',
    );

    await this.events.publishCancelled({
      appointmentId: updated.id,
      appointmentNumber: updated.appointmentNumber,
      userId: updated.userId ?? undefined,
      branchId: updated.branchId,
      organizationId: updated.organizationId,
      cancelledBy: CancelledBy.CLIENT,
      cancellationReason: reason,
    });

    return this.mapper.toResponseDto(updated);
  }

  // ─── Company Actions ────────────────────────────────────────

  async getCompanyAppointments(
    query: AppointmentQueryDto,
  ): Promise<AppointmentListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = this.repository.buildWhereClause(query);

    // Exclude PENDING_VERIFICATION from company view by default
    if (!query.status?.length) {
      where.status = { not: AppointmentStatus.PENDING_VERIFICATION };
    }

    const skip = (page - 1) * limit;

    const { data, total } = await this.repository.findMany({
      where,
      skip,
      take: limit,
    });

    return this.mapper.toListResponseDto(data, total, page, limit);
  }

  async getCompanyAppointmentById(
    id: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.getAppointmentOrThrow(id);
    return this.mapper.toResponseDto(appointment);
  }

  async accept(
    id: string,
    changedBy: string,
    notes?: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.getAppointmentOrThrow(id);

    this.statusMachine.validateTransition(
      appointment.status,
      AppointmentStatus.CONFIRMED,
    );

    const updated = await this.repository.updateStatus(
      id,
      AppointmentStatus.CONFIRMED,
      {
        confirmedAt: new Date(),
        companyNotes: notes,
      },
      changedBy,
      'Accepted by company',
    );

    await this.events.publishConfirmed({
      appointmentId: updated.id,
      appointmentNumber: updated.appointmentNumber,
      userId: updated.userId ?? undefined,
      branchId: updated.branchId,
      organizationId: updated.organizationId,
      previousStatus: appointment.status,
      newStatus: AppointmentStatus.CONFIRMED,
      changedBy,
    });

    return this.mapper.toResponseDto(updated);
  }

  async decline(
    id: string,
    changedBy: string,
    reason: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.getAppointmentOrThrow(id);

    this.statusMachine.validateTransition(
      appointment.status,
      AppointmentStatus.DECLINED,
    );

    const updated = await this.repository.updateStatus(
      id,
      AppointmentStatus.DECLINED,
      {
        declineReason: reason,
        declinedAt: new Date(),
      },
      changedBy,
      reason,
    );

    await this.events.publishDeclined({
      appointmentId: updated.id,
      appointmentNumber: updated.appointmentNumber,
      userId: updated.userId ?? undefined,
      branchId: updated.branchId,
      organizationId: updated.organizationId,
      previousStatus: appointment.status,
      newStatus: AppointmentStatus.DECLINED,
      reason,
      changedBy,
    });

    return this.mapper.toResponseDto(updated);
  }

  async reschedule(
    id: string,
    changedBy: string,
    dto: RescheduleAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.getAppointmentOrThrow(id);

    this.statusMachine.validateTransition(
      appointment.status,
      AppointmentStatus.RESCHEDULED,
    );

    const updated = await this.repository.updateStatus(
      id,
      AppointmentStatus.RESCHEDULED,
      {
        rescheduledDate: new Date(dto.date),
        rescheduledStartTime: this.parseTime(dto.startTime),
        rescheduledEndTime: this.parseTime(dto.endTime),
        rescheduleComment: dto.comment,
        rescheduledAt: new Date(),
      },
      changedBy,
      dto.comment || 'Rescheduled by company',
    );

    await this.events.publishRescheduled({
      appointmentId: updated.id,
      appointmentNumber: updated.appointmentNumber,
      userId: updated.userId ?? undefined,
      branchId: updated.branchId,
      organizationId: updated.organizationId,
      newDate: dto.date,
      newStartTime: dto.startTime,
      newEndTime: dto.endTime,
      comment: dto.comment,
    });

    return this.mapper.toResponseDto(updated);
  }

  async clientArrived(
    id: string,
    changedBy: string,
    notes?: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.getAppointmentOrThrow(id);

    this.statusMachine.validateTransition(
      appointment.status,
      AppointmentStatus.COMPLETED,
    );

    const updated = await this.repository.updateStatus(
      id,
      AppointmentStatus.COMPLETED,
      {
        completedAt: new Date(),
        companyNotes: notes ?? appointment.companyNotes ?? undefined,
      },
      changedBy,
      'Client arrived - completed',
    );

    await this.events.publishCompleted({
      appointmentId: updated.id,
      appointmentNumber: updated.appointmentNumber,
      userId: updated.userId ?? undefined,
      branchId: updated.branchId,
      organizationId: updated.organizationId,
      previousStatus: appointment.status,
      newStatus: AppointmentStatus.COMPLETED,
      changedBy,
    });

    return this.mapper.toResponseDto(updated);
  }

  async noShow(
    id: string,
    changedBy: string,
    notes?: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.getAppointmentOrThrow(id);

    this.statusMachine.validateTransition(
      appointment.status,
      AppointmentStatus.CLIENT_NO_SHOW,
    );

    const updated = await this.repository.updateStatus(
      id,
      AppointmentStatus.CLIENT_NO_SHOW,
      {
        companyNotes: notes ?? appointment.companyNotes ?? undefined,
      },
      changedBy,
      'Client no-show',
    );

    await this.events.publishNoShow({
      appointmentId: updated.id,
      appointmentNumber: updated.appointmentNumber,
      userId: updated.userId ?? undefined,
      branchId: updated.branchId,
      organizationId: updated.organizationId,
      previousStatus: appointment.status,
      newStatus: AppointmentStatus.CLIENT_NO_SHOW,
      changedBy,
    });

    return this.mapper.toResponseDto(updated);
  }

  async completeRescheduled(
    id: string,
    changedBy: string,
    notes?: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.getAppointmentOrThrow(id);

    this.statusMachine.validateTransition(
      appointment.status,
      AppointmentStatus.COMPLETED,
    );

    const updated = await this.repository.updateStatus(
      id,
      AppointmentStatus.COMPLETED,
      {
        completedAt: new Date(),
        companyNotes: notes ?? appointment.companyNotes ?? undefined,
      },
      changedBy,
      'Rescheduled appointment completed',
    );

    await this.events.publishCompleted({
      appointmentId: updated.id,
      appointmentNumber: updated.appointmentNumber,
      userId: updated.userId ?? undefined,
      branchId: updated.branchId,
      organizationId: updated.organizationId,
      previousStatus: appointment.status,
      newStatus: AppointmentStatus.COMPLETED,
      changedBy,
    });

    return this.mapper.toResponseDto(updated);
  }

  async notCompleted(
    id: string,
    changedBy: string,
    notes?: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.getAppointmentOrThrow(id);

    this.statusMachine.validateTransition(
      appointment.status,
      AppointmentStatus.NOT_COMPLETED,
    );

    const updated = await this.repository.updateStatus(
      id,
      AppointmentStatus.NOT_COMPLETED,
      {
        companyNotes: notes ?? appointment.companyNotes ?? undefined,
      },
      changedBy,
      'Not completed',
    );

    return this.mapper.toResponseDto(updated);
  }

  async cancelByCompany(
    id: string,
    changedBy: string,
    reason?: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.getAppointmentOrThrow(id);

    this.statusMachine.validateTransition(
      appointment.status,
      AppointmentStatus.CANCELLED,
    );

    const updated = await this.repository.updateStatus(
      id,
      AppointmentStatus.CANCELLED,
      {
        cancelledBy: CancelledBy.COMPANY,
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
      changedBy,
      reason || 'Cancelled by company',
    );

    await this.events.publishCancelled({
      appointmentId: updated.id,
      appointmentNumber: updated.appointmentNumber,
      userId: updated.userId ?? undefined,
      branchId: updated.branchId,
      organizationId: updated.organizationId,
      cancelledBy: CancelledBy.COMPANY,
      cancellationReason: reason,
    });

    return this.mapper.toResponseDto(updated);
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async getAppointmentOrThrow(id: string) {
    const appointment = await this.repository.findById(id);
    if (!appointment) {
      throw new NotFoundException(`Appointment not found`);
    }
    return appointment;
  }

  private ensureOwner(
    appointmentUserId: string | null,
    requestUserId: string | null,
  ) {
    if (!appointmentUserId || !requestUserId) return;
    if (appointmentUserId !== requestUserId) {
      throw new BadRequestException('You do not own this appointment');
    }
  }

  private parseTime(time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(1970, 0, 1, hours, minutes, 0, 0);
    return date;
  }

  private async resolveEnrichment(dto: CreateAppointmentDto): Promise<{
    serviceName?: string;
    specialistFirstName?: string;
    specialistLastName?: string;
    branchAddress?: string;
  }> {
    const result: {
      serviceName?: string;
      specialistFirstName?: string;
      specialistLastName?: string;
      branchAddress?: string;
    } = {};

    // Use DTO values if provided, otherwise resolve from local DB
    if (dto.serviceName) {
      result.serviceName = dto.serviceName;
    } else {
      try {
        const service = await this.prisma.service.findUnique({
          where: { id: dto.serviceId },
          select: { name: true },
        });
        if (service) result.serviceName = service.name;
      } catch {
        // Non-critical, skip enrichment
      }
    }

    if (dto.specialistFirstName) {
      result.specialistFirstName = dto.specialistFirstName;
      result.specialistLastName = dto.specialistLastName;
    } else if (dto.specialistId) {
      try {
        const specialist = await this.prisma.specialist.findUnique({
          where: { id: dto.specialistId },
          select: { firstName: true, lastName: true },
        });
        if (specialist) {
          result.specialistFirstName = specialist.firstName;
          result.specialistLastName = specialist.lastName;
        }
      } catch {
        // Non-critical, skip enrichment
      }
    }

    if (dto.branchAddress) {
      result.branchAddress = dto.branchAddress;
    } else {
      try {
        const location = await this.prisma.location.findUnique({
          where: { id: dto.branchId },
          select: { address: true },
        });
        if (location?.address) result.branchAddress = location.address;
      } catch {
        // Non-critical, skip enrichment
      }
    }

    return result;
  }
}
