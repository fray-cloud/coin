import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={cn('relative group inline-flex items-center', className)}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-max max-w-[200px] rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-normal text-center">
        {content}
      </span>
    </span>
  );
}
