'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreateApl } from '@/services/apl/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, Loader2 } from 'lucide-react';

const CATEGORIES = [
  'Beverages',
  'Bakery & Bread',
  'Dairy & Eggs',
  'Snacks & Confectionery',
  'Cereals & Breakfast',
  'Canned & Packaged Goods',
  'Frozen Foods',
  'Meat & Poultry',
  'Seafood',
  'Produce',
  'Condiments & Sauces',
  'Health & Nutrition',
  'Other',
];

export default function NewAplPage() {
  const router = useRouter();
  const createApl = useCreateApl();

  const [aplCode, setAplCode] = useState('');
  const [aplName, setAplName] = useState('');
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!aplCode.trim()) e.aplCode = 'Article number is required';
    if (!aplName.trim()) e.aplName = 'APL description is required';
    if (!category) e.category = 'Category is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const apl = await createApl.mutateAsync({ aplCode, aplName, category });
    router.push(`/retina/${apl.id}/upload`);
  };

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <Link
          href="/retina"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New APL</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new Approved Product Listing to begin AI food profile
          enrichment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-lg border bg-card p-6 space-y-5">
          {/* Article Number */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="aplCode">
              Article Number
            </label>
            <Input
              id="aplCode"
              placeholder="e.g. APL-2024-001"
              value={aplCode}
              onChange={(e) => setAplCode(e.target.value)}
              aria-invalid={!!errors.aplCode}
            />
            {errors.aplCode && (
              <p className="text-xs text-destructive">{errors.aplCode}</p>
            )}
          </div>

          {/* APL Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="aplName">
              APL Description
            </label>
            <Input
              id="aplName"
              placeholder="e.g. Kellogg's Corn Flakes 500g"
              value={aplName}
              onChange={(e) => setAplName(e.target.value)}
              aria-invalid={!!errors.aplName}
            />
            {errors.aplName && (
              <p className="text-xs text-destructive">{errors.aplName}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-invalid={!!errors.category}>
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/retina">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createApl.isPending}>
            {createApl.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create & Upload Images →'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
