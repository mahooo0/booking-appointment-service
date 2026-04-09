import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus, CancelledBy } from 'prisma/__generated__';

export class AppointmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  appointmentNumber: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiProperty()
  serviceId: string;

  @ApiPropertyOptional()
  serviceVariationId?: string;

  @ApiPropertyOptional()
  specialistId?: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional({ description: 'Service name' })
  serviceName?: string;

  @ApiPropertyOptional({ description: 'Specialist first name' })
  specialistFirstName?: string;

  @ApiPropertyOptional({ description: 'Specialist last name' })
  specialistLastName?: string;

  @ApiPropertyOptional({ description: 'Branch address' })
  branchAddress?: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  clientPhone?: string;

  @ApiProperty({ description: 'Date (YYYY-MM-DD)', example: '2026-04-11' })
  date: string;

  @ApiProperty({ description: 'Start time (HH:mm)', example: '14:00' })
  startTime: string;

  @ApiProperty({ description: 'End time (HH:mm)', example: '15:00' })
  endTime: string;

  @ApiPropertyOptional()
  comment?: string;

  @ApiProperty({ enum: AppointmentStatus })
  status: AppointmentStatus;

  @ApiPropertyOptional()
  price?: number;

  @ApiPropertyOptional()
  durationMinutes?: number;

  @ApiPropertyOptional()
  companyNotes?: string;

  @ApiPropertyOptional()
  declineReason?: string;

  @ApiPropertyOptional()
  cancellationReason?: string;

  @ApiPropertyOptional({ enum: CancelledBy })
  cancelledBy?: CancelledBy;

  @ApiPropertyOptional({ description: 'Rescheduled date (YYYY-MM-DD)', example: '2026-04-12' })
  rescheduledDate?: string;

  @ApiPropertyOptional({ description: 'Rescheduled start time (HH:mm)', example: '14:00' })
  rescheduledStartTime?: string;

  @ApiPropertyOptional({ description: 'Rescheduled end time (HH:mm)', example: '15:00' })
  rescheduledEndTime?: string;

  @ApiPropertyOptional()
  rescheduleComment?: string;

  @ApiPropertyOptional()
  confirmedAt?: Date;

  @ApiPropertyOptional()
  declinedAt?: Date;

  @ApiPropertyOptional()
  rescheduledAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AppointmentListResponseDto {
  @ApiProperty({ type: [AppointmentResponseDto] })
  data: AppointmentResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrev: boolean;
}
