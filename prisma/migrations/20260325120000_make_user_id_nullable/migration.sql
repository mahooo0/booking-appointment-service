-- AlterTable: Make userId nullable for guest appointments
ALTER TABLE "appointments" ALTER COLUMN "userId" DROP NOT NULL;
