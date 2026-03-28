'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Settings, KeyRound, Bell, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useUIMode } from '@/hooks/use-ui-mode';
import { useBaseCurrency, type BaseCurrency } from '@/hooks/use-base-currency';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { BalanceTable } from '@/components/accounts/balance-table';
import { useExchangeKeys } from '@/hooks/use-exchange-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createExchangeKey,
  deleteExchangeKey,
  getNotificationSettings,
  updateNotificationSettings,
} from '@/lib/api-client';
import { EXCHANGES } from '@/lib/constants';

const TABS = [
  { key: 'general', icon: Settings, label: '일반' },
  { key: 'accounts', icon: KeyRound, label: '계정' },
  { key: 'exchange-rate', icon: DollarSign, label: '환율' },
  { key: 'notifications', icon: Bell, label: '알림' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function GeneralTab() {
  const { mode, setMode, isEasy } = useUIMode();
  const { currency, setCurrency } = useBaseCurrency();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>UI Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('easy')}
              className={`p-4 rounded-lg border text-left transition-colors ${isEasy ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <p className="font-medium">🎯 Easy Mode</p>
              <p className="text-sm text-muted-foreground mt-1">
                간단한 UI, 원클릭 전략, 핵심 정보만
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode('advanced')}
              className={`p-4 rounded-lg border text-left transition-colors ${!isEasy ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <p className="font-medium">⚙️ Advanced Mode</p>
              <p className="text-sm text-muted-foreground mt-1">
                캔들차트, 기술지표, 상세 파라미터
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>기준 통화</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(['KRW', 'USD'] as BaseCurrency[]).map((c) => (
              <Button
                key={c}
                variant={currency === c ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrency(c)}
              >
                {c === 'KRW' ? '₩ 원화 (KRW)' : '$ 달러 (USD)'}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            마켓 가격이 선택한 통화로 환산되어 메인으로 표시됩니다.
          </p>
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

function AccountsTab() {
  const queryClient = useQueryClient();
  const [exchange, setExchange] = useState('upbit');
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const { data: keys = [], isLoading } = useExchangeKeys();

  const createMutation = useMutation({
    mutationFn: createExchangeKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeKeys'] });
      setApiKey('');
      setSecretKey('');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteExchangeKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exchangeKeys'] }),
  });
  const registeredExchanges = new Set(keys.map((k) => k.exchange));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>거래소 API 키 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({ exchange, apiKey, secretKey });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>거래소</Label>
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {EXCHANGES.map((ex) => (
                  <option
                    key={ex.value}
                    value={ex.value}
                    disabled={registeredExchanges.has(ex.value)}
                  >
                    {ex.label} {registeredExchanges.has(ex.value) ? '(등록됨)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Secret Key</Label>
              <Input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? '검증 중...' : '키 등록'}
            </Button>
          </form>
        </CardContent>
      </Card>
      {isLoading && <p className="text-muted-foreground">로딩 중...</p>}
      {keys.map((keyItem) => (
        <Card key={keyItem.id}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-4">
              <BalanceTable keyItem={keyItem} />
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive shrink-0 ml-4"
                onClick={() => deleteMutation.mutate(keyItem.id)}
              >
                삭제
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const RATE_SOURCES = [
  { value: 'dunamu', label: '두나무 (Dunamu)', desc: '업비트 기반 실시간 환율' },
  { value: 'fawazahmed0', label: 'Currency API', desc: '무료, 200+ 통화, 일일 갱신' },
];

function ExchangeRateTab() {
  const { krwPerUsd, updatedAt, isLoading } = useExchangeRate();
  const [source, setSource] = useState(
    () => localStorage.getItem('exchangeRateSource') || 'dunamu',
  );

  const handleSourceChange = (newSource: string) => {
    setSource(newSource);
    localStorage.setItem('exchangeRateSource', newSource);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>현재 환율</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">USD → KRW</p>
            <p className="text-2xl font-bold tabular-nums">
              1 USD ={' '}
              {krwPerUsd
                ? krwPerUsd.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
                : '조회 중...'}{' '}
              KRW
            </p>
            {updatedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                마지막 갱신: {new Date(updatedAt).toLocaleString()}
              </p>
            )}
            {!krwPerUsd && !isLoading && (
              <p className="text-xs text-destructive mt-1">
                환율을 가져올 수 없습니다. Worker 서비스를 확인하세요.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>환율 소스</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {RATE_SOURCES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => handleSourceChange(s.value)}
              className={`w-full p-3 rounded-lg border text-left transition-colors ${
                source === s.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <p className="font-medium text-sm">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </button>
          ))}
          <p className="text-xs text-muted-foreground">
            환율 소스 변경은 다음 갱신 주기(5분)에 적용됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const queryClient = useQueryClient();
  const [chatId, setChatId] = useState('');
  const [saved, setSaved] = useState(false);
  const { data: settings, isLoading } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: getNotificationSettings,
  });
  const mutation = useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) return <p className="text-muted-foreground">로딩 중...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>텔레그램</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>1. Telegram에서 봇을 검색하고 /start를 보내세요</p>
            <p>2. 봇이 알려주는 Chat ID를 아래에 입력하세요</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={chatId || settings?.telegramChatId || ''}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Chat ID"
            />
            <Button
              onClick={() =>
                mutation.mutate({ telegramChatId: chatId || settings?.telegramChatId || '' })
              }
              disabled={mutation.isPending}
              size="sm"
            >
              {mutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
          {settings?.telegramChatId && (
            <p className="text-xs text-green-600">연결됨: {settings.telegramChatId}</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>알림 유형</CardTitle>
        </CardHeader>
        <CardContent>
          <ToggleSwitch
            label="주문 체결 / 실패"
            checked={settings?.notifyOrders ?? true}
            onChange={(v) => mutation.mutate({ notifyOrders: v })}
          />
          <ToggleSwitch
            label="전략 시그널"
            checked={settings?.notifySignals ?? true}
            onChange={(v) => mutation.mutate({ notifySignals: v })}
          />
          <ToggleSwitch
            label="리스크 차단"
            checked={settings?.notifyRisks ?? false}
            onChange={(v) => mutation.mutate({ notifyRisks: v })}
          />
          {saved && <p className="text-xs text-green-600 mt-2">설정이 저장되었습니다</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || 'general';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'accounts' && <AccountsTab />}
      {activeTab === 'exchange-rate' && <ExchangeRateTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
