'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useGetApl } from '@/services/apl/hooks';
import { ConfidenceBadge } from '@/components/retina/confidence-badge';
import { ConfidenceRing } from '@/components/retina/confidence-ring';
import { StatusBadge } from '@/components/retina/status-badge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft,
  ImagePlus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import type { AplResult } from '@/services/apl/types';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081';

function parseJsonField<T>(value: unknown): T | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

function NutritionTable({ values }: { values: Record<string, string> }) {
  const entries = Object.entries(values).filter(([, v]) => v);
  if (!entries.length)
    return <p className="text-sm text-muted-foreground">No nutrition data available</p>;
  return (
    <div className="divide-y rounded-lg border">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
          <span className="capitalize text-muted-foreground">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </span>
          <span className="font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}

function TagList({ items, color = 'default' }: { items: string[]; color?: 'red' | 'amber' | 'default' }) {
  if (!items.length)
    return <p className="text-sm text-muted-foreground">None identified</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <Badge
          key={i}
          variant="secondary"
          className={cn(
            color === 'red' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            color === 'amber' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
          )}
        >
          {item}
        </Badge>
      ))}
    </div>
  );
}

function FieldConfidenceRow({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const color =
    score >= 75 ? 'bg-emerald-500' : score >= 45 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground capitalize">{label}</span>
        <span className="font-medium">{score}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ProcessingState({ aplId }: { aplId: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="relative">
        <div className="size-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-lg">Analysing Packet Images</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          RETINA.ai is extracting food profile details and enriching them with
          AI-powered research. This usually takes 15–30 seconds.
        </p>
      </div>
      <div className="w-64 space-y-2 text-left">
        {['Parsing image labels', 'Extracting ingredients & allergens', 'AI web enrichment', 'Scoring confidence'].map(
          (step, i) => (
            <div key={step} className="flex items-center gap-2 text-sm">
              <Loader2 className={cn('size-3.5', i === 0 ? 'animate-spin text-blue-500' : 'text-muted-foreground/40')} />
              <span className={i === 0 ? 'font-medium' : 'text-muted-foreground/60'}>{step}</span>
            </div>
          ),
        )}
      </div>
      <Link href={`/retina/${aplId}/upload`}>
        <Button variant="outline" size="sm" className="mt-2">
          <ImagePlus className="size-4" />
          Add more images
        </Button>
      </Link>
    </div>
  );
}

function NoImagesState({ aplId }: { aplId: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <ImagePlus className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold">No images uploaded yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload packet images to begin AI food profile extraction.
        </p>
      </div>
      <Link href={`/retina/${aplId}/upload`}>
        <Button>Upload Images</Button>
      </Link>
    </div>
  );
}

export default function AplDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: apl, isLoading } = useGetApl(params.id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!apl) return null;

  const result = apl.result as (AplResult & {
    ingredients: unknown;
    allergens: unknown;
    probableAllergens: unknown;
    nutritionValues: unknown;
    enrichedData: unknown;
    confidenceDetails: unknown;
    sources: unknown;
  }) | null;

  const ingredients = parseJsonField<string[]>(result?.ingredients) ?? [];
  const allergens = parseJsonField<string[]>(result?.allergens) ?? [];
  const probableAllergens = parseJsonField<string[]>(result?.probableAllergens) ?? [];
  const nutritionValues = parseJsonField<Record<string, string>>(result?.nutritionValues) ?? {};
  const enrichedData = parseJsonField<{
    productName?: string;
    brand?: string;
    ingredients?: string[];
    allergens?: string[];
    probableAllergens?: string[];
    nutritionValues?: Record<string, string>;
    additionalInfo?: string;
  }>(result?.enrichedData);
  const confidenceDetails = parseJsonField<Record<string, number>>(result?.confidenceDetails);
  const sources = parseJsonField<string[]>(result?.sources) ?? [];

  const isProcessing = apl.status === 'Processing';
  const hasImages = apl.images.length > 0;
  const hasResult = !!result;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <Link
          href="/retina"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Dashboard
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{apl.aplName}</h1>
              <StatusBadge status={apl.status} />
              {result?.confidenceScore != null && (
                <ConfidenceBadge score={result.confidenceScore} />
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <span className="font-mono">{apl.aplCode}</span>
              <span>·</span>
              <span>{apl.category}</span>
              {result?.brand && (
                <>
                  <span>·</span>
                  <span>{result.brand}</span>
                </>
              )}
              {apl.barcode && (
                <>
                  <span>·</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    {apl.barcode}
                  </span>
                </>
              )}
            </div>
          </div>
          <Link href={`/retina/${apl.id}/upload`}>
            <Button variant="outline" size="sm">
              <ImagePlus className="size-4" />
              Upload Images
            </Button>
          </Link>
        </div>
      </div>

      {/* No images yet */}
      {!hasImages && !isProcessing && <NoImagesState aplId={apl.id} />}

      {/* Processing */}
      {isProcessing && <ProcessingState aplId={apl.id} />}

      {/* Results */}
      {hasResult && !isProcessing && (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {apl.barcode && sources.some((s) => s.includes('Open Food Facts')) && (
              <TabsTrigger value="barcode">Barcode Data</TabsTrigger>
            )}
            <TabsTrigger value="parsed">Parsed from Label</TabsTrigger>
            <TabsTrigger value="enriched">AI Enriched</TabsTrigger>
            <TabsTrigger value="confidence">Confidence</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left: images */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Packet Images
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {apl.images.map((img) => (
                    <div
                      key={img.id}
                      className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
                    >
                      <Image
                        src={`${API_BASE}/uploads/${img.filename}`}
                        alt={img.originalName}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Middle: key details */}
              <div className="space-y-4 lg:col-span-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Allergens
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {allergens.length > 0 ? (
                        <TagList items={allergens} color="red" />
                      ) : (
                        <p className="text-sm text-muted-foreground">None declared</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Probable Allergens
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TagList items={probableAllergens} color="amber" />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Nutrition Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <NutritionTable values={nutritionValues} />
                  </CardContent>
                </Card>

                {result?.reasoning && (
                  <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
                    {apl.status === 'Enriched' ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange-500" />
                    )}
                    <p className="text-sm leading-relaxed">{result.reasoning}</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* BARCODE DATA */}
          {apl.barcode && sources.some((s) => s.includes('Open Food Facts')) && (
            <TabsContent value="barcode" className="mt-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-900/20">
                  <Info className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-emerald-800 dark:text-emerald-300">
                    Data fetched from{' '}
                    <a
                      href={`https://world.openfoodfacts.org/product/${apl.barcode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 font-medium"
                    >
                      Open Food Facts
                    </a>{' '}
                    using barcode <span className="font-mono">{apl.barcode}</span>.
                    Image label data (if provided) overrides these values.
                  </span>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Product Identity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Product Name
                        </p>
                        <p className="mt-0.5 font-medium">
                          {result?.productName ?? (
                            <span className="text-muted-foreground italic">Not found</span>
                          )}
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Brand
                        </p>
                        <p className="mt-0.5 font-medium">
                          {result?.brand ?? (
                            <span className="text-muted-foreground italic">Not found</span>
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Allergens (from barcode)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                          Declared
                        </p>
                        <TagList items={allergens} color="red" />
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                          Probable (traces)
                        </p>
                        <TagList items={probableAllergens} color="amber" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Ingredients (from barcode)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TagList items={ingredients} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Nutrition (from barcode)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <NutritionTable values={nutritionValues} />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )}

          {/* PARSED */}
          <TabsContent value="parsed" className="mt-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Product Identity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Product Name
                    </p>
                    <p className="mt-0.5 font-medium">
                      {result?.productName ?? <span className="text-muted-foreground italic">Not detected</span>}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Brand
                    </p>
                    <p className="mt-0.5 font-medium">
                      {result?.brand ?? <span className="text-muted-foreground italic">Not detected</span>}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Allergens (from label)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                      Declared
                    </p>
                    <TagList items={allergens} color="red" />
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                      Probable
                    </p>
                    <TagList items={probableAllergens} color="amber" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ingredients (from label)</CardTitle>
                </CardHeader>
                <CardContent>
                  <TagList items={ingredients} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Nutrition (from label)</CardTitle>
                </CardHeader>
                <CardContent>
                  <NutritionTable values={nutritionValues} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ENRICHED */}
          <TabsContent value="enriched" className="mt-6">
            {!enrichedData ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                <Info className="size-4 shrink-0" />
                Enrichment data not yet available.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-900/20">
                  <Sparkles className="size-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-800 dark:text-blue-300">
                    AI-enriched data is derived from the packet label combined
                    with knowledge base research.
                  </span>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Enriched Identity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Product</p>
                        <p className="mt-0.5 font-medium">
                          {enrichedData.productName ?? result?.productName ?? <span className="italic text-muted-foreground">Unknown</span>}
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Brand</p>
                        <p className="mt-0.5 font-medium">
                          {enrichedData.brand ?? result?.brand ?? <span className="italic text-muted-foreground">Unknown</span>}
                        </p>
                      </div>
                      {enrichedData.additionalInfo && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Additional Info</p>
                            <p className="mt-0.5 text-sm leading-relaxed">{enrichedData.additionalInfo}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Enriched Allergens</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Declared</p>
                        <TagList items={enrichedData.allergens ?? allergens} color="red" />
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Probable</p>
                        <TagList items={enrichedData.probableAllergens ?? probableAllergens} color="amber" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Enriched Ingredients</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TagList items={enrichedData.ingredients ?? ingredients} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Enriched Nutrition</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <NutritionTable
                        values={
                          Object.keys(enrichedData.nutritionValues ?? {}).length
                            ? (enrichedData.nutritionValues ?? {})
                            : nutritionValues
                        }
                      />
                    </CardContent>
                  </Card>
                </div>

                {sources.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Sources</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {sources.map((src, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground">{src}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* CONFIDENCE */}
          <TabsContent value="confidence" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Ring */}
              <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-8 gap-4">
                {result?.confidenceScore != null && (
                  <ConfidenceRing score={result.confidenceScore} size={140} />
                )}
                <div className="text-center">
                  <p className="text-sm font-medium">Overall Confidence</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Based on label clarity and AI validation
                  </p>
                </div>
              </div>

              {/* Field breakdown + reasoning */}
              <div className="space-y-5 lg:col-span-2">
                {confidenceDetails && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Field-level Confidence</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(confidenceDetails).map(([field, score]) => (
                        <FieldConfidenceRow key={field} label={field} score={score} />
                      ))}
                    </CardContent>
                  </Card>
                )}

                {result?.reasoning && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">AI Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3">
                        {apl.status === 'Enriched' ? (
                          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-orange-500" />
                        )}
                        <p className="text-sm leading-relaxed">{result.reasoning}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
                  <p className="font-medium">Confidence Scale</p>
                  <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-full bg-emerald-500" />
                      <span>75–100% · High</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-full bg-amber-500" />
                      <span>45–74% · Medium</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-full bg-red-500" />
                      <span>0–44% · Low</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Has images but no result yet and not processing */}
      {hasImages && !hasResult && !isProcessing && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <AlertTriangle className="size-10 text-orange-500" />
          <div>
            <h3 className="font-semibold">Processing incomplete</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The AI pipeline did not complete. Try uploading the images again.
            </p>
          </div>
          <Link href={`/retina/${apl.id}/upload`}>
            <Button variant="outline">Re-upload Images</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
