import {
  IsDateString,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderRepeat } from 'prisma/__generated__';

export class UpdateReminderDto {
  @ApiPropertyOptional({ description: 'Reminder title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Reminder date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ description: 'Reminder time (HH:mm)' })
  @IsString()
  @IsOptional()
  time?: string;

  @ApiPropertyOptional({ description: 'Comment' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ enum: ReminderRepeat })
  @IsEnum(ReminderRepeat)
  @IsOptional()
  repeat?: ReminderRepeat;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}
