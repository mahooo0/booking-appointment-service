import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ReminderRepeat } from 'prisma/__generated__';
import { ReminderRepository } from './repositories/reminder.repository';
import { ReminderMapper } from './mappers/reminder.mapper';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { ReminderQueryDto } from './dto/reminder-query.dto';
import {
  ReminderResponseDto,
  ReminderListResponseDto,
} from './dto/reminder-response.dto';

@Injectable()
export class ReminderService {
  constructor(
    private readonly repository: ReminderRepository,
    private readonly mapper: ReminderMapper,
  ) {}

  async create(
    userId: string,
    dto: CreateReminderDto,
  ): Promise<ReminderResponseDto> {
    const reminder = await this.repository.create({
      userId,
      title: dto.title,
      date: new Date(dto.date),
      time: dto.time ? this.parseTime(dto.time) : null,
      comment: dto.comment,
      repeat: dto.repeat ?? ReminderRepeat.NONE,
      isFavorite: dto.isFavorite ?? false,
    });

    return this.mapper.toResponseDto(reminder);
  }

  async getList(
    userId: string,
    query: ReminderQueryDto,
  ): Promise<ReminderListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = this.repository.buildWhereClause({
      userId,
      category: query.category,
      search: query.search,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    const skip = (page - 1) * limit;

    const { data, total } = await this.repository.findMany({
      where,
      skip,
      take: limit,
    });

    return this.mapper.toListResponseDto(data, total, page, limit);
  }

  async getById(
    id: string,
    userId: string,
  ): Promise<ReminderResponseDto> {
    const reminder = await this.getReminderOrThrow(id);
    this.ensureOwner(reminder.userId, userId);
    return this.mapper.toResponseDto(reminder);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateReminderDto,
  ): Promise<ReminderResponseDto> {
    const reminder = await this.getReminderOrThrow(id);
    this.ensureOwner(reminder.userId, userId);

    const updateData: Record<string, any> = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.date !== undefined) updateData.date = new Date(dto.date);
    if (dto.time !== undefined) updateData.time = this.parseTime(dto.time);
    if (dto.comment !== undefined) updateData.comment = dto.comment;
    if (dto.repeat !== undefined) updateData.repeat = dto.repeat;
    if (dto.isFavorite !== undefined) updateData.isFavorite = dto.isFavorite;
    if (dto.isCompleted !== undefined) {
      updateData.isCompleted = dto.isCompleted;
      updateData.completedAt = dto.isCompleted ? new Date() : null;
    }

    const updated = await this.repository.update(id, updateData);
    return this.mapper.toResponseDto(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    const reminder = await this.getReminderOrThrow(id);
    this.ensureOwner(reminder.userId, userId);
    await this.repository.softDelete(id);
  }

  async toggleFavorite(
    id: string,
    userId: string,
  ): Promise<ReminderResponseDto> {
    const reminder = await this.getReminderOrThrow(id);
    this.ensureOwner(reminder.userId, userId);

    const updated = await this.repository.update(id, {
      isFavorite: !reminder.isFavorite,
    });

    return this.mapper.toResponseDto(updated);
  }

  async toggleComplete(
    id: string,
    userId: string,
  ): Promise<ReminderResponseDto> {
    const reminder = await this.getReminderOrThrow(id);
    this.ensureOwner(reminder.userId, userId);

    const isCompleted = !reminder.isCompleted;
    const updated = await this.repository.update(id, {
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    });

    return this.mapper.toResponseDto(updated);
  }

  private async getReminderOrThrow(id: string) {
    const reminder = await this.repository.findById(id);
    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }
    return reminder;
  }

  private ensureOwner(reminderUserId: string, requestUserId: string) {
    if (reminderUserId !== requestUserId) {
      throw new BadRequestException('You do not own this reminder');
    }
  }

  private parseTime(time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    return new Date(1970, 0, 1, hours, minutes, 0, 0);
  }
}
