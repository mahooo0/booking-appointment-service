-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "specialistId" TEXT;

-- CreateIndex
CREATE INDEX "appointments_specialistId_idx" ON "appointments"("specialistId");
