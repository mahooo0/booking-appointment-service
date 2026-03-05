-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING_VERIFICATION', 'PENDING', 'CONFIRMED', 'DECLINED', 'RESCHEDULED', 'COMPLETED', 'CLIENT_NO_SHOW', 'NOT_COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('CLIENT', 'COMPANY');

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "appointmentNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceVariationId" TEXT,
    "branchId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "comment" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "price" DECIMAL(10,2),
    "durationMinutes" INTEGER,
    "companyNotes" TEXT,
    "declineReason" TEXT,
    "cancellationReason" TEXT,
    "cancelledBy" "CancelledBy",
    "rescheduledDate" DATE,
    "rescheduledStartTime" TIME,
    "rescheduledEndTime" TIME,
    "rescheduleComment" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "rescheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_status_history" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fromStatus" "AppointmentStatus",
    "toStatus" "AppointmentStatus" NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_verifications" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "attemptsLeft" INTEGER NOT NULL DEFAULT 3,
    "nextResendAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_durations" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_durations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appointments_appointmentNumber_key" ON "appointments"("appointmentNumber");

-- CreateIndex
CREATE INDEX "appointments_userId_idx" ON "appointments"("userId");

-- CreateIndex
CREATE INDEX "appointments_branchId_idx" ON "appointments"("branchId");

-- CreateIndex
CREATE INDEX "appointments_organizationId_idx" ON "appointments"("organizationId");

-- CreateIndex
CREATE INDEX "appointments_serviceId_idx" ON "appointments"("serviceId");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_date_idx" ON "appointments"("date");

-- CreateIndex
CREATE INDEX "appointment_status_history_appointmentId_idx" ON "appointment_status_history"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_verifications_appointmentId_idx" ON "appointment_verifications"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_verifications_verificationCode_idx" ON "appointment_verifications"("verificationCode");

-- CreateIndex
CREATE INDEX "service_durations_serviceId_idx" ON "service_durations"("serviceId");

-- CreateIndex
CREATE INDEX "service_durations_organizationId_idx" ON "service_durations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "service_durations_serviceId_organizationId_branchId_key" ON "service_durations"("serviceId", "organizationId", "branchId");

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_verifications" ADD CONSTRAINT "appointment_verifications_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
