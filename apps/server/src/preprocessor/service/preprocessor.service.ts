import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { PrismaService } from '@/prisma/prisma.service';
import {
  STORAGE_ADAPTER,
  IStorageAdapter,
} from '@/storage/storage.adapter.interface';
import {
  MATCHER_QUEUE_ADAPTER,
  IQueueAdapter,
} from '@/queue/queue.adapter.interface';
import { normalizeRowKeys } from '../utils/normalize-columns';
import { cleanDescription } from '../utils/clean-description';
import { normalizeMogName } from '../utils/normalize-mog-name';
import { normalizeMapStatus } from '../utils/normalize-map-status';

interface MogRow extends Record<string, string> {
  siteCode: string;
  mogCode: string;
  mogName: string;
  articleNumber: string;
  status: string;
  isActive: string;
}

interface AplRow extends Record<string, string> {
  articleNumber: string;
  description: string;
  uom: string;
  category: string;
  site: string;
  hierLevel3: string;
  hierLevel4: string;
  hierLevel5: string;
  hierLevel6: string;
  shelfLifeCat: string;
  isActive: string;
}

const UPSERT_BATCH_SIZE = parseInt(
  process.env.PREPROCESSOR_UPSERT_BATCH ?? '50',
  10,
);

@Injectable()
export class PreprocessorService implements OnModuleInit {
  private readonly logger = new Logger(PreprocessorService.name);
  private vocabMap: Map<string, string> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_ADAPTER) private readonly storage: IStorageAdapter,
    @Inject(MATCHER_QUEUE_ADAPTER)
    private readonly matcherQueue: IQueueAdapter,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadVocabMap();
  }

  async processBatch(batchId: string): Promise<void> {
    this.logger.log(`Processing batch ${batchId}`);

    const batch = await this.prisma.importBatch.findUniqueOrThrow({
      where: { id: batchId },
    });

    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'PREPROCESSING' },
    });

    try {
      const [mogRows, aplRows] = await Promise.all([
        this.streamCsv<MogRow>(batch.mogBlobUrl),
        this.streamCsv<AplRow>(batch.aplBlobUrl),
      ]);

      const siteCodes = await this.persist(batchId, mogRows, aplRows);

      this.logger.log(
        `Batch ${batchId} preprocessed — ${mogRows.length} MOG rows, ${aplRows.length} APL rows, ${siteCodes.length} site(s)`,
      );

      // Fan out one matcher job per site so they can be processed in parallel
      // across multiple worker instances.
      await Promise.all(
        siteCodes.map((siteCode) =>
          this.matcherQueue.sendMessage({ batchId, siteCode }),
        ),
      );

      this.logger.log(
        `Batch ${batchId}: dispatched ${siteCodes.length} site job(s) to matcher queue`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Batch ${batchId} failed: ${message}`);

      await this.prisma.importBatch.update({
        where: { id: batchId },
        data: { status: 'FAILED', errorMessage: message },
      });

      throw error;
    }
  }

  private async loadVocabMap(): Promise<void> {
    const entries = await this.prisma.mogVocab.findMany();
    this.vocabMap = new Map(
      entries.map((e) => [e.rawName.toLowerCase(), e.normalizedName]),
    );
    this.logger.log(`Loaded ${this.vocabMap.size} vocab entries`);
  }

  private async streamCsv<T extends Record<string, string>>(
    url: string,
  ): Promise<T[]> {
    const source = await this.storage.getReadStream(url);

    const parser = (source as Readable).pipe(
      parse({
        columns: true,
        trim: true,
        skip_empty_lines: true,
        delimiter: [',', '\t', ';'],
        relax_column_count: true,
        relax_quotes: true,
        quote: '"',
      }),
    );

    const rows: T[] = [];
    for await (const raw of parser) {
      rows.push(normalizeRowKeys(raw as Record<string, string>) as T);
    }

    return rows;
  }

  /**
   * Persists all rows and returns the distinct site codes found in the MOG CSV.
   * Articles and MOGs are upserted in parallel batches to reduce wall time.
   */
  private async persist(
    batchId: string,
    mogRows: MogRow[],
    aplRows: AplRow[],
  ): Promise<string[]> {
    // --- Articles (batched parallel upserts) ---
    const articleIdMap = new Map<string, string>();

    for (let i = 0; i < aplRows.length; i += UPSERT_BATCH_SIZE) {
      const chunk = aplRows.slice(i, i + UPSERT_BATCH_SIZE);
      const results = await Promise.all(
        chunk.map((row) => {
          const description = cleanDescription(row.description ?? '');
          return this.prisma.article.upsert({
            where: {
              articleNumber_site_batchId: {
                articleNumber: row.articleNumber,
                site: row.site,
                batchId,
              },
            },
            update: { description },
            create: {
              articleNumber: row.articleNumber,
              description,
              uom: row.uom,
              category: row.category || null,
              hierLevel3: row.hierLevel3 || null,
              hierLevel4: row.hierLevel4 || null,
              hierLevel5: row.hierLevel5 || null,
              hierLevel6: row.hierLevel6 || null,
              shelfLifeCat: row.shelfLifeCat || null,
              site: row.site,
              batchId,
              isActive:
                row.isActive === '1' || row.isActive?.toLowerCase() === 'true',
            },
          });
        }),
      );

      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        articleIdMap.set(`${row.articleNumber}::${row.site}`, results[j].id);
      }
    }

    // --- MOGs (deduplicated, batched parallel upserts) ---
    const mogIdMap = new Map<string, string>();
    const seenMogs = new Set<string>();
    const uniqueMogRows: MogRow[] = [];

    for (const row of mogRows) {
      const key = `${row.mogCode}::${row.siteCode}`;
      if (seenMogs.has(key)) continue;
      seenMogs.add(key);
      uniqueMogRows.push(row);
    }

    for (let i = 0; i < uniqueMogRows.length; i += UPSERT_BATCH_SIZE) {
      const chunk = uniqueMogRows.slice(i, i + UPSERT_BATCH_SIZE);
      const results = await Promise.all(
        chunk.map((row) => {
          const mogName = normalizeMogName(row.mogName ?? '', this.vocabMap);
          return this.prisma.mog.upsert({
            where: {
              mogCode_siteCode_batchId: {
                mogCode: row.mogCode,
                siteCode: row.siteCode,
                batchId,
              },
            },
            update: { mogName },
            create: {
              mogCode: row.mogCode,
              mogName,
              siteCode: row.siteCode,
              batchId,
              isActive:
                row.isActive === '1' || row.isActive?.toLowerCase() === 'true',
            },
          });
        }),
      );

      for (let j = 0; j < chunk.length; j++) {
        const row = chunk[j];
        mogIdMap.set(`${row.mogCode}::${row.siteCode}`, results[j].id);
      }
    }

    // --- Mappings ---
    // MogArticleMapping is unique per (mogId, batchId). A single MOG can appear
    // on multiple CSV rows (one per mapped article), so we deduplicate to the
    // last row per mogId before upserting — running concurrent upserts for the
    // same mogId would race and hit the unique constraint.
    const latestMappingByMogId = new Map<string, MogRow>();
    for (const row of mogRows) {
      const mogKey = `${row.mogCode}::${row.siteCode}`;
      if (mogIdMap.has(mogKey)) {
        latestMappingByMogId.set(mogKey, row);
      }
    }

    const dedupedMappingRows = [...latestMappingByMogId.values()];

    for (let i = 0; i < dedupedMappingRows.length; i += UPSERT_BATCH_SIZE) {
      const chunk = dedupedMappingRows.slice(i, i + UPSERT_BATCH_SIZE);
      await Promise.all(
        chunk.map((row) => {
          const mogKey = `${row.mogCode}::${row.siteCode}`;
          const mogId = mogIdMap.get(mogKey)!;

          const articleKey = row.articleNumber
            ? `${row.articleNumber}::${row.siteCode}`
            : null;
          const articleId = articleKey
            ? (articleIdMap.get(articleKey) ?? null)
            : null;

          const status = normalizeMapStatus(row.status);

          return this.prisma.mogArticleMapping.upsert({
            where: { mogId_batchId: { mogId, batchId } },
            update: { articleId, status },
            create: { mogId, articleId, status, batchId },
          });
        }),
      );
    }

    const distinctSites = [...new Set(mogRows.map((r) => r.siteCode))];

    // --- Update batch row counts and status ---
    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: 'PREPROCESSED',
        mogRowCount: seenMogs.size,
        aplRowCount: aplRows.length,
        completedAt: new Date(),
      },
    });

    return distinctSites;
  }
}
