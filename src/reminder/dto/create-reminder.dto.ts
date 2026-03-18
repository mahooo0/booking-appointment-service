import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderRepeat } from 'prisma/__generated__';

export class CreateReminderDto {
  @ApiProperty({ description: 'Reminder title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Reminder date (YYYY-MM-DD)', example: '2025-06-15' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ description: 'Reminder time (HH:mm)', example: '10:00' })
  @IsString()
  @IsOptional()
  time?: string;

  @ApiPropertyOptional({ description: 'Comment' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ enum: ReminderRepeat, default: ReminderRepeat.NONE })
  @IsEnum(ReminderRepeat)
  @IsOptional()
  repeat?: ReminderRepeat;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;
}
