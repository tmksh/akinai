import Stripe from 'stripe';

export type StripeOrgConfig = {
  stripe_test_mode?: boolean | null;
  stripe_account_id?: string | null;
  stripe_test_account_id?: string | null;
};

export type StripeConfig = {
  stripe: Stripe;
  accountId: string | null;
  publishableKey: string | null;
  isTestMode: boolean;
};

/**
 * テナントのテスト/本番モードに応じた Stripe クライアントと Connect アカウント ID を返す。
 *
 * テストモード: STRIPE_TEST_SECRET_KEY + stripe_test_account_id
 * 本番モード  : STRIPE_SECRET_KEY     + stripe_account_id
 */
export function getStripeConfig(org: StripeOrgConfig): StripeConfig {
  const isTestMode = !!org.stripe_test_mode;

  const secretKey = isTestMode
    ? process.env.STRIPE_TEST_SECRET_KEY
    : process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    const keyName = isTestMode ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_SECRET_KEY';
    throw new Error(`${keyName} is not configured`);
  }

  const publishableKey = isTestMode
    ? (process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY ?? null)
    : (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null);

  const accountId = isTestMode
    ? (org.stripe_test_account_id ?? null)
    : (org.stripe_account_id ?? null);

  return {
    stripe: new Stripe(secretKey),
    accountId,
    publishableKey,
    isTestMode,
  };
}

/**
 * Webhook 署名検証に使うシークレット候補をすべて返す（本番＋テスト）。
 * stripe.webhooks.constructEvent で順に試して最初に通ったものを採用する。
 */
export function getWebhookSecretCandidates(): string[] {
  const candidates = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    process.env.STRIPE_TEST_WEBHOOK_SECRET,
    process.env.STRIPE_TEST_CONNECT_WEBHOOK_SECRET,
  ];
  return candidates.filter((s): s is string => !!s);
}
