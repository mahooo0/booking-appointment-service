import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller';
import { CompanyAppointmentController } from './company-appointment.controller';
import { AppointmentService } from './appointment.service';
import { AppointmentRepository } from './repositories/appointment.repository';
import { AppointmentMapper } from './mappers/appointment.mapper';
import { AppointmentNumberService } from './services/appointment-number.service';
import { VerificationCodeService } from './services/verification-code.service';
import { StatusMachineService } from './services/status-machine.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { EventsModule } from '@/events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [AppointmentController, CompanyAppointmentController],
  providers: [
    AppointmentService,
    AppointmentRepository,
    AppointmentMapper,
    AppointmentNumberService,
    VerificationCodeService,
    StatusMachineService,
  ],
  exports: [AppointmentService],
})
export class AppointmentModule {}
