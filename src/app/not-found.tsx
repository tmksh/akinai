import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="text-center max-w-md space-y-6">
        <h1 className="text-6xl font-bold text-slate-200 dark:text-slate-700">404</h1>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          ページが見つかりません
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <Button asChild className="bg-orange-500 hover:bg-orange-600">
          <Link href="/dashboard">ダッシュボードへ戻る</Link>
        </Button>
      </div>
    </div>
  );
}
