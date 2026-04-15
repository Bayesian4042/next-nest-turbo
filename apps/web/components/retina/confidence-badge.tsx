import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConfidenceBadgeProps {
  score: number | null;
  className?: string;
}

export function ConfidenceBadge({ score, className }: ConfidenceBadgeProps) {
  if (score === null) return null;

  const level = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low';

  return (
    <Badge
      className={cn(
        'font-semibold',
        level === 'high' && 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
        level === 'medium' && 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
        level === 'low' && 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400',
        className,
      )}
    >
      {score}% {level === 'high' ? '· High' : level === 'medium' ? '· Medium' : '· Low'}
    </Badge>
  );
}
