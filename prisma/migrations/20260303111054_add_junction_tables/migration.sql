-- CreateTable
CREATE TABLE "specialist_services" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialist_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialist_locations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialist_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_locations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "specialist_services_organizationId_specialistId_serviceId_idx" ON "specialist_services"("organizationId", "specialistId", "serviceId");

-- CreateIndex
CREATE INDEX "specialist_services_organizationId_serviceId_specialistId_idx" ON "specialist_services"("organizationId", "serviceId", "specialistId");

-- CreateIndex
CREATE INDEX "specialist_services_organizationId_specialistId_idx" ON "specialist_services"("organizationId", "specialistId");

-- CreateIndex
CREATE UNIQUE INDEX "specialist_services_organizationId_specialistId_serviceId_key" ON "specialist_services"("organizationId", "specialistId", "serviceId");

-- CreateIndex
CREATE INDEX "specialist_locations_organizationId_specialistId_locationId_idx" ON "specialist_locations"("organizationId", "specialistId", "locationId");

-- CreateIndex
CREATE INDEX "specialist_locations_organizationId_locationId_specialistId_idx" ON "specialist_locations"("organizationId", "locationId", "specialistId");

-- CreateIndex
CREATE INDEX "specialist_locations_organizationId_specialistId_idx" ON "specialist_locations"("organizationId", "specialistId");

-- CreateIndex
CREATE UNIQUE INDEX "specialist_locations_organizationId_specialistId_locationId_key" ON "specialist_locations"("organizationId", "specialistId", "locationId");

-- CreateIndex
CREATE INDEX "service_locations_organizationId_serviceId_locationId_idx" ON "service_locations"("organizationId", "serviceId", "locationId");

-- CreateIndex
CREATE INDEX "service_locations_organizationId_locationId_serviceId_idx" ON "service_locations"("organizationId", "locationId", "serviceId");

-- CreateIndex
CREATE INDEX "service_locations_organizationId_serviceId_idx" ON "service_locations"("organizationId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "service_locations_organizationId_serviceId_locationId_key" ON "service_locations"("organizationId", "serviceId", "locationId");

-- AddForeignKey
ALTER TABLE "specialist_services" ADD CONSTRAINT "specialist_services_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialist_services" ADD CONSTRAINT "specialist_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialist_locations" ADD CONSTRAINT "specialist_locations_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialist_locations" ADD CONSTRAINT "specialist_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_locations" ADD CONSTRAINT "service_locations_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_locations" ADD CONSTRAINT "service_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
