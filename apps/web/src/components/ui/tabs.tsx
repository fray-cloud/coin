import { cn } from '@/lib/utils';

interface Tab {
  value: string;
  label: string;
  color?: string;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function Tabs({ tabs, value, onChange, size = 'sm', className }: TabsProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'rounded font-medium transition-colors',
            size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
            value === tab.value
              ? cn('text-white', tab.color || 'bg-primary')
              : 'bg-transparent border border-border text-muted-foreground hover:bg-muted',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
