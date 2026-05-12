'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function AdminError({
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
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <h2 className="text-xl font-bold">エラーが発生しました</h2>
      <p className="text-muted-foreground text-sm max-w-md">
        申し訳ございません。ページの読み込み中にエラーが発生しました。
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="text-xs text-left bg-muted p-3 rounded-md max-w-lg overflow-auto">
          {error.message}
        </pre>
      )}
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          もう一度試す
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">ダッシュボードへ</Link>
        </Button>
      </div>
    </div>
  );
}
