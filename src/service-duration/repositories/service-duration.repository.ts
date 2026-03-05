import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from 'prisma/__generated__';

@Injectable()
export class ServiceDurationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ServiceDurationCreateInput) {
    return this.prisma.serviceDuration.create({ data });
  }

  async findById(id: string) {
    return this.prisma.serviceDuration.findUnique({ where: { id } });
  }

  async findByService(serviceId: string) {
    return this.prisma.serviceDuration.findMany({
      where: { serviceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOrganization(organizationId: string) {
    return this.prisma.serviceDuration.findMany({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: Prisma.ServiceDurationUpdateInput) {
    return this.prisma.serviceDuration.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.serviceDuration.delete({ where: { id } });
  }
}
