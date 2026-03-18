import { IsOptional, IsString, IsInt, Min, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ReminderCategory {
  ALL = 'all',
  TODAY = 'today',
  FAVORITES = 'favorites',
  COMPLETED = 'completed',
}

export class ReminderQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: ReminderCategory, default: ReminderCategory.ALL })
  @IsEnum(ReminderCategory)
  @IsOptional()
  category?: ReminderCategory;

  @ApiPropertyOptional({ description: 'Search by title' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter from date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;
}
