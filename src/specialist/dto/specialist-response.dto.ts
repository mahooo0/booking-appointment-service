import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpecialistServiceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;
}

export class SpecialistLocationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  address?: string;
}

export class SpecialistResponseDto {
  @ApiProperty({
    description: 'Specialist unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Specialist avatar URL',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  avatar: string | null;

  @ApiProperty({
    description: 'Specialist first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Specialist last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Specialist email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Specialist phone number',
    example: '+1234567890',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: 'Specialist description',
    example: 'Expert in hair styling with 10 years of experience',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Whether the specialist is a top master',
    example: false,
  })
  isTopMaster: boolean;

  @ApiPropertyOptional({
    description: 'Services provided by the specialist',
    type: [SpecialistServiceDto],
  })
  services?: SpecialistServiceDto[];

  @ApiPropertyOptional({
    description: 'Locations where the specialist works',
    type: [SpecialistLocationDto],
  })
  locations?: SpecialistLocationDto[];

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-03-04T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-03-04T10:00:00Z',
  })
  updatedAt: Date;
}

export class SpecialistListResponseDto {
  @ApiProperty({
    description: 'List of specialists',
    type: [SpecialistResponseDto],
  })
  data: SpecialistResponseDto[];

  @ApiProperty({
    description: 'Total number of specialists',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Page size',
    example: 20,
  })
  pageSize: number;
}
