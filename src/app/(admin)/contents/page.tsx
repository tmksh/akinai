'use client';

import { useEffect, useState } from 'react';
import { useOrganization } from '@/components/providers/organization-provider';
import { getContents, getContentStats, type ContentData } from '@/lib/actions/contents';
import { getEnabledContentTypes } from '@/lib/actions/settings';
import ContentsClient from './contents-client';
import { Loader2 } from 'lucide-react';

export default function ContentsPage() {
  const { organization } = useOrganization();
  const [contents, setContents] = useState<ContentData[]>([]);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, scheduled: 0 });
  const [enabledTypes, setEnabledTypes] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;
    Promise.all([
      getContents(organization.id, { limit: 100 }),
      getContentStats(organization.id),
      getEnabledContentTypes(organization.id),
    ]).then(([c, s, t]) => {
      if (cancelled) return;
      setContents(c.data || []);
      setStats(s || { total: 0, published: 0, draft: 0, scheduled: 0 });
      setEnabledTypes(t.data || []);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [organization?.id]);

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        <p className="text-sm text-muted-foreground">コンテンツを読み込み中...</p>
      </div>
    );
  }

  return (
    <ContentsClient
      initialContents={contents}
      stats={stats}
      organizationId={organization?.id || ''}
      enabledContentTypes={enabledTypes}
    />
  );
}
