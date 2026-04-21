import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  corsHeaders,
  withApiLogging,
} from '@/lib/api/auth';

/**
 * GET /api/v1/payment/bank-transfer
 *
 * 組織の銀行振込設定を返す。
 * 銀行振込を選択したお客様への振込先案内・注文確認画面で使用する。
 *
 * レスポンス例:
 * {
 *   "bank_transfer": {
 *     "bank_name": "○○銀行",
 *     "branch_name": "○○支店",
 *     "account_type": "普通",
 *     "account_number": "1234567",
 *     "account_holder": "アキナイ",
 *     "transfer_deadline_days": 3,
 *     "configured": true
 *   }
 * }
 *
 * 未設定の場合は configured: false が返る。
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return apiError('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', auth.organizationId)
      .single();

    if (orgError || !org) {
      return apiError('Organization not found', 404);
    }

    const settings = (org.settings || {}) as Record<string, unknown>;
    const bank = (settings.bank_transfer || {}) as Record<string, unknown>;

    const configured = !!(bank.bankName && bank.accountNumber && bank.accountHolder);

    const response = apiSuccess(
      {
        bank_transfer: {
          bank_name: (bank.bankName as string) || null,
          branch_name: (bank.branchName as string) || null,
          account_type: (bank.accountType as string) || '普通',
          account_number: (bank.accountNumber as string) || null,
          account_holder: (bank.accountHolder as string) || null,
          transfer_deadline_days: Number(bank.transferDeadlineDays) || 3,
          configured,
        },
      },
      undefined,
      auth.rateLimit
    );
    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  });
}

// OPTIONS /api/v1/payment/bank-transfer - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}
