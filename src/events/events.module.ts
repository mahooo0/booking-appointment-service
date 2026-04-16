import { Module } from '@nestjs/common';
import { AppointmentEventsService } from './services/appointment-events.service';
import { ReviewEventListener } from './listeners/review-event.listener';
import { RabbitmqModule } from '@/rabbitmq/rabbitmq.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [RabbitmqModule, PrismaModule],
  providers: [AppointmentEventsService, ReviewEventListener],
  exports: [AppointmentEventsService],
})
export class EventsModule {}
