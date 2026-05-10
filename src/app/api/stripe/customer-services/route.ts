/**
 * /api/stripe/customer-services
 *
 * テナント管理者向け：顧客向け単発払いサービスの CRUD。
 * Stripe Connect の Connected Account 上に Product / one-time Price を作成し、
 * organizations.settings.customer_one_time_services に保存する。
 *
 * GET    : サービス一覧取得
 * POST   : サービス作成
 * PATCH  : 設定全体（enabled）の切り替え
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import {
  CustomerOneTimeService,
  CustomerOneTimeServicesSettings,
  CustomerServiceTargetRole,
  normalizeTargetRole,
  readOneTimeServicesSettings,
  toStripeUnitAmount,
} from '@/lib/customer-one-time-services';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, key);
}

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

// =====================================================
// GET — サービス一覧取得
// =====================================================
export async function GET() {
  const ctx = await resolveAdminContext();
  if (!ctx.success) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const settings = await readSettings(ctx.organizationId);
  return NextResponse.json({
    enabled: settings.enabled,
    services: settings.services,
    stripeConnected: !!ctx.stripeAccountId,
  });
}

// =====================================================
// POST — サービス作成
// =====================================================
interface CreateBody {
  name?: string;
  description?: string;
  amount?: number;
  currency?: string;
  features?: string[];
  isActive?: boolean;
  imageUrl?: string;
  displayOrder?: number;
  targetRole?: CustomerServiceTargetRole | '' | null;
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

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 });
  }
  const currency = (body.currency || 'jpy').toLowerCase();

  let product: Stripe.Product;
  let price: Stripe.Price;
  try {
    product = await ctx.stripe.products.create(
      {
        name: body.name.trim(),
        description: body.description?.trim() || undefined,
        metadata: { akinai_organization_id: ctx.organizationId, type: 'one_time_service' },
      },
      { stripeAccount: ctx.stripeAccountId }
    );

    price = await ctx.stripe.prices.create(
      {
        product: product.id,
        unit_amount: toStripeUnitAmount(body.amount, currency),
        currency,
        metadata: { akinai_organization_id: ctx.organizationId, type: 'one_time_service' },
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
  const newService: CustomerOneTimeService = {
    id: randomUUID(),
    name: body.name.trim(),
    description: body.description?.trim() || '',
    amount: body.amount,
    currency,
    stripeProductId: product.id,
    stripePriceId: price.id,
    features: Array.isArray(body.features) ? body.features.filter((f) => f?.trim()) : [],
    isActive: body.isActive !== false,
    sortOrder: settings.services.length,
    imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '',
    displayOrder:
      typeof body.displayOrder === 'number' && Number.isFinite(body.displayOrder)
        ? Math.max(0, Math.floor(body.displayOrder))
        : 0,
    targetRole: normalizeTargetRole(body.targetRole),
    createdAt: now,
    updatedAt: now,
  };

  const next: CustomerOneTimeServicesSettings = {
    ...settings,
    services: [...settings.services, newService],
  };
  await writeSettings(ctx.organizationId, next);

  return NextResponse.json({ service: newService }, { status: 201 });
}

// =====================================================
// PATCH — 設定全体（enabled）の切り替え
// =====================================================
export async function PATCH(request: NextRequest) {
  const ctx = await resolveAdminContext();
  if (!ctx.success) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: { enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const settings = await readSettings(ctx.organizationId);
  const next: CustomerOneTimeServicesSettings = {
    ...settings,
    ...(body.enabled !== undefined && { enabled: body.enabled === true }),
  };
  await writeSettings(ctx.organizationId, next);
  return NextResponse.json({ enabled: next.enabled });
}
