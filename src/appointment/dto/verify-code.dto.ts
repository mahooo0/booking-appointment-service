import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestVerificationDto {
  @ApiProperty({ description: 'Phone number for SMS verification', example: '+380991234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class ConfirmVerificationDto {
  @ApiProperty({ description: '6-digit verification code', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
