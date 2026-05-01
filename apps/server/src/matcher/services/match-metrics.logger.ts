import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { ArticleMatchMetrics, SiteMatchMetrics } from '../core/matcher.types';

export interface BatchTotalParams {
  totalArticles: number;
  matched: number;
  noMatch: number;
  failed: number;
  totalTimeMs: number;
  totalCostUsd: number;
  totalTokens: number;
}

const DEFAULT_LOG_DIR = path.join(process.cwd(), 'logs');

@Injectable()
export class MatchMetricsLogger {
  private stream: fs.WriteStream | null = null;
  private currentBatchId: string | null = null;
  logDir: string = DEFAULT_LOG_DIR;

  open(batchId: string): void {
    this.currentBatchId = batchId;
    fs.mkdirSync(this.logDir, { recursive: true });
    const filePath = path.join(this.logDir, `match-metrics-${batchId}.log`);
    this.stream = fs.createWriteStream(filePath, { flags: 'a' });
    const timestamp = new Date().toISOString();
    this.write(`=== BATCH ${batchId} START ${timestamp} ===\n`);
  }

  logArticle(m: ArticleMatchMetrics): void {
    if (!this.stream) return;
    const costStr = `$${m.llmCostUsd.toFixed(4)}`;
    this.write(
      `[ARTICLE] id=${m.articleId}  article=${m.articleNumber}  fuzzy=${m.fuzzyTimeMs}ms  llm=${m.llmTimeMs}ms  total=${m.totalTimeMs}ms  cost=${costStr}  status=${m.status}\n`,
    );
  }

  logSite(m: SiteMatchMetrics): void {
    if (!this.stream) return;
    const costStr = `$${m.totalCostUsd.toFixed(3)}`;
    this.write(
      `--- SITE ${m.siteCode}: ${m.articles} articles | ${m.matched} matched, ${m.noMatch} no-match, ${m.failed} failed | time=${m.totalTimeMs}ms avg=${m.avgTimeMs}ms | cost=${costStr} ---\n`,
    );
  }

  logBatchTotal(p: BatchTotalParams): void {
    if (!this.stream) return;
    const costStr = `$${p.totalCostUsd.toFixed(3)}`;
    this.write(
      `=== BATCH ${this.currentBatchId} TOTAL: ${p.totalArticles} articles | ${p.matched} matched, ${p.noMatch} no-match, ${p.failed} failed | time=${p.totalTimeMs}ms | cost=${costStr} | tokens=${p.totalTokens} ===\n`,
    );
  }

  close(): void {
    if (!this.stream) return;
    this.stream.end();
    this.stream = null;
    this.currentBatchId = null;
  }

  private write(line: string): void {
    this.stream?.write(line);
  }
}
