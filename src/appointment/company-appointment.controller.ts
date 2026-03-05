import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import { Permissions } from '@/common/decorators/permission.decorator';
import { AccountId } from '@/common/decorators/account-id.decorator';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import {
  DeclineAppointmentDto,
  CancelAppointmentDto,
  CompanyNotesDto,
} from './dto/decline-appointment.dto';
import {
  AppointmentResponseDto,
  AppointmentListResponseDto,
} from './dto/appointment-response.dto';

@ApiTags('Company Appointments')
@Controller('company/appointments')
export class CompanyAppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get()
  @Permissions(['appointments.view'], 'COMPANY')
  @ApiOperation({ summary: 'List branch appointments' })
  @ApiResponse({ status: 200, type: AppointmentListResponseDto })
  async list(
    @Query() query: AppointmentQueryDto,
  ): Promise<AppointmentListResponseDto> {
    return this.appointmentService.getCompanyAppointments(query);
  }

  @Get(':id')
  @Permissions(['appointments.view'], 'COMPANY')
  @ApiOperation({ summary: 'Get appointment detail' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async getById(
    @Param('id') id: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.getCompanyAppointmentById(id);
  }

  @Put(':id/accept')
  @Permissions(['appointments.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Accept appointment → CONFIRMED' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async accept(
    @Param('id') id: string,
    @AccountId() accountId: string,
    @Body() dto: CompanyNotesDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.accept(id, accountId, dto.notes);
  }

  @Put(':id/decline')
  @Permissions(['appointments.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Decline appointment → DECLINED' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async decline(
    @Param('id') id: string,
    @AccountId() accountId: string,
    @Body() dto: DeclineAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.decline(id, accountId, dto.reason);
  }

  @Put(':id/reschedule')
  @Permissions(['appointments.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Reschedule appointment → RESCHEDULED' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async reschedule(
    @Param('id') id: string,
    @AccountId() accountId: string,
    @Body() dto: RescheduleAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.reschedule(id, accountId, dto);
  }

  @Put(':id/client-arrived')
  @Permissions(['appointments.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Mark client arrived → COMPLETED' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async clientArrived(
    @Param('id') id: string,
    @AccountId() accountId: string,
    @Body() dto: CompanyNotesDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.clientArrived(id, accountId, dto.notes);
  }

  @Put(':id/no-show')
  @Permissions(['appointments.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Mark client no-show → CLIENT_NO_SHOW' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async noShow(
    @Param('id') id: string,
    @AccountId() accountId: string,
    @Body() dto: CompanyNotesDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.noShow(id, accountId, dto.notes);
  }

  @Put(':id/complete')
  @Permissions(['appointments.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Complete rescheduled appointment → COMPLETED' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async complete(
    @Param('id') id: string,
    @AccountId() accountId: string,
    @Body() dto: CompanyNotesDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.completeRescheduled(id, accountId, dto.notes);
  }

  @Put(':id/not-completed')
  @Permissions(['appointments.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Mark rescheduled as not completed → NOT_COMPLETED' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async notCompleted(
    @Param('id') id: string,
    @AccountId() accountId: string,
    @Body() dto: CompanyNotesDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.notCompleted(id, accountId, dto.notes);
  }

  @Put(':id/cancel')
  @Permissions(['appointments.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Cancel appointment (by company) → CANCELLED' })
  @ApiParam({ name: 'id', description: 'Appointment ID' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async cancel(
    @Param('id') id: string,
    @AccountId() accountId: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentService.cancelByCompany(id, accountId, dto.reason);
  }
}
