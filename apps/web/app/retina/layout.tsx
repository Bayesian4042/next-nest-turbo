import type { ReactNode } from 'react';
import Link from 'next/link';
import { ScanEye } from 'lucide-react';

export const metadata = {
  title: 'RETINA.ai — Food Profile Intelligence',
  description: 'AI-powered food product enrichment for Compass Group',
};

export default function RetinaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/retina" className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary">
              <ScanEye className="size-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold tracking-tight">
              RETINA<span className="text-muted-foreground">.ai</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/retina"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/retina/new"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              + New APL
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
