import { Injectable } from '@nestjs/common';
import { Reminder } from 'prisma/__generated__';
import {
  ReminderResponseDto,
  ReminderListResponseDto,
} from '../dto/reminder-response.dto';

@Injectable()
export class ReminderMapper {
  toResponseDto(reminder: Reminder): ReminderResponseDto {
    return {
      id: reminder.id,
      userId: reminder.userId,
      title: reminder.title,
      date: reminder.date,
      time: reminder.time ?? undefined,
      comment: reminder.comment ?? undefined,
      repeat: reminder.repeat,
      isFavorite: reminder.isFavorite,
      isCompleted: reminder.isCompleted,
      completedAt: reminder.completedAt ?? undefined,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
    };
  }

  toListResponseDto(
    reminders: Reminder[],
    total: number,
    page: number,
    limit: number,
  ): ReminderListResponseDto {
    const totalPages = Math.ceil(total / limit);

    return {
      data: reminders.map((r) => this.toResponseDto(r)),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
