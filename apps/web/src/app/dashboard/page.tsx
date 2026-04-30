'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            LLM-driven Binance Futures trading is being rebuilt. Check back soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
