import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ServiceDurationService } from './service-duration.service';
import { Permissions } from '@/common/decorators/permission.decorator';
import { CreateServiceDurationDto } from './dto/create-service-duration.dto';
import { UpdateServiceDurationDto } from './dto/update-service-duration.dto';

@ApiTags('Service Durations')
@Controller('appointments/service-durations')
export class ServiceDurationController {
  constructor(
    private readonly serviceDurationService: ServiceDurationService,
  ) {}

  @Post()
  @Permissions(['services.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Create service duration' })
  @ApiResponse({ status: 201 })
  async create(@Body() dto: CreateServiceDurationDto) {
    return this.serviceDurationService.create(dto);
  }

  @Put(':id')
  @Permissions(['services.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Update service duration' })
  @ApiParam({ name: 'id', description: 'Service Duration ID' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDurationDto,
  ) {
    return this.serviceDurationService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(['services.manage'], 'COMPANY')
  @ApiOperation({ summary: 'Delete service duration' })
  @ApiParam({ name: 'id', description: 'Service Duration ID' })
  async delete(@Param('id') id: string) {
    return this.serviceDurationService.delete(id);
  }

  @Get('service/:serviceId')
  @ApiOperation({ summary: 'Get durations by service ID (public)' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  async getByService(@Param('serviceId') serviceId: string) {
    return this.serviceDurationService.getByService(serviceId);
  }

  @Get('organization/:orgId')
  @Permissions(['services.view'], 'COMPANY')
  @ApiOperation({ summary: 'Get durations by organization ID' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  async getByOrganization(@Param('orgId') orgId: string) {
    return this.serviceDurationService.getByOrganization(orgId);
  }
}
