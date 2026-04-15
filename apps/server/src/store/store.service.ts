import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface AplImageRecord {
  id: string;
  aplId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  createdAt: string;
}

export interface AplResultRecord {
  id: string;
  aplId: string;
  productName: string | null;
  brand: string | null;
  ingredients: string | null;
  allergens: string | null;
  probableAllergens: string | null;
  nutritionValues: string | null;
  enrichedData: string | null;
  confidenceScore: number | null;
  confidenceDetails: string | null;
  reasoning: string | null;
  sources: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AplRecord {
  id: string;
  aplCode: string;
  aplName: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AplWithRelations extends AplRecord {
  images: AplImageRecord[];
  result: AplResultRecord | null;
}

@Injectable()
export class StoreService {
  private apls = new Map<string, AplRecord>();
  private images = new Map<string, AplImageRecord>();
  private results = new Map<string, AplResultRecord>();

  private now() {
    return new Date().toISOString();
  }

  // ── APL ──────────────────────────────────────────────────────────────

  createApl(data: { aplCode: string; aplName: string; category: string; status?: string }): AplWithRelations {
    const id = randomUUID();
    const now = this.now();
    const record: AplRecord = {
      id,
      aplCode: data.aplCode,
      aplName: data.aplName,
      category: data.category,
      status: data.status ?? 'Processing',
      createdAt: now,
      updatedAt: now,
    };
    this.apls.set(id, record);
    return this.withRelations(record);
  }

  findAllApls(): AplWithRelations[] {
    return Array.from(this.apls.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((a) => this.withRelations(a));
  }

  findApl(id: string): AplWithRelations | null {
    const apl = this.apls.get(id);
    return apl ? this.withRelations(apl) : null;
  }

  updateAplStatus(id: string, status: string): void {
    const apl = this.apls.get(id);
    if (apl) {
      apl.status = status;
      apl.updatedAt = this.now();
    }
  }

  deleteApl(id: string): void {
    this.apls.delete(id);
    for (const [imgId, img] of this.images) {
      if (img.aplId === id) this.images.delete(imgId);
    }
    for (const [resId, res] of this.results) {
      if (res.aplId === id) this.results.delete(resId);
    }
  }

  clearAll(): void {
    this.apls.clear();
    this.images.clear();
    this.results.clear();
  }

  // ── Images ────────────────────────────────────────────────────────────

  createImage(data: {
    aplId: string;
    filename: string;
    originalName: string;
    mimeType: string;
  }): AplImageRecord {
    const id = randomUUID();
    const record: AplImageRecord = { id, ...data, createdAt: this.now() };
    this.images.set(id, record);
    return record;
  }

  findImagesByApl(aplId: string): AplImageRecord[] {
    return Array.from(this.images.values())
      .filter((img) => img.aplId === aplId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  // ── Results ───────────────────────────────────────────────────────────

  upsertResult(aplId: string, data: Omit<AplResultRecord, 'id' | 'aplId' | 'createdAt' | 'updatedAt'>): AplResultRecord {
    const existing = this.findResult(aplId);
    const now = this.now();
    if (existing) {
      Object.assign(existing, data, { updatedAt: now });
      return existing;
    }
    const record: AplResultRecord = {
      id: randomUUID(),
      aplId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.results.set(aplId, record);
    return record;
  }

  findResult(aplId: string): AplResultRecord | null {
    return this.results.get(aplId) ?? null;
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private withRelations(apl: AplRecord): AplWithRelations {
    return {
      ...apl,
      images: this.findImagesByApl(apl.id),
      result: this.findResult(apl.id),
    };
  }
}
