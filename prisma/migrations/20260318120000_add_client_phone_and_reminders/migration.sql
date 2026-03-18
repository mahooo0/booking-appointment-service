-- AlterTable: Add clientPhone to appointments
ALTER TABLE "appointments" ADD COLUMN "clientPhone" TEXT;

-- CreateEnum
CREATE TYPE "ReminderRepeat" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TIME,
    "comment" TEXT,
    "repeat" "ReminderRepeat" NOT NULL DEFAULT 'NONE',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reminders_userId_idx" ON "reminders"("userId");

-- CreateIndex
CREATE INDEX "reminders_userId_date_idx" ON "reminders"("userId", "date");

-- CreateIndex
CREATE INDEX "reminders_userId_isFavorite_idx" ON "reminders"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "reminders_userId_isCompleted_idx" ON "reminders"("userId", "isCompleted");
