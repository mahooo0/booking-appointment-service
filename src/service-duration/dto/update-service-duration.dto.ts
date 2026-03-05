import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateServiceDurationDto {
  @ApiPropertyOptional({ description: 'Duration in minutes', example: 90 })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Whether this duration is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
