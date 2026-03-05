import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeclineAppointmentDto {
  @ApiProperty({ description: 'Reason for declining the appointment' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CancelAppointmentDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class CompanyNotesDto {
  @ApiPropertyOptional({ description: 'Company notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
