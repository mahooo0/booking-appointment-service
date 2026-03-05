import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { APPOINTMENT_CONFIG } from '@/config/appointment.config';

@Injectable()
export class VerificationCodeService {
  constructor(private readonly prisma: PrismaService) {}

  generateCode(): string {
    const { codeLength } = APPOINTMENT_CONFIG.verification;
    const min = Math.pow(10, codeLength - 1);
    const max = Math.pow(10, codeLength) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
  }

  getExpirationTime(): Date {
    const { expirationMinutes } = APPOINTMENT_CONFIG.verification;
    return new Date(Date.now() + expirationMinutes * 60 * 1000);
  }

  getNextResendAt(): Date {
    const { resendCooldownSeconds } = APPOINTMENT_CONFIG.verification;
    return new Date(Date.now() + resendCooldownSeconds * 1000);
  }

  async createVerification(appointmentId: string, phone: string) {
    // Deactivate old codes
    await this.prisma.appointmentVerification.updateMany({
      where: { appointmentId, isUsed: false },
      data: { isUsed: true },
    });

    return this.prisma.appointmentVerification.create({
      data: {
        appointmentId,
        phone,
        verificationCode: this.generateCode(),
        expiresAt: this.getExpirationTime(),
        attemptsLeft: APPOINTMENT_CONFIG.verification.maxAttempts,
        nextResendAt: this.getNextResendAt(),
      },
    });
  }

  async resendVerification(appointmentId: string) {
    const lastVerification = await this.prisma.appointmentVerification.findFirst(
      {
        where: { appointmentId, isUsed: false },
        orderBy: { createdAt: 'desc' },
      },
    );

    if (!lastVerification) {
      throw new BadRequestException('No active verification found. Request a new code first.');
    }

    if (lastVerification.nextResendAt && lastVerification.nextResendAt > new Date()) {
      const secondsLeft = Math.ceil(
        (lastVerification.nextResendAt.getTime() - Date.now()) / 1000,
      );
      throw new BadRequestException(
        `Please wait ${secondsLeft} seconds before resending`,
      );
    }

    // Deactivate old code
    await this.prisma.appointmentVerification.update({
      where: { id: lastVerification.id },
      data: { isUsed: true },
    });

    return this.prisma.appointmentVerification.create({
      data: {
        appointmentId,
        phone: lastVerification.phone,
        verificationCode: this.generateCode(),
        expiresAt: this.getExpirationTime(),
        attemptsLeft: APPOINTMENT_CONFIG.verification.maxAttempts,
        nextResendAt: this.getNextResendAt(),
      },
    });
  }

  async verifyCode(
    appointmentId: string,
    code: string,
  ): Promise<boolean> {
    const verification = await this.prisma.appointmentVerification.findFirst({
      where: {
        appointmentId,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('No active verification code found');
    }

    if (verification.expiresAt < new Date()) {
      await this.prisma.appointmentVerification.update({
        where: { id: verification.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('Verification code has expired');
    }

    if (verification.attemptsLeft <= 0) {
      await this.prisma.appointmentVerification.update({
        where: { id: verification.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('No attempts left. Request a new code.');
    }

    if (verification.verificationCode !== code) {
      await this.prisma.appointmentVerification.update({
        where: { id: verification.id },
        data: { attemptsLeft: { decrement: 1 } },
      });
      throw new BadRequestException(
        `Invalid code. ${verification.attemptsLeft - 1} attempts remaining`,
      );
    }

    // Mark as used on success
    await this.prisma.appointmentVerification.update({
      where: { id: verification.id },
      data: { isUsed: true },
    });

    return true;
  }
}
