import { IsOptional, IsString } from 'class-validator';

export class UploadBatchDto {
  @IsOptional()
  @IsString()
  uploadedBy?: string;
}
