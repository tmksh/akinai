/**
 * エンドユーザー（顧客）向け JWT ヘルパー
 *
 * - 管理者APIキー認証とは完全に分離
 * - 環境変数 CUSTOMER_JWT_SECRET でトークンを署名
 * - ペイロード: { sub: customer_id, org: organization_id, email }
 */
import { SignJWT, jwtVerify } from 'jose';

const JWT_EXPIRES_IN = '30d';

export interface CustomerJwtPayload {
  sub: string;           // customer ID
  org: string;           // organization ID
  email: string;
  iat?: number;
  exp?: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.CUSTOMER_JWT_SECRET;
  if (!secret) {
    throw new Error('CUSTOMER_JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

/** 顧客向け JWT を発行する */
export async function signCustomerToken(payload: Omit<CustomerJwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ org: payload.org, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(getSecret());
}

/** Authorization: Bearer <token> から顧客 JWT を検証・デコードする */
export async function verifyCustomerToken(request: Request): Promise<{
  success: true;
  payload: CustomerJwtPayload;
} | {
  success: false;
  error: string;
  status: number;
}> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { success: false, error: 'Authorization header is required', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return { success: false, error: 'Token is required', status: 401 };
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      success: true,
      payload: {
        sub: payload.sub as string,
        org: payload['org'] as string,
        email: payload['email'] as string,
        iat: payload.iat,
        exp: payload.exp,
      },
    };
  } catch {
    return { success: false, error: 'Invalid or expired token', status: 401 };
  }
}
