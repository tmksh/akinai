'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="text-center max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          問題が発生しました
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          申し訳ございません。一時的なエラーが発生しました。お手数ですが再度お試しください。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default" className="bg-orange-500 hover:bg-orange-600">
            もう一度試す
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">ダッシュボードへ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
