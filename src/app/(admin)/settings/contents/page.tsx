'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Puzzle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useOrganization } from '@/components/providers/organization-provider';
import {
  getEnabledContentTypes,
  updateEnabledContentTypes,
  getCustomContentTypes,
  updateCustomContentTypes,
  type CustomContentTypeEntry,
} from '@/lib/actions/settings';
import { toast } from 'sonner';
import { contentTypeConfig } from '@/lib/content-types';

export default function ContentsSettingsPage() {
  const { organization } = useOrganization();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [customTypes, setCustomTypes] = useState<CustomContentTypeEntry[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      if (!organization?.id) return;
      const [{ data: enabled }, { data: custom }] = await Promise.all([
        getEnabledContentTypes(organization.id),
        getCustomContentTypes(organization.id),
      ]);
      setSelectedTypes(enabled || []);
      setCustomTypes(custom || []);
      setIsLoading(false);
    }
    load();
  }, [organization?.id]);

  const toggleType = (typeKey: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeKey)
        ? prev.filter((k) => k !== typeKey)
        : [...prev, typeKey]
    );
  };

  const handleAddCustomType = () => {
    const trimmedKey = newKey.trim().replace(/\s+/g, '-').toLowerCase();
    const trimmedLabel = newLabel.trim();
    if (!trimmedLabel || !trimmedKey) {
      toast.error('タイプ名とキーを入力してください');
      return;
    }
    if (contentTypeConfig[trimmedKey]) {
      toast.error('そのキーは既存のタイプと重複しています');
      return;
    }
    if (customTypes.some((t) => t.key === trimmedKey)) {
      toast.error('そのキーは既に追加されています');
      return;
    }
    const next = [...customTypes, { key: trimmedKey, label: trimmedLabel }];
    setCustomTypes(next);
    setSelectedTypes((prev) => [...new Set([...prev, trimmedKey])]);
    setNewLabel('');
    setNewKey('');
    setIsAdding(false);
  };

  const handleStartAdding = () => {
    setIsAdding(true);
    setTimeout(() => labelInputRef.current?.focus(), 0);
  };

  const handleRemoveCustomType = (key: string) => {
    setCustomTypes((prev) => prev.filter((t) => t.key !== key));
    setSelectedTypes((prev) => prev.filter((k) => k !== key));
  };

  // ラベル入力からキーを自動生成
  const handleLabelChange = (value: string) => {
    setNewLabel(value);
    if (!newKey) {
      const auto = value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      setNewKey(auto);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) {
      toast.error('組織が設定されていません');
      return;
    }
    startTransition(async () => {
      // カスタムタイプを保存（enabled_content_types も自動更新される）
      const { error: customError } = await updateCustomContentTypes(organization.id, customTypes);
      if (customError) {
        toast.error(customError);
        return;
      }

      // 標準タイプの有効/無効も反映
      const customKeys = customTypes.map((t) => t.key);
      const standardSelected = selectedTypes.filter((k) => !customKeys.includes(k));
      const finalEnabled = [...new Set([...standardSelected, ...customKeys])];
      const { error: enabledError } = await updateEnabledContentTypes(organization.id, finalEnabled);
      if (enabledError) {
        toast.error(enabledError);
        return;
      }

      toast.success('コンテンツタイプ設定を保存しました');
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">お知らせで使うタイプ</h1>
          <p className="text-muted-foreground">
            ここで選んだタイプだけがお知らせ一覧に表示され、新規作成で使えます
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">コンテンツタイプを選択</CardTitle>
            <CardDescription>
              使いたいタイプにチェックを入れて保存してください。未選択のタイプでは新規作成できません。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(contentTypeConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <label
                  key={key}
                  className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedTypes.includes(key)}
                    onCheckedChange={() => toggleType(key)}
                  />
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{config.label}</span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded ml-auto">
                    {key}
                  </span>
                </label>
              );
            })}

            {/* カスタムタイプ */}
            {customTypes.map((ct) => (
              <label
                key={ct.key}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedTypes.includes(ct.key)}
                  onCheckedChange={() => toggleType(ct.key)}
                />
                <Puzzle className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{ct.label}</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded ml-auto">
                  {ct.key}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.preventDefault(); handleRemoveCustomType(ct.key); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </label>
            ))}

            {/* 新規カスタムタイプ入力欄 */}
            {isAdding ? (
              <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
                <Puzzle className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  ref={labelInputRef}
                  placeholder="タイプ名（例: プレスリリース）"
                  value={newLabel}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className="h-7 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomType())}
                />
                <Input
                  placeholder="キー（例: press-release）"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.replace(/[^a-z0-9-_]/g, ''))}
                  className="h-7 text-sm font-mono w-44"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomType())}
                />
                <Button type="button" size="sm" className="h-7 shrink-0" onClick={handleAddCustomType}>
                  追加
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0"
                  onClick={() => { setIsAdding(false); setNewLabel(''); setNewKey(''); }}
                >
                  キャンセル
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartAdding}
                className="flex items-center gap-3 rounded-lg border border-dashed p-3 w-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm"
              >
                <Plus className="h-4 w-4 shrink-0" />
                カスタムタイプを追加
              </button>
            )}

            <p className="text-xs text-muted-foreground pt-1">
              右の値（news, article など）がAPIの type です。フロントでは ?type=この値 で一覧を取得します。
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/contents">お知らせ一覧へ</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
