import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BaseRepository } from '@/common/repositories/base.repository';
import { Prisma } from 'prisma/__generated__';

@Injectable()
export class SpecialistRepository extends BaseRepository {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  async create(
    data: {
      avatar?: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      description?: string;
      isTopMaster?: boolean;
      organizationId: string;
    },
    organizationId: string
  ) {
    return this.prisma.specialist.create({ data });
  }

  async findById(id: string, organizationId: string) {
    return this.prisma.specialist.findFirst({
      where: this.buildWhereWithTenant({ id }, organizationId),
      include: {
        specialistServices: {
          include: { service: true },
        },
        specialistLocations: {
          include: { location: true },
        },
      },
    });
  }

  async findMany(
    organizationId: string,
    pagination?: { skip?: number; take?: number }
  ) {
    return this.findManyWithTenant(
      this.prisma.specialist,
      organizationId,
      {},
      pagination
    );
  }

  async update(
    id: string,
    data: Prisma.SpecialistUpdateInput,
    organizationId: string
  ) {
    await this.validateEntityOwnership(id, organizationId, async (id) =>
      this.prisma.specialist.findUnique({
        where: { id },
        select: { organizationId: true },
      })
    );

    return this.prisma.specialist.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, organizationId: string) {
    await this.validateEntityOwnership(id, organizationId, async (id) =>
      this.prisma.specialist.findUnique({
        where: { id },
        select: { organizationId: true },
      })
    );

    return this.prisma.specialist.delete({
      where: { id },
    });
  }

  async findByIdWithoutTenant(id: string) {
    return this.prisma.specialist.findUnique({
      where: { id },
    });
  }

  async updateAvatar(id: string, avatar: string | null) {
    return this.prisma.specialist.update({
      where: { id },
      data: { avatar },
    });
  }
}
