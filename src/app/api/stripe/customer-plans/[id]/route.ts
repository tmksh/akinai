/**
 * /api/stripe/customer-plans/[id]
 *
 * 個別プランの編集・削除。
 * - PATCH : メタデータの更新（料金や interval が変わる場合は新しい Price を作成）
 * - DELETE: プラン削除（Stripe Price/Product を archive、settings から除去）
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import {
  CustomerSubscriptionPlan,
  CustomerSubscriptionPlansSettings,
  SubscriptionInterval,
  readPlansSettings,
  toStripeUnitAmount,
} from '@/lib/customer-subscription-plans';

const VALID_INTERVALS: SubscriptionInterval[] = ['month', 'year'];

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, key);
}

async function resolveAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false as const, error: 'Unauthorized', status: 401 };
  }

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!member) return { success: false as const, error: 'No organization', status: 404 };
  if (member.role !== 'owner' && member.role !== 'admin') {
    return { success: false as const, error: 'Forbidden', status: 403 };
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return { success: false as const, error: 'Stripe is not configured', status: 500 };
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_account_id')
    .eq('id', member.organization_id)
    .single();

  return {
    success: true as const,
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

interface UpdateBody {
  name?: string;
  description?: string;
  features?: string[];
  isActive?: boolean;
  amount?: number;
  interval?: SubscriptionInterval;
  sortOrder?: number;
}

// =====================================================
// PATCH — プラン更新
// =====================================================
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const ctx = await resolveAdminContext();
  if (!ctx.success) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  if (!ctx.stripeAccountId) {
    return NextResponse.json(
      { error: 'Stripe Connect is not connected' },
      { status: 400 }
    );
  }

  let body: UpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const settings = await readSettings(ctx.organizationId);
  const idx = settings.plans.findIndex((p) => p.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const current = settings.plans[idx];
  const updated: CustomerSubscriptionPlan = { ...current };

  // Stripe Product 側のメタ情報更新
  const productUpdates: Stripe.ProductUpdateParams = {};
  if (typeof body.name === 'string' && body.name.trim() && body.name.trim() !== current.name) {
    updated.name = body.name.trim();
    productUpdates.name = updated.name;
  }
  if (typeof body.description === 'string' && body.description !== current.description) {
    updated.description = body.description;
    productUpdates.description = updated.description || undefined;
  }
  if (Array.isArray(body.features)) {
    updated.features = body.features.filter((f) => f?.trim());
  }
  if (typeof body.isActive === 'boolean') {
    updated.isActive = body.isActive;
    productUpdates.active = body.isActive;
  }
  if (typeof body.sortOrder === 'number') {
    updated.sortOrder = body.sortOrder;
  }

  if (Object.keys(productUpdates).length > 0) {
    try {
      await ctx.stripe.products.update(current.stripeProductId, productUpdates, {
        stripeAccount: ctx.stripeAccountId,
      });
    } catch (err) {
      console.error('Stripe product update failed:', err);
      return NextResponse.json({ error: 'Failed to update Stripe product' }, { status: 500 });
    }
  }

  // 料金や課金周期が変わる場合は、新しい Price を作って差し替える（既存 Price は archive）
  const interval = body.interval ?? current.interval;
  if (
    (typeof body.amount === 'number' && body.amount > 0 && body.amount !== current.amount) ||
    (body.interval && VALID_INTERVALS.includes(body.interval) && interval !== current.interval)
  ) {
    try {
      const newPrice = await ctx.stripe.prices.create(
        {
          product: current.stripeProductId,
          unit_amount: toStripeUnitAmount(body.amount ?? current.amount, current.currency),
          currency: current.currency,
          recurring: { interval },
          metadata: {
            akinai_organization_id: ctx.organizationId,
            target_role: current.targetRole,
          },
        },
        { stripeAccount: ctx.stripeAccountId }
      );

      // 既存 Price は archive（active=false にすると新規購読には使われなくなる）
      await ctx.stripe.prices
        .update(current.stripePriceId, { active: false }, { stripeAccount: ctx.stripeAccountId })
        .catch((e) => console.warn('Failed to archive old price:', e));

      updated.amount = body.amount ?? current.amount;
      updated.interval = interval;
      updated.stripePriceId = newPrice.id;
    } catch (err) {
      console.error('Stripe price recreate failed:', err);
      return NextResponse.json({ error: 'Failed to update Stripe price' }, { status: 500 });
    }
  }

  updated.updatedAt = new Date().toISOString();
  const nextPlans = [...settings.plans];
  nextPlans[idx] = updated;
  // sortOrder で並び替え
  nextPlans.sort((a, b) => a.sortOrder - b.sortOrder);

  await writeSettings(ctx.organizationId, { ...settings, plans: nextPlans });
  return NextResponse.json({ plan: updated });
}

// =====================================================
// DELETE — プラン削除
// =====================================================
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const ctx = await resolveAdminContext();
  if (!ctx.success) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const settings = await readSettings(ctx.organizationId);
  const target = settings.plans.find((p) => p.id === id);
  if (!target) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  // Stripe 側の Price を archive、Product も非アクティブ化
  if (ctx.stripeAccountId) {
    try {
      await ctx.stripe.prices
        .update(target.stripePriceId, { active: false }, { stripeAccount: ctx.stripeAccountId })
        .catch((e) => console.warn('Failed to archive price:', e));
      await ctx.stripe.products
        .update(target.stripeProductId, { active: false }, { stripeAccount: ctx.stripeAccountId })
        .catch((e) => console.warn('Failed to archive product:', e));
    } catch (err) {
      console.warn('Stripe archive failed (continuing):', err);
    }
  }

  const next: CustomerSubscriptionPlansSettings = {
    ...settings,
    plans: settings.plans.filter((p) => p.id !== id),
  };
  await writeSettings(ctx.organizationId, next);
  return NextResponse.json({ success: true });
}
