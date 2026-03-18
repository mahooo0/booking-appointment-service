import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UserId } from '@/common/decorators/user-id.decorator';
import { ReminderService } from './reminder.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { ReminderQueryDto } from './dto/reminder-query.dto';
import {
  ReminderResponseDto,
  ReminderListResponseDto,
} from './dto/reminder-response.dto';

@ApiTags('Reminders')
@Controller('reminders')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new reminder' })
  @ApiResponse({ status: 201, type: ReminderResponseDto })
  async create(
    @UserId() userId: string,
    @Body() dto: CreateReminderDto,
  ): Promise<ReminderResponseDto> {
    return this.reminderService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user reminders (paginated, with category filter)' })
  @ApiResponse({ status: 200, type: ReminderListResponseDto })
  async list(
    @UserId() userId: string,
    @Query() query: ReminderQueryDto,
  ): Promise<ReminderListResponseDto> {
    return this.reminderService.getList(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reminder by ID' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 200, type: ReminderResponseDto })
  async getById(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<ReminderResponseDto> {
    return this.reminderService.getById(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update reminder' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 200, type: ReminderResponseDto })
  async update(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: UpdateReminderDto,
  ): Promise<ReminderResponseDto> {
    return this.reminderService.update(id, userId, dto);
  }

  @Patch(':id/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle reminder favorite status' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 200, type: ReminderResponseDto })
  async toggleFavorite(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<ReminderResponseDto> {
    return this.reminderService.toggleFavorite(id, userId);
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle reminder completion status' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  @ApiResponse({ status: 200, type: ReminderResponseDto })
  async toggleComplete(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<ReminderResponseDto> {
    return this.reminderService.toggleComplete(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete reminder (soft delete)' })
  @ApiParam({ name: 'id', description: 'Reminder ID' })
  async delete(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    return this.reminderService.delete(id, userId);
  }
}
