/**
 * /api/stripe/customer-services/[id]
 *
 * 個別サービスの編集・削除。
 * - PATCH : メタデータの更新（料金が変わる場合は新しい Price を作成）
 * - DELETE: サービス削除（Stripe Price/Product を archive、settings から除去）
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import {
  CustomerOneTimeService,
  CustomerOneTimeServicesSettings,
  readOneTimeServicesSettings,
  toStripeUnitAmount,
} from '@/lib/customer-one-time-services';

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

async function readSettings(organizationId: string): Promise<CustomerOneTimeServicesSettings> {
  const supabase = getAdminSupabase();
  const { data } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();
  return readOneTimeServicesSettings(data?.settings as Record<string, unknown> | null);
}

async function writeSettings(
  organizationId: string,
  next: CustomerOneTimeServicesSettings
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
      settings: { ...currentSettings, customer_one_time_services: next },
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
  sortOrder?: number;
  imageUrl?: string;
  displayOrder?: number;
}

// =====================================================
// PATCH — サービス更新
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
    return NextResponse.json({ error: 'Stripe Connect is not connected' }, { status: 400 });
  }

  let body: UpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const settings = await readSettings(ctx.organizationId);
  const idx = settings.services.findIndex((s) => s.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const current = settings.services[idx];
  const updated: CustomerOneTimeService = { ...current };

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
  if (typeof body.imageUrl === 'string') {
    updated.imageUrl = body.imageUrl.trim();
  }
  if (typeof body.displayOrder === 'number' && Number.isFinite(body.displayOrder)) {
    updated.displayOrder = Math.max(0, Math.floor(body.displayOrder));
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

  // 料金が変わる場合は新しい one-time Price を作成して差し替える
  if (typeof body.amount === 'number' && body.amount > 0 && body.amount !== current.amount) {
    try {
      const newPrice = await ctx.stripe.prices.create(
        {
          product: current.stripeProductId,
          unit_amount: toStripeUnitAmount(body.amount, current.currency),
          currency: current.currency,
          metadata: { akinai_organization_id: ctx.organizationId, type: 'one_time_service' },
        },
        { stripeAccount: ctx.stripeAccountId }
      );

      await ctx.stripe.prices
        .update(current.stripePriceId, { active: false }, { stripeAccount: ctx.stripeAccountId })
        .catch((e) => console.warn('Failed to archive old price:', e));

      updated.amount = body.amount;
      updated.stripePriceId = newPrice.id;
    } catch (err) {
      console.error('Stripe price recreate failed:', err);
      return NextResponse.json({ error: 'Failed to update Stripe price' }, { status: 500 });
    }
  }

  updated.updatedAt = new Date().toISOString();
  const nextServices = [...settings.services];
  nextServices[idx] = updated;
  nextServices.sort((a, b) => a.sortOrder - b.sortOrder);

  await writeSettings(ctx.organizationId, { ...settings, services: nextServices });
  return NextResponse.json({ service: updated });
}

// =====================================================
// DELETE — サービス削除
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
  const target = settings.services.find((s) => s.id === id);
  if (!target) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

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

  const next: CustomerOneTimeServicesSettings = {
    ...settings,
    services: settings.services.filter((s) => s.id !== id),
  };
  await writeSettings(ctx.organizationId, next);
  return NextResponse.json({ success: true });
}
