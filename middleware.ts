import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// 管理画面のメインドメイン（環境変数で設定可能、デフォルトは akinai-dx.com）
const ADMIN_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || 'akinai-dx.com';

/**
 * ホスト名がショップドメインかどうかを判定する
 * - xxx.akinai-dx.com のようなサブドメイン
 * - frontend_url/shop_subdomain に登録された独自ドメイン
 */
function isShopDomain(hostname: string): boolean {
  // localhost は管理画面として扱う（開発用）
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false;

  // 管理画面ドメイン本体はショップではない
  if (hostname === ADMIN_DOMAIN) return false;

  // akinai-dx.com のサブドメインはショップ
  if (hostname.endsWith(`.${ADMIN_DOMAIN}`)) return true;

  // それ以外の独自ドメインはショップとして扱う
  // （管理画面ドメインでも localhost でもない外部ドメイン）
  return true;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.replace(/:\d+$/, '') || '';
  const pathname = request.nextUrl.pathname;

  // ショップドメインからのアクセスを処理
  if (isShopDomain(hostname)) {
    // 静的ファイル・APIは通過
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api/') ||
      pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)
    ) {
      return NextResponse.next();
    }

    // すでに /shop プレフィックスがある場合はそのまま通過
    if (pathname.startsWith('/shop')) {
      // ホスト名をヘッダーに付加して組織解決に使う
      const response = NextResponse.next();
      response.headers.set('x-shop-hostname', hostname);
      return response;
    }

    // / や /products など、shop プレフィックスなしのパスを /shop/... にリライト
    const url = request.nextUrl.clone();
    url.pathname = `/shop${pathname === '/' ? '' : pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set('x-shop-hostname', hostname);
    return response;
  }

  // 管理画面ドメインから /shop へ直接アクセスしたら404
  if (pathname.startsWith('/shop')) {
    const url = request.nextUrl.clone();
    url.pathname = '/not-found';
    return NextResponse.rewrite(url);
  }

  // 通常の管理画面セッション処理
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
