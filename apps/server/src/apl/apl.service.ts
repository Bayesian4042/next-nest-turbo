import { Injectable, NotFoundException } from '@nestjs/common';
import { StoreService } from '../store/store.service';
import { CreateAplDto } from './dto/create-apl.dto';

@Injectable()
export class AplService {
  constructor(private readonly store: StoreService) {}

  findAll() {
    return this.store.findAllApls();
  }

  findOne(id: string) {
    const apl = this.store.findApl(id);
    if (!apl) throw new NotFoundException(`APL ${id} not found`);
    return apl;
  }

  create(dto: CreateAplDto) {
    return this.store.createApl(dto);
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
