'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { getNotificationSettings, updateNotificationSettings } from '@/lib/api-client';

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-green-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function NotificationsPage() {
  const t = useTranslations('notifications');
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

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('telegram')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>{t('telegramStep1')}</p>
            <p>{t('telegramStep2')}</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={chatId || settings?.telegramChatId || ''}
              onChange={(e) => setChatId(e.target.value)}
              placeholder={t('chatIdPlaceholder')}
            />
            <Button
              onClick={() =>
                mutation.mutate({
                  telegramChatId: chatId || settings?.telegramChatId || '',
                })
              }
              disabled={mutation.isPending}
              size="sm"
            >
              {mutation.isPending ? t('saving') : t('save')}
            </Button>
          </div>
          {settings?.telegramChatId && (
            <p className="text-xs text-green-600">
              {t('connected', { chatId: settings.telegramChatId })}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('types')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Toggle
            label={t('orderFilled')}
            checked={settings?.notifyOrders ?? true}
            onChange={(v) => mutation.mutate({ notifyOrders: v })}
          />
          <Toggle
            label={t('strategySignals')}
            checked={settings?.notifySignals ?? true}
            onChange={(v) => mutation.mutate({ notifySignals: v })}
          />
          <Toggle
            label={t('riskBlocked')}
            checked={settings?.notifyRisks ?? false}
            onChange={(v) => mutation.mutate({ notifyRisks: v })}
          />
          {saved && <p className="text-xs text-green-600 mt-2">{t('saved')}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
