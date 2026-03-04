import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConsulModule } from './consul/consul.module';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { LogModule } from './log/log.module';
import { LoggerMiddleware } from '@/log/middlewares/logger.middleware';
import { AppointmentModule } from './appointment/appointment.module';
import { ServiceDurationModule } from './service-duration/service-duration.module';
import { EventsModule } from './events/events.module';
import { SpecialistModule } from './specialist/specialist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ConsulModule,
    HealthModule,
    PrismaModule,
    RabbitmqModule,
    LogModule,
    AppointmentModule,
    ServiceDurationModule,
    EventsModule,
    SpecialistModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .exclude({ path: '/health', method: RequestMethod.ALL })
      .forRoutes('*');
  }
}
