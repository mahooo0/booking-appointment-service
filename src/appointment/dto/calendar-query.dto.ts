import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AppointmentStatus } from 'prisma/__generated__';

export enum CalendarView {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class CalendarQueryDto {
  @ApiProperty({
    enum: CalendarView,
    description: 'Calendar view mode',
    example: 'week',
  })
  @IsEnum(CalendarView)
  view: CalendarView;

  @ApiProperty({
    description: 'Reference date (YYYY-MM-DD)',
    example: '2026-04-10',
  })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Filter by branch ID' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Filter by specialist ID' })
  @IsString()
  @IsOptional()
  specialistId?: string;

  @ApiPropertyOptional({
    enum: AppointmentStatus,
    isArray: true,
    description: 'Filter by status',
  })
  @IsEnum(AppointmentStatus, { each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.includes(','))
      return value.split(',');
    if (value) return [value];
    return undefined;
  })
  status?: AppointmentStatus[];
}
