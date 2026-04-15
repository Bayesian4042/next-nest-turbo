'use client';

import { useCallback, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useGetApl, useUploadImages } from '@/services/apl/hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ImagePlus, Loader2, X, CheckCircle2, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UploadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: apl, isLoading } = useGetApl(params.id);
  const uploadImages = useUploadImages(params.id);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    const imageFiles = newFiles.filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...imageFiles]);
    imageFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPreviews((prev) => [...prev, url]);
    });
  }, []);

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const handleSubmit = async () => {
    if (!files.length) return;
    await uploadImages.mutateAsync(files);
    setSubmitted(true);
    setTimeout(() => router.push(`/retina/${params.id}`), 1500);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-16 text-center">
          <CheckCircle2 className="size-12 text-emerald-500" />
          <div>
            <h2 className="text-xl font-semibold">Images uploaded!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              RETINA.ai is now processing your packet images…
            </p>
          </div>
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href={`/retina/${params.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to APL
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Upload Packet Images</h1>
        {apl && (
          <p className="mt-1 text-sm text-muted-foreground">
            {apl.aplCode} — {apl.aplName}
          </p>
        )}
      </div>

      {/* Drop Zone */}
      <div
        className={cn(
          'relative flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-muted/30 transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50',
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
        <UploadCloud className={cn('size-10', isDragging ? 'text-primary' : 'text-muted-foreground')} />
        <div className="text-center">
          <p className="font-medium">
            {isDragging ? 'Drop images here' : 'Drag & drop packet images'}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            or click to browse — JPEG, PNG, WebP supported
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1"
          onClick={(e) => { e.stopPropagation(); document.getElementById('file-input')?.click(); }}
        >
          <ImagePlus className="size-4" />
          Select images
        </Button>
      </div>

      {/* Previews */}
      {previews.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {files.length} image{files.length > 1 ? 's' : ''} selected
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {previews.map((src, i) => (
              <div
                key={i}
                className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
              >
                <Image
                  src={src}
                  alt={files[i].name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/50 p-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 truncate">
                  {files[i].name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link href={`/retina/${params.id}`}>
          <Button variant="outline">Skip for now</Button>
        </Link>
        <Button
          onClick={handleSubmit}
          disabled={files.length === 0 || uploadImages.isPending}
        >
          {uploadImages.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <UploadCloud className="size-4" />
              Upload & Analyse
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
