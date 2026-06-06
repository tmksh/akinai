'use client';

import { useState } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const DISMISS_KEY = 'trial_ending_banner_dismissed';

interface TrialEndingBannerProps {
  initialInfo: {
    subscription_status: string | null;
    trial_ends_at: string | null;
    plan: string;
  } | null;
}

export function TrialEndingBanner({ initialInfo }: TrialEndingBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(DISMISS_KEY) === new Date().toDateString();
  });

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, new Date().toDateString());
    setDismissed(true);
  };

  if (dismissed || !initialInfo) return null;
  if (initialInfo.subscription_status !== 'trialing') return null;
  if (!initialInfo.trial_ends_at) return null;

  const trialEnd = new Date(initialInfo.trial_ends_at);
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
