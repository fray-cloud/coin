'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'onboarding_completed';

interface StepProps {
  icon: string;
  title: string;
  description: string;
  bullets?: string[];
}

function Step({ icon, title, description, bullets }: StepProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-4 px-2">
      <div className="text-5xl">{icon}</div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      {bullets && bullets.length > 0 && (
        <ul className="text-left space-y-2 w-full max-w-xs">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OnboardingWizard() {
  const t = useTranslations('onboarding');
  const { user, isLoading } = useUser();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isLoading && user) {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        setVisible(true);
      }
    }
  }, [user, isLoading]);

  useEffect(() => {
    const handler = () => {
      setStep(0);
      setVisible(true);
    };
    window.addEventListener('onboarding:open', handler);
    return () => window.removeEventListener('onboarding:open', handler);
  }, []);

  const steps: StepProps[] = [
    {
      icon: '🚀',
      title: t('step1Title'),
      description: t('step1Desc'),
      bullets: [t('step1b1'), t('step1b2'), t('step1b3')],
    },
    {
      icon: '🔑',
      title: t('step2Title'),
      description: t('step2Desc'),
      bullets: [t('step2b1'), t('step2b2'), t('step2b3')],
    },
    {
      icon: '🤖',
      title: t('step3Title'),
      description: t('step3Desc'),
      bullets: [t('step3b1'), t('step3b2'), t('step3b3')],
    },
    {
      icon: '📊',
      title: t('step4Title'),
      description: t('step4Desc'),
      bullets: [t('step4b1'), t('step4b2'), t('step4b3')],
    },
    {
      icon: '⚖️',
      title: t('step5Title'),
      description: t('step5Desc'),
      bullets: [t('step5b1'), t('step5b2'), t('step5b3')],
    },
  ];

  const complete = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      complete();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {t('stepLabel', { current: step + 1, total: steps.length })}
          </span>
          <button
            onClick={complete}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {t('skip')}
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-4">
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 pb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                i === step ? 'bg-primary' : i < step ? 'bg-primary/40' : 'bg-secondary',
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 pb-8 flex-1">
          <Step {...current} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-secondary/30">
          <Button variant="ghost" size="sm" onClick={prev} disabled={step === 0}>
            {t('back')}
          </Button>
          <Button size="sm" onClick={next}>
            {isLast ? t('finish') : t('next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
