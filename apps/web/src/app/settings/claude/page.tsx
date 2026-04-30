'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getClaudeTokenStatus, saveClaudeToken, deleteClaudeToken } from '@/lib/api-client';

export default function ClaudeSettingsPage() {
  const qc = useQueryClient();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['claudeToken'],
    queryFn: getClaudeTokenStatus,
  });

  const saveMutation = useMutation({
    mutationFn: saveClaudeToken,
    onSuccess: () => {
      setToken('');
      setError('');
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['claudeToken'] });
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClaudeToken,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['claudeToken'] });
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Claude OAuth Token</h1>
      <p className="text-sm text-muted-foreground">
        LLM 트레이드 신호는 사용자의 Claude Pro/Max 구독을 통해 생성됩니다. 본인 계정에서{' '}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">claude setup-token</code> 을 실행하여
        장기 OAuth 토큰을 발급한 후 아래에 붙여넣으세요. 토큰은 AES-256-GCM으로 암호화되어 저장되며,
        트레이드 신호 호출 시점에만 워커가 복호화합니다.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">상태</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          ) : status?.registered ? (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded">
                  등록됨
                </span>{' '}
                <span className="text-muted-foreground">
                  최종 갱신: {status.updatedAt && new Date(status.updatedAt).toLocaleString()}
                </span>
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                토큰 삭제
              </Button>
            </div>
          ) : (
            <p className="text-sm text-yellow-600">토큰 미등록</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {status?.registered ? '토큰 갱신' : '토큰 등록'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="sk-ant-oat01-..."
            className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          {saved && <p className="text-xs text-green-600">저장되었습니다.</p>}
          <div className="flex gap-2">
            <Button
              onClick={() => saveMutation.mutate(token)}
              disabled={!token || token.length < 20 || saveMutation.isPending}
            >
              {saveMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            발급 방법: 터미널에서{' '}
            <code className="bg-muted px-1 py-0.5 rounded">claude setup-token</code> 실행 → 안내된
            OAuth 흐름 완료 → 출력된 토큰을 위 입력란에 붙여넣기.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
