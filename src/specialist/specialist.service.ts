import { Injectable, NotFoundException } from '@nestjs/common';
import { SpecialistRepository } from './repositories/specialist.repository';
import { CreateSpecialistDto } from './dto/create-specialist.dto';
import { UpdateSpecialistDto } from './dto/update-specialist.dto';
import {
  SpecialistResponseDto,
  SpecialistListResponseDto,
} from './dto/specialist-response.dto';

@Injectable()
export class SpecialistService {
  constructor(
    private readonly specialistRepository: SpecialistRepository
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
}
