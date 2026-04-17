import { Injectable, NotFoundException } from '@nestjs/common';
import { StoreService } from '../store/store.service';
import { ProcessingService } from '../processing/processing.service';
import { CreateAplDto } from './dto/create-apl.dto';

@Injectable()
export class AplService {
  constructor(
    private readonly store: StoreService,
    private readonly processing: ProcessingService,
  ) {}

  findAll() {
    return this.store.findAllApls();
  }

  findOne(id: string) {
    const apl = this.store.findApl(id);
    if (!apl) throw new NotFoundException(`APL ${id} not found`);
    return apl;
  }

  create(dto: CreateAplDto) {
    const apl = this.store.createApl({
      aplCode: dto.aplCode,
      aplName: dto.aplName,
      category: dto.category,
      barcode: dto.barcode,
    });

    if (dto.barcode) {
      this.processing.processApl(apl.id).catch(console.error);
    }

    return apl;
  }

  remove(id: string) {
    const apl = this.store.findApl(id);
    if (!apl) throw new NotFoundException(`APL ${id} not found`);
    this.store.deleteApl(id);
  }

  updateStatus(id: string, status: string) {
    this.store.updateAplStatus(id, status);
  }
}
