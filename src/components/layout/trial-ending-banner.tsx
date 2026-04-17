'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const DISMISS_KEY = 'trial_ending_banner_dismissed';

export function TrialEndingBanner() {
  const [info, setInfo] = useState<{
    subscription_status: string | null;
    trial_ends_at: string | null;
    plan: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const savedDate = sessionStorage.getItem(DISMISS_KEY);
    if (savedDate === new Date().toDateString()) {
      setDismissed(true);
      return;
    }

    fetch('/api/stripe/subscription')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setInfo(data);
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, new Date().toDateString());
    setDismissed(true);
  };

  if (dismissed || !info) return null;
  if (info.subscription_status !== 'trialing') return null;
  if (!info.trial_ends_at) return null;

  const trialEnd = new Date(info.trial_ends_at);
  const now = new Date();
  const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft > 7) return null;

  const dateStr = trialEnd.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });

  return (
    <div className="relative z-50 w-full bg-amber-500 text-white px-4 py-2.5 flex items-center gap-3 text-sm">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">
        無料トライアルが <strong>{dateStr}（あと{daysLeft}日）</strong> に終了します。
        継続してご利用いただくには、プランをご確認ください。
      </span>
      <Link
        href="/settings/billing"
        className="flex items-center gap-1 underline underline-offset-2 hover:opacity-80 font-medium flex-shrink-0"
      >
        プランを確認 <ExternalLink className="h-3 w-3" />
      </Link>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 hover:opacity-70 ml-1"
        aria-label="閉じる"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
