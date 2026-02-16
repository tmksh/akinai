'use client';

import { useState, useEffect, useTransition } from 'react';
import { FolderTree, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageTabs } from '@/components/layout/page-tabs';
import { useOrganization } from '@/components/providers/organization-provider';
import {
  getContentCategories,
  createContentCategory,
  updateContentCategory,
  deleteContentCategory,
  type ContentCategory,
} from '@/lib/actions/contents';
import { getEnabledContentTypes } from '@/lib/actions/settings';
import { contentTypeConfig } from '@/lib/content-types';
import { toast } from 'sonner';

const contentTabs = [
  { label: '一覧', href: '/contents', exact: true },
  { label: 'カテゴリ', href: '/contents/categories' },
];

export default function ContentCategoriesPage() {
  const { organization } = useOrganization();
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [enabledTypes, setEnabledTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ContentCategory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ContentCategory | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!organization?.id) return;
      setIsLoading(true);
      const [catResult, typeResult] = await Promise.all([
        getContentCategories(organization.id),
        getEnabledContentTypes(organization.id),
      ]);
      setCategories(catResult.data);
      setEnabledTypes(typeResult.data || []);
      setIsLoading(false);
    };
    load();
  }, [organization?.id]);

  const generateSlug = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setType(enabledTypes[0] || '');
    setFormError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (cat: ContentCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setType(cat.type);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!organization?.id) return;
    if (!name.trim()) { setFormError('名前を入力してください'); return; }
    if (!slug.trim()) { setFormError('スラッグを入力してください'); return; }
    if (!type) { setFormError('タイプを選択してください'); return; }
    setFormError(null);

    startTransition(async () => {
      if (editingCategory) {
        const { data, error } = await updateContentCategory(editingCategory.id, {
          name: name.trim(),
          slug: slug.trim(),
          type,
        });
        if (error) { setFormError(error); return; }
        if (data) {
          setCategories(categories.map((c) => (c.id === editingCategory.id ? { ...data, contentCount: editingCategory.contentCount } : c)));
          toast.success('カテゴリを更新しました');
        }
      } else {
        const { data, error } = await createContentCategory({
          organizationId: organization.id,
          name: name.trim(),
          slug: slug.trim(),
          type,
        });
        if (error) { setFormError(error); return; }
        if (data) {
          setCategories([...categories, data]);
          toast.success('カテゴリを追加しました');
        }
      }
      setDialogOpen(false);
    });
  };

  const handleDelete = () => {
    if (!categoryToDelete) return;
    startTransition(async () => {
      const { success, error } = await deleteContentCategory(categoryToDelete.id);
      if (success) {
        setCategories(categories.filter((c) => c.id !== categoryToDelete.id));
        toast.success('カテゴリを削除しました');
      } else {
        toast.error(error || '削除に失敗しました');
      }
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">コンテンツカテゴリ</h1>
          <p className="text-muted-foreground">
            お知らせをカテゴリで分類します。フロントでは ?category=スラッグ で絞り込めます
          </p>
        </div>
        <Button onClick={handleOpenCreate} disabled={enabledTypes.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          カテゴリ追加
        </Button>
      </div>

      <PageTabs tabs={contentTabs} />

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderTree className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">カテゴリがまだありません</p>
            <Button variant="outline" size="sm" onClick={handleOpenCreate} disabled={enabledTypes.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              最初のカテゴリを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">カテゴリ一覧</CardTitle>
            <CardDescription>全 {categories.length} 件</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {categories.map((cat) => {
                const typeLabel = contentTypeConfig[cat.type]?.label || cat.type;
                return (
                  <div key={cat.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <FolderTree className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{cat.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <code className="bg-muted/50 px-1 py-0.5 rounded font-mono">{cat.slug}</code>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{typeLabel}</Badge>
                          <span>{cat.contentCount} 件</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => { setCategoryToDelete(cat); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 作成・編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'カテゴリ編集' : 'カテゴリ追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingCategory) setSlug(generateSlug(e.target.value));
                }}
                placeholder="例: イベント情報"
              />
            </div>
            <div className="space-y-2">
              <Label>スラッグ（APIで使う値）</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="例: events" className="font-mono" />
              <p className="text-xs text-muted-foreground">フロントで ?category=この値 で絞り込みます</p>
            </div>
            <div className="space-y-2">
              <Label>タイプ</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder="タイプを選択" /></SelectTrigger>
                <SelectContent>
                  {enabledTypes.map((key) => {
                    const config = contentTypeConfig[key];
                    if (!config) return null;
                    return <SelectItem key={key} value={key}>{config.label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">このカテゴリが属するコンテンツタイプ</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCategory ? '更新' : '追加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>カテゴリを削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{categoryToDelete?.name}」を削除しますか？紐付いたコンテンツからもこのカテゴリが外れます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
