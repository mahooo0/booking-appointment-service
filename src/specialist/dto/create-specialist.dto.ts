import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  Length,
} from 'class-validator';

export class CreateSpecialistDto {
  @ApiPropertyOptional({
    description: 'Specialist avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({
    description: 'Specialist first name',
    example: 'John',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({
    description: 'Specialist last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  lastName: string;

  @ApiProperty({
    description: 'Specialist email address',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Specialist phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Specialist description',
    example: 'Expert in hair styling with 10 years of experience',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the specialist is a top master',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTopMaster?: boolean = false;
}
