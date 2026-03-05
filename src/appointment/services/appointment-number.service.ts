import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { APPOINTMENT_CONFIG } from '@/config/appointment.config';

@Injectable()
export class AppointmentNumberService {
  constructor(private readonly prisma: PrismaService) {}

  async generateUniqueNumber(): Promise<string> {
    const { length, maxRetries } = APPOINTMENT_CONFIG.appointmentNumber;

    for (let i = 0; i < maxRetries; i++) {
      const number = this.generateRandomNumber(length);

      const existing = await this.prisma.appointment.findUnique({
        where: { appointmentNumber: number },
        select: { id: true },
      });

      if (!existing) {
        return number;
      }
    }

    throw new Error(
      'Failed to generate unique appointment number after max retries',
    );
  }

  private generateRandomNumber(length: number): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
  }
}
