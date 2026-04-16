import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus, CancelledBy } from 'prisma/__generated__';

export class AppointmentServiceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;
}

export class AppointmentSpecialistDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiPropertyOptional()
  phone?: string;
}

export class AppointmentBranchDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  address?: string;
}

export class AppointmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  appointmentNumber: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional()
  serviceId?: string;

  @ApiPropertyOptional()
  serviceVariationId?: string;

  @ApiPropertyOptional()
  specialistId?: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  organizationId: string;

  @ApiPropertyOptional({ description: 'Service details', type: AppointmentServiceDto })
  service?: AppointmentServiceDto;

  @ApiPropertyOptional({ description: 'Specialist details', type: AppointmentSpecialistDto })
  specialist?: AppointmentSpecialistDto;

  @ApiPropertyOptional({ description: 'Branch details', type: AppointmentBranchDto })
  branch?: AppointmentBranchDto;

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

  @ApiProperty({ description: 'Whether the customer has left a review for this appointment' })
  hasCustomerReview: boolean;

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
