import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';
import {
  buildOrderConfirmationEmail,
  buildNewOrderNotificationEmail,
  buildAgentOrderNotificationEmail,
  type OrderEmailData,
  type AgentOrderEmailData,
} from '@/lib/email-templates/order';

/**
 * POST /api/test-email
 * メール送信テスト用エンドポイント（ログイン済みユーザーのみ）
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const targetEmail = body.email || user.email || 'delivered@resend.dev';
  const fromOverride = body.from as string | undefined;

  const dummyData: OrderEmailData = {
    orderNumber: 'ORD-TEST-0001',
    customerName: 'テスト 太郎',
    customerEmail: targetEmail,
    items: [
      { productName: 'テスト商品A', variantName: 'Mサイズ / ブラック', quantity: 2, unitPrice: 3980, totalPrice: 7960 },
      { productName: 'テスト商品B', quantity: 1, unitPrice: 5500, totalPrice: 5500 },
    ],
    subtotal: 13460,
    shippingFee: 550,
    tax: 1346,
    total: 15356,
    paymentMethod: 'bank_transfer',
    shippingAddress: {
      postalCode: '100-0001',
      prefecture: '東京都',
      city: '千代田区',
      line1: '丸の内1-1-1',
      line2: 'テストビル3F',
      phone: '090-0000-0000',
    },
    shopName: '商いストア（テスト）',
    paymentInstructions: 'みずほ銀行 渋谷支店 / 普通 1234567 / テストショップ株式会社',
  };

  const agentData: AgentOrderEmailData = {
    orderNumber: 'ORD-TEST-0001',
    customerName: 'テスト 太郎',
    agentName: 'テスト代理店',
    agentCompany: 'テスト代理店株式会社',
    agentCode: 'AGENT001',
    commissionRate: 10,
    commissionAmount: 1536,
    items: [
      { productName: 'テスト商品A', variantName: 'Mサイズ / ブラック', quantity: 2, totalPrice: 7960 },
      { productName: 'テスト商品B', quantity: 1, totalPrice: 5500 },
    ],
    subtotal: 13460,
    total: 15356,
    shopName: '商いストア（テスト）',
  };

  const results: Record<string, { success: boolean; error?: string }> = {};

  const { subject: custSubject, html: custHtml } = buildOrderConfirmationEmail(dummyData);
  results.customer = await sendEmail({ to: targetEmail, subject: custSubject, html: custHtml, from: fromOverride });

  const { subject: adminSubject, html: adminHtml } = buildNewOrderNotificationEmail(dummyData);
  results.admin = await sendEmail({ to: targetEmail, subject: adminSubject, html: adminHtml, from: fromOverride });

  const { subject: agentSubject, html: agentHtml } = buildAgentOrderNotificationEmail(agentData);
  results.agent = await sendEmail({ to: targetEmail, subject: agentSubject, html: agentHtml, from: fromOverride });

  return NextResponse.json({ message: 'Test emails sent', targetEmail, results });
}
