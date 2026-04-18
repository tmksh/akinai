import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import {
  buildOrderConfirmationEmail,
  buildNewOrderNotificationEmail,
  type OrderEmailData,
} from '@/lib/email-templates/order';

/**
 * POST /api/test-email
 *
 * メール送信テスト用エンドポイント（開発環境のみ）
 * 本番環境では使用不可
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const targetEmail = body.email || 'delivered@resend.dev';
  const fromOverride = body.from as string | undefined;

  const dummyData: OrderEmailData = {
    orderNumber: 'ORD-TEST-0001',
    customerName: 'テスト 太郎',
    customerEmail: targetEmail,
    items: [
      {
        productName: 'テスト商品A',
        variantName: 'Mサイズ / ブラック',
        quantity: 2,
        unitPrice: 3980,
        totalPrice: 7960,
      },
      {
        productName: 'テスト商品B',
        quantity: 1,
        unitPrice: 5500,
        totalPrice: 5500,
      },
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

  const results: Record<string, { success: boolean; error?: string }> = {};

  // 顧客向け注文確認メール
  const { subject: custSubject, html: custHtml } = buildOrderConfirmationEmail(dummyData);
  results.customer = await sendEmail({ to: targetEmail, subject: custSubject, html: custHtml, from: fromOverride });

  // 管理者向け新規注文通知
  const { subject: adminSubject, html: adminHtml } = buildNewOrderNotificationEmail(dummyData);
  results.admin = await sendEmail({ to: targetEmail, subject: adminSubject, html: adminHtml, from: fromOverride });

  return NextResponse.json({
    message: 'Test emails sent',
    targetEmail,
    results,
  });
}
