import { Module } from '@nestjs/common';
import { AppointmentEventsService } from './services/appointment-events.service';
import { RabbitmqModule } from '@/rabbitmq/rabbitmq.module';

@Module({
  imports: [RabbitmqModule],
  providers: [AppointmentEventsService],
  exports: [AppointmentEventsService],
})
export class EventsModule {}
