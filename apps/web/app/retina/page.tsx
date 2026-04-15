'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useGetApls, useDeleteApl } from '@/services/apl/hooks';
import { ConfidenceBadge } from '@/components/retina/confidence-badge';
import { StatusBadge } from '@/components/retina/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Trash2, ImageIcon, ChevronRight, ScanEye, FlaskConical } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081';

export default function RetinaDashboard() {
  const { data: apls, isLoading, refetch } = useGetApls();
  const deleteApl = useDeleteApl();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await fetch(`${API_BASE}/seed`, { method: 'POST' });
      await refetch();
    } finally {
      setSeeding(false);
    }
  };

  const filtered = apls?.filter(
    (a) =>
      a.aplName.toLowerCase().includes(search.toLowerCase()) ||
      a.aplCode.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteApl.mutateAsync(deletingId);
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">APL Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage food product profiles and AI enrichment results
          </p>
        </div>
        <Link href="/retina/new">
          <Button>+ New APL</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search article number, description or category…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Article Number</TableHead>
              <TableHead>APL Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading && filtered?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-16 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <ScanEye className="size-8 opacity-30" />
                    <p>No APL records found</p>
                    <Link href="/retina/new">
                      <Button variant="outline" size="sm">
                        Add your first APL
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {filtered?.map((apl) => {
              const thumb = apl.images[0];
              return (
                <TableRow
                  key={apl.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    (window.location.href = `/retina/${apl.id}`)
                  }
                >
                  <TableCell>
                    {thumb ? (
                      <div className="relative size-10 overflow-hidden rounded-md border bg-muted">
                        <Image
                          src={`${API_BASE}/uploads/${thumb.filename}`}
                          alt={apl.aplName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-md border bg-muted">
                        <ImageIcon className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium">
                    {apl.aplCode}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{apl.aplName}</p>
                      {apl.result?.brand && (
                        <p className="text-xs text-muted-foreground">
                          {apl.result.brand}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {apl.category}
                  </TableCell>
                  <TableCell>
                    <ConfidenceBadge score={apl.result?.confidenceScore ?? null} />
                    {!apl.result?.confidenceScore && apl.images.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        No images
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={apl.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/retina/${apl.id}`}>
                        <Button variant="ghost" size="icon-sm">
                          <ChevronRight className="size-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(apl.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Stats summary */}
      {apls && apls.length > 0 && (
        <div className="grid grid-cols-3 gap-4 pt-2">
          {[
            {
              label: 'Total APLs',
              value: apls.length,
              color: 'text-foreground',
            },
            {
              label: 'Enriched',
              value: apls.filter((a) => a.status === 'Enriched').length,
              color: 'text-emerald-600',
            },
            {
              label: 'Needs Review',
              value: apls.filter((a) => a.status === 'Needs Review').length,
              color: 'text-orange-600',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border bg-card px-5 py-4"
            >
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`mt-1 text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Demo seed */}
      <div className="flex items-center justify-center border-t pt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeed}
          disabled={seeding}
          className="gap-2 text-muted-foreground"
        >
          <FlaskConical className="size-4" />
          {seeding ? 'Loading demo data…' : 'Load demo data (3 sample APLs)'}
        </Button>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete APL?</DialogTitle>
            <DialogDescription>
              This will permanently delete the APL record, all uploaded images,
              and AI enrichment results. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteApl.isPending}
            >
              {deleteApl.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
