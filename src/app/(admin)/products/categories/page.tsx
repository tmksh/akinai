'use client';

import { useState, useEffect, useTransition } from 'react';
import { FolderTree, Plus, Pencil, Trash2, Loader2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { PageTabs } from '@/components/layout/page-tabs';
import { useOrganization } from '@/components/providers/organization-provider';
import {
  getCategoriesWithProductCount,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/actions/products';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];
type CategoryWithCount = Category & { productCount: number };

const productTabs = [
  { label: '商品一覧', href: '/products', exact: true },
  { label: '商品登録', href: '/products/new' },
  { label: 'カテゴリー', href: '/products/categories' },
];

export default function CategoriesPage() {
  const { organization, isLoading: orgLoading } = useOrganization();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // ダイアログ状態
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryWithCount | null>(null);

  // フォーム状態
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // データ取得
  useEffect(() => {
    const fetchCategories = async () => {
      if (!organization?.id) return;

      setIsLoading(true);
      const { data, error } = await getCategoriesWithProductCount(organization.id);
      if (data) {
        setCategories(data);
      }
      setIsLoading(false);
    };

    fetchCategories();
  }, [organization?.id]);

  // スラッグ自動生成
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // ダイアログを開く（新規作成）
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setFormError(null);
    setDialogOpen(true);
  };

  // ダイアログを開く（編集）
  const handleOpenEdit = (category: CategoryWithCount) => {
    setEditingCategory(category);
    setName(category.name);
    setSlug(category.slug);
    setDescription(category.description || '');
    setFormError(null);
    setDialogOpen(true);
  };

  // 保存処理
  const handleSave = () => {
    if (!organization?.id) return;
    if (!name.trim()) {
      setFormError('カテゴリー名を入力してください');
      return;
    }
    if (!slug.trim()) {
      setFormError('スラッグを入力してください');
      return;
    }

    setFormError(null);

    startTransition(async () => {
      if (editingCategory) {
        // 更新
        const result = await updateCategory(editingCategory.id, {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
        });

        if (result.error) {
          setFormError(result.error);
          return;
        }

        if (result.data) {
          setCategories(categories.map(c =>
            c.id === editingCategory.id
              ? { ...result.data!, productCount: editingCategory.productCount }
              : c
          ));
        }
      } else {
        // 新規作成
        const result = await createCategory({
          organizationId: organization.id,
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
        });

        if (result.error) {
          setFormError(result.error);
          return;
        }

        if (result.data) {
          setCategories([...categories, { ...result.data, productCount: 0 }]);
        }
      }

      setDialogOpen(false);
    });
  };

  // 削除確認を開く
  const handleOpenDelete = (category: CategoryWithCount) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  // 削除処理
  const handleDelete = () => {
    if (!categoryToDelete) return;

    startTransition(async () => {
      const result = await deleteCategory(categoryToDelete.id);

      if (result.error) {
        alert(result.error);
        setDeleteDialogOpen(false);
        return;
      }

      setCategories(categories.filter(c => c.id !== categoryToDelete.id));
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">商品管理</h1>
          <p className="text-muted-foreground">
            商品カテゴリーの管理を行います
          </p>
        </div>
        <Button className="btn-premium" onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          カテゴリーを追加
        </Button>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={productTabs} />

      {/* カテゴリー一覧 */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>カテゴリー一覧</CardTitle>
          <CardDescription>登録されているカテゴリーを管理します</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || orgLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <FolderTree className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">カテゴリーがまだ登録されていません</p>
              <Button className="mt-4" variant="outline" onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                最初のカテゴリーを追加
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <FolderTree className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm text-muted-foreground">
                        スラッグ: {category.slug}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">{category.productCount}</div>
                      <div className="text-sm text-muted-foreground">商品数</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(category)}
                        disabled={isPending}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleOpenDelete(category)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 作成/編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'カテゴリーを編集' : '新しいカテゴリー'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">カテゴリー名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingCategory) {
                    setSlug(generateSlug(e.target.value));
                  }
                }}
                placeholder="例: アクセサリー"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">スラッグ *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="例: accessories"
              />
              <p className="text-xs text-muted-foreground">
                URLに使用される識別子です。英数字とハイフンのみ推奨
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="カテゴリーの説明（任意）"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>カテゴリーを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{categoryToDelete?.name}」を削除します。この操作は取り消せません。
              {categoryToDelete?.productCount && categoryToDelete.productCount > 0 && (
                <span className="block mt-2 text-destructive">
                  ※ このカテゴリーには{categoryToDelete.productCount}件の商品が紐づいています。
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  削除中...
                </>
              ) : (
                '削除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
