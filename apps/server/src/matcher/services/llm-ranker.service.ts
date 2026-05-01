import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { generateObject } from 'ai';
import { z } from 'zod';
import pLimit from 'p-limit';
import openaiConfig from '@/config/llm.config';
import { PrismaService } from '@/prisma/prisma.service';
import { ArticleDto, CandidateScore } from '../core/matcher-strategy.interface';
import {
  LlmRankResultWithUsage,
  TokenUsage,
  COST_PER_M,
} from '../core/matcher.types';
import { LLM_MODEL, LanguageModel } from '../core/llm-model.token';

interface RankOptions {
  retries?: number;
  baseDelayMs?: number;
}

const MatchResponseSchema = z.object({
  MOGCode: z.string().nullable(),
  MOGName: z.string().nullable(),
  confidence_score: z.number().min(0).max(100),
  reason: z.string(),
});

const SYSTEM_PROMPT = `You are a food & grocery procurement expert mapping MOG names (Ingredient Name) to APL articles (Procurement Specification for the ingredient),
For an Indian food service company. As a procurement expert, you need to find the correct MOG for the APL article.

### Anatomy of MOG and APL
MOG: usually a name of a product/ingredient with state/form.
APL: usually a name of a product/ingredient with brand name, form/state, quantity.

### Examples of MOG and corresponding APL articles:
1. MOG: Carrot Frozen
   APL: Carrot, UB, Frozen, 1X1Kg
2. MOG: Chicken Mince Chilled
   APL: Chicken, UB, Keema, 1X1Kg

### TASK:
From the shortlisted MOG candidates for given APL, select the BEST match for the MOG name.
Base your decision ONLY on product type and form/state.

### ABBREVIATIONS & LOCAL NAMES:
{taxonomy_block}

### SCORING GUIDE:
- 90-100: exact product type and form/state match
- 70-89 : correct product type, minor qualifier difference like colour, ex: capsicum can be red or green etc.
- 40-69 : related but not identical product
- 0-39  : wrong product
- Return MOGCode: null if best score < 40

### DOMAIN KNOWLEDGE:
1. It is very important that product matches exactly, even similar products doesnt count.
2. MOG must completely match the APL product type.
3. American Corn is the same as Sweet Corn.
4. Aromatic Masala and Aromatic Seasoning are the same.
5. APL hierarchy fields may contain human errors; in that case rely on ArticleDescription.

### IMPLICIT KNOWLEDGE:
1. Sometimes MOG name or APL does not contain exact information but comes from implicit/contextual information like Almond Giri, it has no state information like broken, with skin etc. so its default state is "Whole with skin".
2. Ingredient states, sometimes implies the same form of the product like if masala/powder, then this masala/powder is also RTU (Ready to Use) masala/powder, because the masala/powder can be used directly without any preparation.`;

@Injectable()
export class LlmRankerService implements OnModuleInit {
  private readonly logger = new Logger(LlmRankerService.name);
  private taxonomyBlock: string | null = null;

  private inputTokens = 0;
  private outputTokens = 0;
  private requests = 0;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_MODEL) private readonly model: LanguageModel,
    @Inject(openaiConfig.KEY)
    private readonly config: ConfigType<typeof openaiConfig>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadTaxonomyBlock();
  }

  private async loadTaxonomyBlock(): Promise<void> {
    const entries = await this.prisma.mogVocab.findMany();
    if (entries.length === 0) {
      this.taxonomyBlock = '(no domain rules available)';
      return;
    }

    const lines = ['Abbreviations & Local Names:'];
    for (const entry of entries) {
      lines.push(`  ${entry.rawName} ↔ ${entry.normalizedName}`);
    }
    this.taxonomyBlock = lines.join('\n');
  }

  async rankOne(
    article: ArticleDto,
    candidates: CandidateScore[],
    options: RankOptions = {},
  ): Promise<LlmRankResultWithUsage> {
    const { retries = 3, baseDelayMs = 1000 } = options;

    const system = SYSTEM_PROMPT.replace(
      '{taxonomy_block}',
      this.taxonomyBlock ?? '(no domain rules available)',
    );

    const candidateLines = candidates
      .map(
        (c, i) =>
          `  ${i + 1}. MOGCode=${c.mogCode} | MOG Name: ${c.mogName} | Score: ${c.score}`,
      )
      .join('\n');

    const prompt =
      `APL ArticleNumber: ${article.articleNumber}\n` +
      `APL ArticleDescription: ${article.description}\n\n` +
      `APL More Details: ${article.hierLevel3 ?? ''} | ${article.hierLevel4 ?? ''} | ${article.hierLevel5 ?? ''} | ${article.hierLevel6 ?? ''}\n` +
      `Shortlisted MOG Candidates:\n${candidateLines}\n\n` +
      `Select the best matching MOGCode for this APL article.`;

    const callStart = performance.now();

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { object, usage } = await generateObject({
          model: this.model,
          system,
          prompt,
          schema: MatchResponseSchema,
          maxOutputTokens: 500,
          temperature: 0,
        });

        const inputTokens = usage.inputTokens ?? 0;
        const outputTokens = usage.outputTokens ?? 0;
        this.inputTokens += inputTokens;
        this.outputTokens += outputTokens;
        this.requests += 1;

        return {
          mogCode: object.MOGCode,
          mogName: object.MOGName,
          confidenceScore: object.confidence_score,
          reason: object.reason,
          usedWebSearch: false,
          inputTokens,
          outputTokens,
          llmTimeMs: Math.round(performance.now() - callStart),
        };
      } catch (err) {
        if (attempt < retries - 1) {
          await new Promise((r) =>
            setTimeout(r, baseDelayMs * Math.pow(2, attempt)),
          );
        } else {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `LLM failed for article ${article.articleNumber}: ${message}`,
          );
          return {
            mogCode: null,
            mogName: null,
            confidenceScore: 0,
            reason: message,
            usedWebSearch: false,
            inputTokens: 0,
            outputTokens: 0,
            llmTimeMs: Math.round(performance.now() - callStart),
          };
        }
      }
    }

    return {
      mogCode: null,
      mogName: null,
      confidenceScore: 0,
      reason: 'Exhausted retries',
      usedWebSearch: false,
      inputTokens: 0,
      outputTokens: 0,
      llmTimeMs: Math.round(performance.now() - callStart),
    };
  }

  async rankBatch(
    articles: ArticleDto[],
    candidateMap: Map<string, CandidateScore[]>,
  ): Promise<Map<string, LlmRankResultWithUsage>> {
    const limit = pLimit(this.config.maxWorkers);
    const results = new Map<string, LlmRankResultWithUsage>();

    await Promise.allSettled(
      articles.map((article) =>
        limit(async () => {
          const candidates = candidateMap.get(article.id) ?? [];
          const result = await this.rankOne(article, candidates);
          results.set(article.id, result);
        }),
      ),
    );

    return results;
  }

  getTokenUsage(): TokenUsage {
    const costUsd =
      (this.inputTokens / 1_000_000) * COST_PER_M.input +
      (this.outputTokens / 1_000_000) * COST_PER_M.output;

    return {
      requests: this.requests,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.inputTokens + this.outputTokens,
      costUsd: Math.round(costUsd * 10_000) / 10_000,
    };
  }

  resetTokenUsage(): void {
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.requests = 0;
  }
}
