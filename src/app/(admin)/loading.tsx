import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * 管理画面共通のローディングフォールバック。
 *
 * (admin) ルートグループ配下の動的ページは、固有の loading.tsx を持たない場合
 * このスケルトンが Suspense フォールバックとして即時表示される。
 * これにより、サーバーレンダリング完了を待たずに画面遷移の即応性を確保する。
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* 統計カード行 */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* メインコンテンツカード */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-10 w-full max-w-sm" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-[120px]" />
              <Skeleton className="h-10 w-[140px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
