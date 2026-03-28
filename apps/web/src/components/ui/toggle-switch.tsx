import { cn } from '@/lib/utils';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  size = 'md',
  className,
}: ToggleSwitchProps) {
  const trackSize = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const thumbSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const thumbTranslate = size === 'sm' ? 'translate-x-5' : 'translate-x-6';

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {label && <span className="text-sm">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex items-center rounded-full transition-colors',
          trackSize,
          checked ? 'bg-green-500' : 'bg-gray-300',
        )}
      >
        <span
          className={cn(
            'inline-block transform rounded-full bg-white transition-transform',
            thumbSize,
            checked ? thumbTranslate : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}
