import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { PrismaService } from '@/prisma/prisma.service';
import { UserId } from '@/common/decorators/user-id.decorator';
import { OptionalUserId } from '@/common/decorators/optional-user-id.decorator';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  RequestVerificationDto,
  ConfirmVerificationDto,
} from './dto/verify-code.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CalendarResponseDto } from './dto/calendar-response.dto';
import { CancelAppointmentDto } from './dto/decline-appointment.dto';
import {
  AppointmentResponseDto,
  AppointmentListResponseDto,
} from './dto/appointment-response.dto';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new appointment (guests allowed)' })
  @ApiResponse({ status: 201, type: AppointmentResponseDto })
  async create(
    @OptionalUserId() userId: string | null,
    @Body() dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.create(userId, dto);
  }

  @Post(':id/verify/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request SMS verification code' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async requestVerification(
    @Param('id') id: string,
    @OptionalUserId() userId: string | null,
    @Body() dto: RequestVerificationDto,
  ) {
    return this.appointmentService.requestVerification(id, dto.phone, userId);
  }

  @Post(':id/verify/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification code (rate limited 60s)' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async resendVerification(
    @Param('id') id: string,
    @OptionalUserId() userId: string | null,
  ) {
    return this.appointmentService.resendVerification(id, userId);
  }

  @Post(':id/verify/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm verification code → PENDING' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async confirmVerification(
    @Param('id') id: string,
    @OptionalUserId() userId: string | null,
    @Body() dto: ConfirmVerificationDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.confirmVerification(id, dto.code, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List user appointments (paginated)' })
  @ApiResponse({ status: 200, type: AppointmentListResponseDto })
  async list(
    @UserId() userId: string,
    @Query() query: AppointmentQueryDto,
  ): Promise<AppointmentListResponseDto> {
    return this.appointmentService.getUserAppointments(userId, query);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'User calendar (grouped by days)' })
  @ApiResponse({ status: 200, type: CalendarResponseDto })
  async calendar(
    @UserId() userId: string,
    @Query() query: CalendarQueryDto,
  ): Promise<CalendarResponseDto> {
    return this.appointmentService.getUserCalendar(userId, query);
  }

  @Get(':id/verify/debug')
  @ApiOperation({ summary: 'Get current verification code (dev only)' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  async getVerificationDebug(@Param('id') id: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Debug endpoint not available in production');
    }

    const verification = await this.prisma.appointmentVerification.findFirst({
      where: { appointmentId: id, isUsed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('No active verification code found');
    }

    return {
      code: verification.verificationCode,
      phone: verification.phone,
      expiresAt: verification.expiresAt,
      attemptsLeft: verification.attemptsLeft,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment detail' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async getById(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.getAppointmentById(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel appointment (by user)' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async cancel(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.cancelByUser(id, userId, dto.reason);
  }
}
