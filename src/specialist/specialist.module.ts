import { Module } from '@nestjs/common';
import { SpecialistController } from './specialist.controller';
import { SpecialistService } from './specialist.service';
import { SpecialistRepository } from './repositories/specialist.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { RabbitmqModule } from '@/rabbitmq/rabbitmq.module';
import { LogModule } from '@/log/log.module';
import { SpecialistStorageListener } from './events/specialist-storage.listener';

@Module({
  imports: [PrismaModule, RabbitmqModule, LogModule],
  controllers: [SpecialistController],
  providers: [SpecialistService, SpecialistRepository, SpecialistStorageListener],
  exports: [SpecialistService],
})
export class SpecialistModule {}
