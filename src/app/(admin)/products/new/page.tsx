'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  Trash2,
  GripVertical,
  Upload,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { mockCategories } from '@/lib/mock-data';

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
}

export default function NewProductPage() {
  const router = useRouter();
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([
    { id: '1', name: 'デフォルト', sku: '', price: 0, stock: 0 },
  ]);

  // タグ追加
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // タグ削除
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // バリエーション追加
  const addVariant = () => {
    setVariants([
      ...variants,
      {
        id: Date.now().toString(),
        name: '',
        sku: '',
        price: 0,
        stock: 0,
      },
    ]);
  };

  // バリエーション削除
  const removeVariant = (id: string) => {
    if (variants.length > 1) {
      setVariants(variants.filter((v) => v.id !== id));
    }
  };

  // バリエーション更新
  const updateVariant = (
    id: string,
    field: keyof ProductVariant,
    value: string | number
  ) => {
    setVariants(
      variants.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  // 保存処理
  const handleSave = (publish = false) => {
    // TODO: API呼び出し
    console.log('Saving product:', {
      name: productName,
      description,
      shortDescription,
      status: publish ? 'published' : status,
      categories: selectedCategories,
      tags,
      variants,
    });
    router.push('/products');
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">商品を追加</h1>
            <p className="text-muted-foreground">新しい商品を登録します</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            プレビュー
          </Button>
          <Button variant="outline" onClick={() => handleSave(false)}>
            <Save className="mr-2 h-4 w-4" />
            下書き保存
          </Button>
          <Button
            onClick={() => handleSave(true)}
            className="gradient-brand text-white hover:opacity-90"
          >
            公開する
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>商品の基本的な情報を入力します</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">商品名 *</Label>
                <Input
                  id="name"
                  placeholder="商品名を入力"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortDescription">短い説明</Label>
                <Textarea
                  id="shortDescription"
                  placeholder="商品の簡潔な説明（一覧表示などで使用）"
                  rows={2}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">詳細説明</Label>
                <Textarea
                  id="description"
                  placeholder="商品の詳細な説明を入力"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* メディア */}
          <Card>
            <CardHeader>
              <CardTitle>メディア</CardTitle>
              <CardDescription>商品の画像をアップロードします</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
                <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  画像をドラッグ&ドロップ、または
                </p>
                <Button variant="link" className="mt-1">
                  ファイルを選択
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG, WEBP（最大10MB）
                </p>
              </div>
            </CardContent>
          </Card>

          {/* バリエーション */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>バリエーション</CardTitle>
                  <CardDescription>
                    サイズや色などのバリエーションを設定します
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="mr-2 h-4 w-4" />
                  追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {variants.map((variant, index) => (
                  <div
                    key={variant.id}
                    className="flex items-start gap-4 rounded-lg border p-4"
                  >
                    <div className="flex items-center self-center text-muted-foreground cursor-grab">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="grid flex-1 gap-4 sm:grid-cols-4">
                      <div className="space-y-2">
                        <Label>バリエーション名</Label>
                        <Input
                          placeholder="例: ホワイト / M"
                          value={variant.name}
                          onChange={(e) =>
                            updateVariant(variant.id, 'name', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SKU</Label>
                        <Input
                          placeholder="例: PRD-001-WH-M"
                          value={variant.sku}
                          onChange={(e) =>
                            updateVariant(variant.id, 'sku', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>価格（税込）</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={variant.price || ''}
                          onChange={(e) =>
                            updateVariant(
                              variant.id,
                              'price',
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>在庫数</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={variant.stock || ''}
                          onChange={(e) =>
                            updateVariant(
                              variant.id,
                              'stock',
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    </div>
                    {variants.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="self-center text-muted-foreground hover:text-destructive"
                        onClick={() => removeVariant(variant.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO設定</CardTitle>
              <CardDescription>
                検索エンジン向けの設定を行います
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEOタイトル</Label>
                <Input
                  id="seoTitle"
                  placeholder="検索結果に表示されるタイトル"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoDescription">メタディスクリプション</Label>
                <Textarea
                  id="seoDescription"
                  placeholder="検索結果に表示される説明文（120〜160文字推奨）"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* ステータス */}
          <Card>
            <CardHeader>
              <CardTitle>公開設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ステータス</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">下書き</SelectItem>
                    <SelectItem value="published">公開</SelectItem>
                    <SelectItem value="archived">アーカイブ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* カテゴリー */}
          <Card>
            <CardHeader>
              <CardTitle>カテゴリー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockCategories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-input"
                      checked={selectedCategories.includes(category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([
                            ...selectedCategories,
                            category.id,
                          ]);
                        } else {
                          setSelectedCategories(
                            selectedCategories.filter((id) => id !== category.id)
                          );
                        }
                      }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* タグ */}
          <Card>
            <CardHeader>
              <CardTitle>タグ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="タグを入力"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button variant="outline" onClick={addTag}>
                  追加
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

