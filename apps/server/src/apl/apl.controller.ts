import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { AplService } from './apl.service';
import { CreateAplDto } from './dto/create-apl.dto';

@Controller('apls')
export class AplController {
  constructor(private readonly aplService: AplService) {}

  @Get()
  findAll() {
    return this.aplService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aplService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAplDto) {
    return this.aplService.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.aplService.remove(id);
  }
}
