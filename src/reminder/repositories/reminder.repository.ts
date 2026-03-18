import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from 'prisma/__generated__';
import { ReminderCategory } from '../dto/reminder-query.dto';

@Injectable()
export class ReminderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ReminderCreateInput) {
    return this.prisma.reminder.create({ data });
  }

  async findById(id: string) {
    return this.prisma.reminder.findFirst({
      where: { id, isDeleted: false },
    });
  }

  async findMany(params: {
    where?: Prisma.ReminderWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.ReminderOrderByWithRelationInput;
  }) {
    const { where, skip, take, orderBy } = params;
    const baseWhere: Prisma.ReminderWhereInput = {
      ...where,
      isDeleted: false,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.reminder.findMany({
        where: baseWhere,
        skip,
        take,
        orderBy: orderBy || { date: 'asc' },
      }),
      this.prisma.reminder.count({ where: baseWhere }),
    ]);

    return { data, total };
  }

  async update(id: string, data: Prisma.ReminderUpdateInput) {
    return this.prisma.reminder.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return this.prisma.reminder.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  buildWhereClause(params: {
    userId: string;
    category?: ReminderCategory;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Prisma.ReminderWhereInput {
    const where: Prisma.ReminderWhereInput = {
      userId: params.userId,
    };

    if (params.category) {
      switch (params.category) {
        case ReminderCategory.TODAY: {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          where.date = { gte: today, lt: tomorrow };
          where.isCompleted = false;
          break;
        }
        case ReminderCategory.FAVORITES:
          where.isFavorite = true;
          where.isCompleted = false;
          break;
        case ReminderCategory.COMPLETED:
          where.isCompleted = true;
          break;
        case ReminderCategory.ALL:
        default:
          break;
      }
    }

    if (params.dateFrom || params.dateTo) {
      where.date = where.date || {};
      if (params.dateFrom) (where.date as any).gte = new Date(params.dateFrom);
      if (params.dateTo) (where.date as any).lte = new Date(params.dateTo);
    }

    if (params.search) {
      where.title = { contains: params.search, mode: 'insensitive' };
    }

    return where;
  }
}
