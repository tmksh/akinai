/**
 * /api/stripe/customer-plans
 *
 * テナント管理者向け：顧客向けサブスクリプションプランの CRUD。
 * Stripe Connect の Connected Account 上に Product / Price を作成し、
 * organizations.settings.customer_subscription_plans に保存する。
 *
 * GET    : プラン一覧取得
 * POST   : プラン作成（Stripe Product/Price を Connected Account 上に生成）
 * PATCH  : プラン更新（料金が変わる場合は新しい Price を作成して差し替え）
 * DELETE : プラン削除（Stripe Price を archive して settings から除去）
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import {
  CustomerSubscriptionPlan,
  CustomerSubscriptionPlansSettings,
  CustomerRoleKey,
  SubscriptionInterval,
  readPlansSettings,
  toStripeUnitAmount,
} from '@/lib/customer-subscription-plans';

const VALID_ROLES: CustomerRoleKey[] = ['personal', 'buyer', 'supplier'];
const VALID_INTERVALS: SubscriptionInterval[] = ['month', 'year'];

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, key);
}

/** ログイン中のテナント管理者の organizationId と Stripe 接続情報を取得 */
async function resolveAdminContext(): Promise<
  | {
      success: true;
      organizationId: string;
      stripe: Stripe;
      stripeAccountId: string | null;
    }
  | { success: false; error: string; status: number }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized', status: 401 };
  }

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return { success: false, error: 'No organization', status: 404 };
  }
  if (member.role !== 'owner' && member.role !== 'admin') {
    return { success: false, error: 'Forbidden', status: 403 };
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return { success: false, error: 'Stripe is not configured', status: 500 };
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_account_id')
    .eq('id', member.organization_id)
    .single();

  return {
    success: true,
    organizationId: member.organization_id,
    stripe: new Stripe(stripeSecretKey),
    stripeAccountId: org?.stripe_account_id ?? null,
  };
}

async function readSettings(organizationId: string): Promise<CustomerSubscriptionPlansSettings> {
  const supabase = getAdminSupabase();
  const { data } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();
  return readPlansSettings(data?.settings as Record<string, unknown> | null);
}

async function writeSettings(
  organizationId: string,
  next: CustomerSubscriptionPlansSettings
): Promise<void> {
  const supabase = getAdminSupabase();
  const { data: current } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  const currentSettings = (current?.settings as Record<string, unknown>) || {};
  await supabase
    .from('organizations')
    .update({
      settings: { ...currentSettings, customer_subscription_plans: next },
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);
}

// =====================================================
// GET — プラン一覧取得
// =====================================================
export async function GET() {
  const ctx = await resolveAdminContext();
  if (!ctx.success) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const settings = await readSettings(ctx.organizationId);
  return NextResponse.json({
    enabled: settings.enabled,
    plans: settings.plans,
    subscriptionCreatesOrder: settings.subscriptionCreatesOrder,
    subscriptionSendsEmail: settings.subscriptionSendsEmail,
    stripeConnected: !!ctx.stripeAccountId,
  });
}

// =====================================================
// POST — プラン作成
// =====================================================
interface CreateBody {
  targetRole?: CustomerRoleKey;
  name?: string;
  description?: string;
  amount?: number;
  currency?: string;
  interval?: SubscriptionInterval;
  features?: string[];
  isActive?: boolean;
  enabled?: boolean;
}

export async function POST(request: NextRequest) {
  const ctx = await resolveAdminContext();
  if (!ctx.success) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  if (!ctx.stripeAccountId) {
    return NextResponse.json(
      { error: 'Stripe Connect is not connected. Please connect Stripe first.' },
      { status: 400 }
    );
  }

  let body: CreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // バリデーション
  if (!body.targetRole || !VALID_ROLES.includes(body.targetRole)) {
    return NextResponse.json({ error: 'Invalid targetRole' }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 });
  }
  const currency = (body.currency || 'jpy').toLowerCase();
  const interval = body.interval || 'year';
  if (!VALID_INTERVALS.includes(interval)) {
    return NextResponse.json({ error: 'Invalid interval' }, { status: 400 });
  }

  // Stripe に Product と Price を作成（Connected Account 上）
  let product: Stripe.Product;
  let price: Stripe.Price;
  try {
    product = await ctx.stripe.products.create(
      {
        name: body.name.trim(),
        description: body.description?.trim() || undefined,
        metadata: {
          akinai_organization_id: ctx.organizationId,
          target_role: body.targetRole,
        },
      },
      { stripeAccount: ctx.stripeAccountId }
    );

    price = await ctx.stripe.prices.create(
      {
        product: product.id,
        unit_amount: toStripeUnitAmount(body.amount, currency),
        currency,
        recurring: { interval },
        metadata: {
          akinai_organization_id: ctx.organizationId,
          target_role: body.targetRole,
        },
      },
      { stripeAccount: ctx.stripeAccountId }
    );
  } catch (err) {
    console.error('Stripe product/price creation failed:', err);
    return NextResponse.json(
      { error: 'Failed to create Stripe product/price' },
      { status: 500 }
    );
  }

  const settings = await readSettings(ctx.organizationId);
  const now = new Date().toISOString();
  const newPlan: CustomerSubscriptionPlan = {
    id: randomUUID(),
    targetRole: body.targetRole,
    name: body.name.trim(),
    description: body.description?.trim() || '',
    amount: body.amount,
    currency,
    interval,
    stripeProductId: product.id,
    stripePriceId: price.id,
    features: Array.isArray(body.features) ? body.features.filter((f) => f?.trim()) : [],
    isActive: body.isActive !== false,
    sortOrder: settings.plans.length,
    createdAt: now,
    updatedAt: now,
  };

  const next: CustomerSubscriptionPlansSettings = {
    enabled: body.enabled === true ? true : settings.enabled,
    plans: [...settings.plans, newPlan],
  };
  await writeSettings(ctx.organizationId, next);

  return NextResponse.json({ plan: newPlan }, { status: 201 });
}

// =====================================================
// PATCH — 設定全体（enabled）の切り替え
// =====================================================
export async function PATCH(request: NextRequest) {
  const ctx = await resolveAdminContext();
  if (!ctx.success) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { enabled?: boolean; subscriptionCreatesOrder?: boolean; subscriptionSendsEmail?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const settings = await readSettings(ctx.organizationId);
  const next: CustomerSubscriptionPlansSettings = {
    ...settings,
    ...(body.enabled !== undefined && { enabled: body.enabled === true }),
    ...(body.subscriptionCreatesOrder !== undefined && {
      subscriptionCreatesOrder: body.subscriptionCreatesOrder === true,
    }),
    ...(body.subscriptionSendsEmail !== undefined && {
      subscriptionSendsEmail: body.subscriptionSendsEmail === true,
    }),
  };
  await writeSettings(ctx.organizationId, next);
  return NextResponse.json({
    enabled: next.enabled,
    subscriptionCreatesOrder: next.subscriptionCreatesOrder,
    subscriptionSendsEmail: next.subscriptionSendsEmail,
  });
}
