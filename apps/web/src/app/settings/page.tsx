'use client';

import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useUIMode } from '@/hooks/use-ui-mode';

export default function SettingsPage() {
  const { mode, setMode, isEasy } = useUIMode();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>UI Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('easy')}
              className={`p-4 rounded-lg border text-left transition-colors ${
                isEasy ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <p className="font-medium">🎯 Easy Mode</p>
              <p className="text-sm text-muted-foreground mt-1">
                간단한 UI, 원클릭 전략 생성, 핵심 정보만 표시
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode('advanced')}
              className={`p-4 rounded-lg border text-left transition-colors ${
                !isEasy ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <p className="font-medium">⚙️ Advanced Mode</p>
              <p className="text-sm text-muted-foreground mt-1">
                캔들차트, 기술지표, 상세 파라미터, 리스크 관리
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Theme</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Language</span>
            <LanguageSwitcher />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
