import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { AplStatus } from '@/services/apl/types';

interface StatusBadgeProps {
  status: AplStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        'gap-1 font-medium',
        status === 'Processing' && 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
        status === 'Enriched' && 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
        status === 'Needs Review' && 'bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
        className,
      )}
    >
      {status === 'Processing' && <Loader2 className="size-3 animate-spin" />}
      {status}
    </Badge>
  );
}
