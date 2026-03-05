import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RescheduleAppointmentDto {
  @ApiProperty({ description: 'New date (YYYY-MM-DD)', example: '2025-06-20' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'New start time (HH:mm)', example: '14:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'New end time (HH:mm)', example: '15:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({ description: 'Reschedule comment' })
  @IsString()
  @IsOptional()
  comment?: string;
}
