'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ConfidenceRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ConfidenceRing({
  score,
  size = 120,
  strokeWidth = 10,
  className,
}: ConfidenceRingProps) {
  const [displayed, setDisplayed] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const level = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low';

  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0;
      const step = score / 40;
      const interval = setInterval(() => {
        current = Math.min(current + step, score);
        setDisplayed(Math.round(current));
        if (current >= score) clearInterval(interval);
      }, 30);
      return () => clearInterval(interval);
    }, 200);
    return () => clearTimeout(timer);
  }, [score]);

  const offset = circumference - (displayed / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            'transition-all duration-75',
            level === 'high' && 'stroke-emerald-500',
            level === 'medium' && 'stroke-amber-500',
            level === 'low' && 'stroke-red-500',
          )}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold">{displayed}%</span>
        <span
          className={cn(
            'text-xs font-medium capitalize',
            level === 'high' && 'text-emerald-600',
            level === 'medium' && 'text-amber-600',
            level === 'low' && 'text-red-600',
          )}
        >
          {level}
        </span>
      </div>
    </div>
  );
}
