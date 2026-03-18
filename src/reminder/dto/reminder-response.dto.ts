import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderRepeat } from 'prisma/__generated__';

export class ReminderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  date: Date;

  @ApiPropertyOptional()
  time?: Date;

  @ApiPropertyOptional()
  comment?: string;

  @ApiProperty({ enum: ReminderRepeat })
  repeat: ReminderRepeat;

  @ApiProperty()
  isFavorite: boolean;

  @ApiProperty()
  isCompleted: boolean;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ReminderListResponseDto {
  @ApiProperty({ type: [ReminderResponseDto] })
  data: ReminderResponseDto[];

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
