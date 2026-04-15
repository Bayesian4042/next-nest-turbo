import { IsEmail, IsOptional, IsString } from 'class-validator';
import type { CreateUserPayload } from '@repo/types';

export class CreateUserDto implements CreateUserPayload {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  role?: string;
}
