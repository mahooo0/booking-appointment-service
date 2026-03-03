-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentServiceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialists" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "avatar" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "description" TEXT,
    "isTopMaster" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "intervals" JSONB NOT NULL,
    "isDayOff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "services_organizationId_idx" ON "services"("organizationId");

-- CreateIndex
CREATE INDEX "services_organizationId_parentServiceId_idx" ON "services"("organizationId", "parentServiceId");

-- CreateIndex
CREATE INDEX "locations_organizationId_idx" ON "locations"("organizationId");

-- CreateIndex
CREATE INDEX "specialists_organizationId_idx" ON "specialists"("organizationId");

-- CreateIndex
CREATE INDEX "specialists_organizationId_email_idx" ON "specialists"("organizationId", "email");

-- CreateIndex
CREATE INDEX "specialists_organizationId_isTopMaster_idx" ON "specialists"("organizationId", "isTopMaster");

-- CreateIndex
CREATE INDEX "schedules_organizationId_specialistId_locationId_idx" ON "schedules"("organizationId", "specialistId", "locationId");

-- CreateIndex
CREATE INDEX "schedules_organizationId_locationId_dayOfWeek_idx" ON "schedules"("organizationId", "locationId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_organizationId_specialistId_locationId_dayOfWeek_key" ON "schedules"("organizationId", "specialistId", "locationId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_durations" ADD CONSTRAINT "service_durations_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
