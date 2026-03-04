import { Module } from '@nestjs/common';
import { SpecialistController } from './specialist.controller';
import { SpecialistService } from './specialist.service';
import { SpecialistRepository } from './repositories/specialist.repository';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SpecialistController],
  providers: [SpecialistService, SpecialistRepository],
  exports: [SpecialistService],
})
export class SpecialistModule {}
