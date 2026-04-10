import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from 'prisma/__generated__';

export class CalendarEventClientDto {
  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  userId?: string;
}

export class CalendarEventServiceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  price?: number;
}

export class CalendarEventSpecialistDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;
}

export class CalendarEventBranchDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  address?: string;
}

export class CalendarEventOrganizationDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  name?: string;
}

export class CalendarEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  appointmentNumber: string;

  @ApiProperty({ default: 'appointment' })
  type: string;

  @ApiProperty({ enum: AppointmentStatus })
  status: AppointmentStatus;

  @ApiProperty({ description: 'Date (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ description: 'Start time (HH:mm)' })
  startTime: string;

  @ApiProperty({ description: 'End time (HH:mm)' })
  endTime: string;

  @ApiPropertyOptional()
  durationMinutes?: number;

  @ApiProperty({ type: CalendarEventClientDto })
  client: CalendarEventClientDto;

  @ApiPropertyOptional({ type: CalendarEventServiceDto })
  service?: CalendarEventServiceDto;

  @ApiPropertyOptional({ type: CalendarEventSpecialistDto })
  specialist?: CalendarEventSpecialistDto;

  @ApiPropertyOptional({ type: CalendarEventBranchDto })
  branch?: CalendarEventBranchDto;

  @ApiPropertyOptional({ type: CalendarEventOrganizationDto })
  organization?: CalendarEventOrganizationDto;

  @ApiPropertyOptional()
  comment?: string;

  @ApiPropertyOptional()
  confirmedAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class CalendarDayDto {
  @ApiProperty({ description: 'Date (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ description: 'Day of week name' })
  dayOfWeek: string;

  @ApiProperty()
  eventsCount: number;

  @ApiProperty({ type: [CalendarEventDto] })
  events: CalendarEventDto[];
}

export class CalendarResponseDto {
  @ApiProperty()
  view: string;

  @ApiProperty({ description: 'Range start (YYYY-MM-DD)' })
  dateFrom: string;

  @ApiProperty({ description: 'Range end (YYYY-MM-DD)' })
  dateTo: string;

  @ApiProperty()
  totalEvents: number;

  @ApiProperty({ type: [CalendarDayDto] })
  days: CalendarDayDto[];
}
