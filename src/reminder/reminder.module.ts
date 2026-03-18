import { Module } from '@nestjs/common';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';
import { ReminderRepository } from './repositories/reminder.repository';
import { ReminderMapper } from './mappers/reminder.mapper';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReminderController],
  providers: [ReminderService, ReminderRepository, ReminderMapper],
  exports: [ReminderService],
})
export class ReminderModule {}
