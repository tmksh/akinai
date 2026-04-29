/**
 * お気に入り（フォロー）API
 *
 * POST   /api/v1/favorites  — お気に入り登録
 * DELETE /api/v1/favorites  — お気に入り解除
 * GET    /api/v1/favorites  — お気に入り一覧取得
 *
 * type: "product"  → product_favorites テーブル
 * type: "supplier" → supplier_favorites テーブル
 *
 * ログイン済みバイヤー: customerId を指定
 * 非ログイン:          sessionId  を指定
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  withApiLogging,
} from '@/lib/api/auth';

export function OPTIONS() {
  return handleOptions();
}

type FavoriteType = 'product' | 'supplier';

interface FavoriteBody {
  type?: FavoriteType;
  targetId?: string;    // productId or supplierId
  supplierId?: string;  // type:"product" のとき、その商品を出品しているサプライヤーID（任意）
  customerId?: string;  // ログイン済みバイヤー
  sessionId?: string;   // 非ログインセッション
}

function validateBody(body: FavoriteBody): string | null {
  if (!body.type || !['product', 'supplier'].includes(body.type)) {
    return 'type must be "product" or "supplier"';
  }
  if (!body.targetId) return 'targetId is required';
  if (!body.customerId && !body.sessionId) {
    return 'customerId or sessionId is required';
  }
  return null;
}

/** POST /api/v1/favorites — お気に入り登録（冪等: 重複登録は無視） */
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  return withApiLogging(request, auth, async () => {
    if (!auth.success) return apiError(auth.error || 'Unauthorized', auth.status || 401);

    const body = await request.json().catch(() => null) as FavoriteBody | null;
    if (!body) return apiError('Invalid JSON body', 400);

    const validationError = validateBody(body);
    if (validationError) return apiError(validationError, 400);

    const { type, targetId, customerId, sessionId } = body;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (type === 'product') {
      // 商品の存在確認
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', targetId!)
        .eq('organization_id', auth.organizationId!)
        .single();
      if (!product) return apiError('Product not found', 404);

      const { error } = await supabase
        .from('product_favorites')
        .upsert(
          {
            organization_id: auth.organizationId!,
            product_id: targetId!,
            // supplier_id は呼び出し元が明示する場合のみ設定（リクエストボディの supplierId）
            supplier_id: body.supplierId || null,
            customer_id: customerId || null,
            session_id: sessionId || null,
          },
          { onConflict: customerId ? 'product_id,customer_id' : 'product_id,session_id', ignoreDuplicates: true }
        );
      if (error) return apiError('Failed to save favorite', 500);

    } else {
      // supplier: サプライヤーの存在確認
      const { data: supplier } = await supabase
        .from('customers')
        .select('id, role')
        .eq('id', targetId!)
        .eq('organization_id', auth.organizationId!)
        .single();
      if (!supplier) return apiError('Supplier not found', 404);

      const { error } = await supabase
        .from('supplier_favorites')
        .upsert(
          {
            organization_id: auth.organizationId!,
            supplier_id: targetId!,
            customer_id: customerId || null,
            session_id: sessionId || null,
          },
          { onConflict: customerId ? 'supplier_id,customer_id' : 'supplier_id,session_id', ignoreDuplicates: true }
        );
      if (error) return apiError('Failed to save favorite', 500);
    }

    return apiSuccess({ favorited: true, type, targetId });
  });
}

/** DELETE /api/v1/favorites — お気に入り解除 */
export async function DELETE(request: NextRequest) {
  const auth = await validateApiKey(request);
  return withApiLogging(request, auth, async () => {
    if (!auth.success) return apiError(auth.error || 'Unauthorized', auth.status || 401);

    const body = await request.json().catch(() => null) as FavoriteBody | null;
    if (!body) return apiError('Invalid JSON body', 400);

    const validationError = validateBody(body);
    if (validationError) return apiError(validationError, 400);

    const { type, targetId, customerId, sessionId } = body;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (type === 'product') {
      let query = supabase
        .from('product_favorites')
        .delete()
        .eq('product_id', targetId!)
        .eq('organization_id', auth.organizationId!);
      if (customerId) query = query.eq('customer_id', customerId);
      else            query = query.eq('session_id', sessionId!);
      const { error } = await query;
      if (error) return apiError('Failed to remove favorite', 500);

    } else {
      let query = supabase
        .from('supplier_favorites')
        .delete()
        .eq('supplier_id', targetId!)
        .eq('organization_id', auth.organizationId!);
      if (customerId) query = query.eq('customer_id', customerId);
      else            query = query.eq('session_id', sessionId!);
      const { error } = await query;
      if (error) return apiError('Failed to remove favorite', 500);
    }

    return apiSuccess({ favorited: false, type, targetId });
  });
}

/**
 * GET /api/v1/favorites
 *
 * 2つのモードで使用できます。
 *
 * 【順引き】自分がお気に入り登録したものを取得
 *   type        "product" | "supplier"   必須
 *   customerId  string                   ログイン済みバイヤーのID
 *   sessionId   string                   非ログインセッションID（customerId未指定時）
 *
 * 【逆引き】自分をお気に入り登録した顧客一覧を取得（案C）
 *   type        "product" | "supplier"   必須
 *   targetId    string                   商品IDまたはサプライヤー顧客ID
 *   （customerId / sessionId は不要）
 *
 * 共通 Query params:
 *   page        number  default 1
 *   limit       number  default 20, max 100
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  return withApiLogging(request, auth, async () => {
    if (!auth.success) return apiError(auth.error || 'Unauthorized', auth.status || 401);

    const { searchParams } = new URL(request.url);
    const type       = searchParams.get('type') as FavoriteType | null;
    const customerId = searchParams.get('customerId');
    const sessionId  = searchParams.get('sessionId');
    const targetId   = searchParams.get('targetId');  // 逆引き用
    const page       = Math.max(1, Number(searchParams.get('page')  || 1));
    const limit      = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
    const offset     = (page - 1) * limit;

    if (!type || !['product', 'supplier'].includes(type)) {
      return apiError('type must be "product" or "supplier"', 400);
    }

    const isReverse = !!targetId;
    if (!isReverse && !customerId && !sessionId) {
      return apiError('customerId, sessionId, or targetId is required', 400);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── 逆引きモード: 「この商品/サプライヤーをお気に入りした顧客」一覧 ──
    if (isReverse) {
      if (type === 'product') {
        const { data, error, count } = await supabase
          .from('product_favorites')
          .select(`
            id,
            created_at,
            customer:customers!product_favorites_customer_id_fkey(
              id, name, email, role, status
            )
          `, { count: 'exact' })
          .eq('product_id', targetId!)
          .eq('organization_id', auth.organizationId!)
          .not('customer_id', 'is', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        if (error) return apiError('Failed to fetch favorites', 500);
        return apiSuccess({ favoriters: data || [], total: count || 0, page, limit });

      } else {
        // type === 'supplier': このサプライヤーを直接フォローした顧客
        const { data, error, count } = await supabase
          .from('supplier_favorites')
          .select(`
            id,
            created_at,
            customer:customers!supplier_favorites_customer_id_fkey(
              id, name, email, role, status
            )
          `, { count: 'exact' })
          .eq('supplier_id', targetId!)
          .eq('organization_id', auth.organizationId!)
          .not('customer_id', 'is', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        if (error) return apiError('Failed to fetch favorites', 500);
        return apiSuccess({ favoriters: data || [], total: count || 0, page, limit });
      }
    }

    // ── 順引きモード: 「自分がお気に入りしたもの」一覧 ──
    if (type === 'product') {
      let query = supabase
        .from('product_favorites')
        .select(`
          id,
          created_at,
          product:products!product_favorites_product_id_fkey(
            id, name, slug, status
          )
        `, { count: 'exact' })
        .eq('organization_id', auth.organizationId!)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (customerId) query = query.eq('customer_id', customerId);
      else            query = query.eq('session_id', sessionId!);

      const { data, error, count } = await query;
      if (error) return apiError('Failed to fetch favorites', 500);
      return apiSuccess({ favorites: data || [], total: count || 0, page, limit });

    } else {
      let query = supabase
        .from('supplier_favorites')
        .select(`
          id,
          created_at,
          supplier:customers!supplier_favorites_supplier_id_fkey(
            id, name, email, role
          )
        `, { count: 'exact' })
        .eq('organization_id', auth.organizationId!)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (customerId) query = query.eq('customer_id', customerId);
      else            query = query.eq('session_id', sessionId!);

      const { data, error, count } = await query;
      if (error) return apiError('Failed to fetch favorites', 500);
      return apiSuccess({ favorites: data || [], total: count || 0, page, limit });
    }
  });
}
