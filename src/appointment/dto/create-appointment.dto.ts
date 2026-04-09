import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Service ID' })
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @ApiPropertyOptional({ description: 'Service variation ID' })
  @IsUUID()
  @IsOptional()
  serviceVariationId?: string;

  @ApiPropertyOptional({ description: 'Specialist ID (optional)' })
  @IsUUID()
  @IsOptional()
  specialistId?: string;

  @ApiProperty({ description: 'Branch ID' })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'Appointment name/title' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Appointment date (YYYY-MM-DD)', example: '2025-06-15' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Start time (HH:mm)', example: '10:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'End time (HH:mm)', example: '11:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ description: 'Client phone number for SMS verification' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'Client comment' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ description: 'Price' })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsNumber()
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Service name (for enriched responses)' })
  @IsString()
  @IsOptional()
  serviceName?: string;

  @ApiPropertyOptional({ description: 'Specialist first name (for enriched responses)' })
  @IsString()
  @IsOptional()
  specialistFirstName?: string;

  @ApiPropertyOptional({ description: 'Specialist last name (for enriched responses)' })
  @IsString()
  @IsOptional()
  specialistLastName?: string;

  @ApiPropertyOptional({ description: 'Branch address (for enriched responses)' })
  @IsString()
  @IsOptional()
  branchAddress?: string;
}
