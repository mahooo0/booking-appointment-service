import { BadRequestException, Injectable } from '@nestjs/common';
import { AppointmentStatus } from 'prisma/__generated__';

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING_VERIFICATION: [AppointmentStatus.PENDING, AppointmentStatus.CANCELLED],
  PENDING: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.DECLINED,
    AppointmentStatus.RESCHEDULED,
    AppointmentStatus.CANCELLED,
  ],
  CONFIRMED: [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CLIENT_NO_SHOW,
    AppointmentStatus.CANCELLED,
  ],
  DECLINED: [],
  RESCHEDULED: [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.NOT_COMPLETED,
    AppointmentStatus.CANCELLED,
  ],
  COMPLETED: [],
  CLIENT_NO_SHOW: [],
  NOT_COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class StatusMachineService {
  validateTransition(
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
  ): void {
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];

    if (!allowedTransitions || allowedTransitions.length === 0) {
      throw new BadRequestException(
        `Status '${currentStatus}' is terminal and cannot be changed`,
      );
    }

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
      );
    }
  }

  isTerminal(status: AppointmentStatus): boolean {
    return VALID_TRANSITIONS[status]?.length === 0;
  }

  getAllowedTransitions(status: AppointmentStatus): AppointmentStatus[] {
    return VALID_TRANSITIONS[status] || [];
  }
}
