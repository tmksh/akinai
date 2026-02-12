'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrganizationForOnboarding } from '@/lib/actions/onboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Building2 } from 'lucide-react';

export default function OnboardingClient() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    setError(null);

    const { data, error: err } = await createOrganizationForOnboarding(name.trim());

    if (err) {
      setError(err);
      setIsLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-50 via-amber-50 to-orange-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white dark:bg-slate-900">
        <CardContent className="pt-10 pb-8 px-8">
          <div className="flex flex-col items-center mb-8">
            <img
              src="/logo-shou.png?v=2"
              alt="AKINAI"
              className="h-24 w-24 object-contain drop-shadow-lg mb-2"
            />
            <h1 className="text-2xl font-bold text-orange-500 tracking-wide">
              組織を作成
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
              はじめに、あなたの組織（会社・店舗名）を登録してください
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="org-name" className="text-slate-700 dark:text-slate-300">
                組織名
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <Input
                  id="org-name"
                  type="text"
                  placeholder="例: 株式会社サンプル"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 pl-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium text-base"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  作成中...
                </>
              ) : (
                '組織を作成して始める'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
