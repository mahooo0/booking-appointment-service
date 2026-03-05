import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SpecialistService } from './specialist.service';
import { CreateSpecialistDto } from './dto/create-specialist.dto';
import { UpdateSpecialistDto } from './dto/update-specialist.dto';
import { SpecialistQueryDto } from './dto/specialist-query.dto';
import {
  SpecialistResponseDto,
  SpecialistListResponseDto,
} from './dto/specialist-response.dto';
import { AccountId } from '@/common/decorators/account-id.decorator';
import { Permissions } from '@/common/decorators/permission.decorator';

@ApiTags('Specialists')
@Controller('appointments/specialists')
export class SpecialistController {
  constructor(private readonly specialistService: SpecialistService) {}

  @Post()
  @Permissions(['specialists.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Create new specialist' })
  @ApiResponse({ status: 201, type: SpecialistResponseDto })
  async create(
    @Body() dto: CreateSpecialistDto,
    @AccountId() organizationId: string
  ): Promise<SpecialistResponseDto> {
    return this.specialistService.create(dto, organizationId);
  }

  @Get()
  @Permissions(['specialists.view'], 'COMPANY')
  @ApiOperation({ summary: 'List specialists with pagination' })
  @ApiResponse({ status: 200, type: SpecialistListResponseDto })
  async findAll(
    @Query() query: SpecialistQueryDto,
    @AccountId() organizationId: string
  ): Promise<SpecialistListResponseDto> {
    return this.specialistService.findAll(
      organizationId,
      query.skip,
      query.take
    );
  }

  @Get(':id')
  @Permissions(['specialists.view'], 'COMPANY')
  @ApiOperation({ summary: 'Get specialist by ID' })
  @ApiParam({ name: 'id', description: 'Specialist ID' })
  @ApiResponse({ status: 200, type: SpecialistResponseDto })
  async findById(
    @Param('id') id: string,
    @AccountId() organizationId: string
  ): Promise<SpecialistResponseDto> {
    return this.specialistService.findById(id, organizationId);
  }

  @Put(':id')
  @Permissions(['specialists.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Update specialist' })
  @ApiParam({ name: 'id', description: 'Specialist ID' })
  @ApiResponse({ status: 200, type: SpecialistResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSpecialistDto,
    @AccountId() organizationId: string
  ): Promise<SpecialistResponseDto> {
    return this.specialistService.update(id, dto, organizationId);
  }

  @Delete(':id')
  @Permissions(['specialists.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Delete specialist' })
  @ApiParam({ name: 'id', description: 'Specialist ID' })
  @ApiResponse({ status: 200 })
  async delete(
    @Param('id') id: string,
    @AccountId() organizationId: string
  ): Promise<void> {
    return this.specialistService.delete(id, organizationId);
  }
}
