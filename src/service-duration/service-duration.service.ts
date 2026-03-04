import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ServiceDurationRepository } from './repositories/service-duration.repository';
import { CreateServiceDurationDto } from './dto/create-service-duration.dto';
import { UpdateServiceDurationDto } from './dto/update-service-duration.dto';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ServiceDurationService {
  constructor(
    private readonly repository: ServiceDurationRepository,
    private readonly prisma: PrismaService,
  ) {}

  // SERV-01: Verified — no automatic relationship assignment on service creation
  // ServiceDuration creation is independent of SpecialistService, SpecialistLocation, and ServiceLocation junction tables.
  // Users explicitly assign relationships via separate APIs in Phase 3.
  //
  // LOC-01: Location model supports specialist/service relationships via junction tables (Phase 1 schema)
  // Junction tables (SpecialistLocation, ServiceLocation, SpecialistService) defined in prisma/schema.prisma.

  async create(dto: CreateServiceDurationDto) {
    // SERV-02: Validate service exists and belongs to same organization
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      select: { organizationId: true, parentServiceId: true },
    });

    if (!service) {
      throw new NotFoundException(`Service with id ${dto.serviceId} not found`);
    }

    if (service.organizationId !== dto.organizationId) {
      throw new ForbiddenException(
        `Service ${dto.serviceId} does not belong to organization ${dto.organizationId}`
      );
    }

    // Validate parent service belongs to same organization if exists
    if (service.parentServiceId) {
      const parentService = await this.prisma.service.findUnique({
        where: { id: service.parentServiceId },
        select: { organizationId: true },
      });

      if (parentService && parentService.organizationId !== dto.organizationId) {
        throw new ForbiddenException(
          `Parent service tree is incompatible: parent service belongs to different organization`
        );
      }
    }

    // Check for existing combination
    const existing = await this.prisma.serviceDuration.findFirst({
      where: {
        serviceId: dto.serviceId,
        organizationId: dto.organizationId,
        branchId: dto.branchId ?? null,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Service duration already exists for this service/organization/branch combination',
      );
    }

    return this.repository.create({
      service: { connect: { id: dto.serviceId } },
      organizationId: dto.organizationId,
      branchId: dto.branchId,
      durationMinutes: dto.durationMinutes,
    });
  }

  async update(id: string, dto: UpdateServiceDurationDto) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Service duration not found');
    }

    return this.repository.update(id, dto);
  }

  async delete(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Service duration not found');
    }

    return this.repository.delete(id);
  }

  async getByService(serviceId: string) {
    return this.repository.findByService(serviceId);
  }

  async getByOrganization(organizationId: string) {
    return this.repository.findByOrganization(organizationId);
  }
}
