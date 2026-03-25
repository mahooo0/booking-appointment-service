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

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  clientPhone?: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

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

  @ApiPropertyOptional()
  rescheduledDate?: Date;

  @ApiPropertyOptional()
  rescheduledStartTime?: Date;

  @ApiPropertyOptional()
  rescheduledEndTime?: Date;

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
