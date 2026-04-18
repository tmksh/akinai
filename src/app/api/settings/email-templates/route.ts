import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export interface EmailTemplateSettings {
  order_confirmation: {
    enabled: boolean;
    subject: string;
    headerText: string;
    bodyText: string;
    footerText: string;
  };
  order_notification: {
    enabled: boolean;
    subject: string;
    adminEmail: string;
  };
  agent_notification: {
    enabled: boolean;
    subject: string;
    bodyText: string;
  };
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateSettings = {
  order_confirmation: {
    enabled: true,
    subject: '【{shopName}】ご注文ありがとうございます（注文番号: {orderNumber}）',
    headerText: 'ご注文ありがとうございます',
    bodyText:
      'この度はご注文いただき、誠にありがとうございます。\n以下の内容でご注文を承りました。',
    footerText:
      'ご不明な点がございましたら、お気軽にお問い合わせください。\n今後ともよろしくお願いいたします。',
  },
  order_notification: {
    enabled: true,
    subject: '【新規注文】{orderNumber} - {customerName} 様（{total}）',
    adminEmail: '',
  },
  agent_notification: {
    enabled: true,
    subject: '【{shopName}】代理店経由の注文が入りました（{orderNumber}）',
    bodyText:
      'お世話になっております。\nあなたの代理店コード（{agentCode}）経由で新しい注文が入りました。\n\nコミッション: {commission}\n\n引き続きよろしくお願いいたします。',
  },
};

async function getOrganizationId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();
  return member?.organization_id ?? null;
}

// GET /api/settings/email-templates
export async function GET() {
  const supabase = await createClient();
  const orgId = await getOrganizationId(supabase);
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: org } = await admin
    .from('organizations')
    .select('email_templates')
    .eq('id', orgId)
    .single();

  const saved = (org?.email_templates as Partial<EmailTemplateSettings>) || {};
  const templates: EmailTemplateSettings = {
    order_confirmation: {
      ...DEFAULT_EMAIL_TEMPLATES.order_confirmation,
      ...(saved.order_confirmation || {}),
    },
    order_notification: {
      ...DEFAULT_EMAIL_TEMPLATES.order_notification,
      ...(saved.order_notification || {}),
    },
    agent_notification: {
      ...DEFAULT_EMAIL_TEMPLATES.agent_notification,
      ...(saved.agent_notification || {}),
    },
  };

  return NextResponse.json(templates);
}

// PUT /api/settings/email-templates
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const orgId = await getOrganizationId(supabase);
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await admin
    .from('organizations')
    .update({ email_templates: body, updated_at: new Date().toISOString() })
    .eq('id', orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
