import { Module } from '@nestjs/common';
import { ServiceDurationController } from './service-duration.controller';
import { ServiceDurationService } from './service-duration.service';
import { ServiceDurationRepository } from './repositories/service-duration.repository';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceDurationController],
  providers: [ServiceDurationService, ServiceDurationRepository],
  exports: [ServiceDurationService],
})
export class ServiceDurationModule {}
