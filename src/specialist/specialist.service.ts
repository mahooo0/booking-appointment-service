import { Injectable, NotFoundException } from '@nestjs/common';
import { SpecialistRepository } from './repositories/specialist.repository';
import { CreateSpecialistDto } from './dto/create-specialist.dto';
import { UpdateSpecialistDto } from './dto/update-specialist.dto';
import {
  SpecialistResponseDto,
  SpecialistListResponseDto,
} from './dto/specialist-response.dto';
import { StorageMessage } from '@/common/dto/storage-message.dto';
import { LogService } from '@/log/log.service';

@Injectable()
export class SpecialistService {
  constructor(
    private readonly specialistRepository: SpecialistRepository,
    private readonly logger: LogService,
  ) {}

  async create(
    dto: CreateSpecialistDto,
    organizationId: string
  ): Promise<SpecialistResponseDto> {
    const specialist = await this.specialistRepository.create(
      {
        ...dto,
        organizationId,
      },
      organizationId
    );

    return specialist as SpecialistResponseDto;
  }

  async findAll(
    organizationId: string,
    skip?: number,
    take?: number
  ): Promise<SpecialistListResponseDto> {
    const { data, total } = await this.specialistRepository.findMany(
      organizationId,
      { skip, take }
    );

    const pageSize = take || 20;
    const page = Math.floor((skip || 0) / pageSize) + 1;

    return {
      data: data as SpecialistResponseDto[],
      total,
      page,
      pageSize,
    };
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<SpecialistResponseDto> {
    const specialist = await this.specialistRepository.findById(
      id,
      organizationId
    );

    if (!specialist) {
      throw new NotFoundException(`Specialist with ID ${id} not found`);
    }

    return specialist as SpecialistResponseDto;
  }

  async update(
    id: string,
    dto: UpdateSpecialistDto,
    organizationId: string
  ): Promise<SpecialistResponseDto> {
    const specialist = await this.specialistRepository.update(
      id,
      dto,
      organizationId
    );

    return specialist as SpecialistResponseDto;
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.specialistRepository.delete(id, organizationId);
  }

  async handleSpecialistImageUpdate(data: StorageMessage): Promise<void> {
    try {
      const specialist = await this.specialistRepository.findByIdWithoutTenant(
        data.entityId,
      );

      if (!specialist) {
        this.logger.warn(
          `Specialist not found for image update: ${data.entityId}`,
        );
        return;
      }

      await this.specialistRepository.updateAvatar(
        data.entityId,
        data.publicUrl || null,
      );

      this.logger.log(
        `Specialist ${data.entityId} avatar updated: ${data.publicUrl}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating specialist image for ${data.entityId}:`,
        error,
      );
    }
  }

  async handleSpecialistImageDelete(data: StorageMessage): Promise<void> {
    try {
      const specialist = await this.specialistRepository.findByIdWithoutTenant(
        data.entityId,
      );

      if (!specialist) {
        this.logger.warn(
          `Specialist not found for image delete: ${data.entityId}`,
        );
        return;
      }

      await this.specialistRepository.updateAvatar(data.entityId, null);

      this.logger.log(`Specialist ${data.entityId} avatar cleared`);
    } catch (error) {
      this.logger.error(
        `Error deleting specialist image for ${data.entityId}:`,
        error,
      );
    }
  }
}
