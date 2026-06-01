import { NextRequest } from 'next/server';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  withApiLogging,
  getServiceSupabase,
  CACHE_PROFILES,
} from '@/lib/api/auth';
import { fetchContentTypes } from '@/lib/api/storefront-data';

/**
 * GET /api/v1/content-types
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    try {
      const supabase = getServiceSupabase();
      const types = await fetchContentTypes(supabase, auth.organizationId!);
      return apiSuccess({ types }, undefined, auth.rateLimit, CACHE_PROFILES.master);
    } catch (error) {
      console.error('Error fetching content types:', error);
      return apiSuccess({ types: [] }, undefined, auth.rateLimit, CACHE_PROFILES.master);
    }
  });
}

export async function OPTIONS() {
  return handleOptions();
}
