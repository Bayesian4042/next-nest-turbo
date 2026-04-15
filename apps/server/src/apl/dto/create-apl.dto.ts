import { IsString, IsNotEmpty } from 'class-validator';
import type { CreateAplPayload } from '../../processing/types';


export class CreateAplDto implements CreateAplPayload {
  @IsString()
  @IsNotEmpty()
  aplCode: string;

  @IsString()
  @IsNotEmpty()
  aplName: string;

  @IsString()
  @IsNotEmpty()
  category: string;
}
