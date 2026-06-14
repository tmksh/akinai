'use client';

import { useState, useTransition, useMemo, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Copy,
  Archive,
  Package,
  CheckCircle,
  FileEdit,
  AlertTriangle,
  Loader2,
  Upload,
  Download,
  SlidersHorizontal,
  X,
  Sparkles,
  PencilLine,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { getProducts, getCategories, deleteProduct, deleteProducts, updateProductStatus, duplicateProduct, bulkUpdateCustomFieldPerProduct, type ProductWithRelations } from '@/lib/actions/products';
import { toast } from 'sonner';
import { ProductImportDialog } from '@/components/products/import-dialog';
import { compressImage } from '@/lib/image-compression';
import type { ProductStatus } from '@/types';
import type { Database } from '@/types/database';
import type { ProductFieldSchemaItem } from '@/components/providers/organization-provider';

type Category = Database['public']['Tables']['categories']['Row'];

const productTabs = [
  { label: '商品一覧', href: '/products', exact: true },
  { label: '在庫', href: '/products/inventory' },
  { label: '入出庫履歴', href: '/products/movements' },
  { label: 'カテゴリー', href: '/products/categories' },
];

const statusConfig: Record<ProductStatus, { label: string; dot: string }> = {
  published: { label: '公開中', dot: 'bg-emerald-500' },
  draft:     { label: '下書き', dot: 'bg-slate-400' },
  archived:  { label: 'アーカイブ', dot: 'bg-slate-300' },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

interface ProductsClientProps {
  initialProducts?: ProductWithRelations[];
  initialCategories?: Category[];
  organizationId?: string;
  totalProducts?: number;
}

/** 未許可ホストやブロークンURLでもクラッシュしない商品サムネイル */
function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);

  useEffect(() => { setErrored(false); }, [src]);

  if (errored) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Package className="h-10 w-10 opacity-15" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
      loading="lazy"
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setErrored(true)}
    />
  );
}

export default function ProductsClient({
  initialProducts,
  initialCategories,
  organizationId: organizationIdProp,
  totalProducts: totalProductsProp,
}: ProductsClientProps = {}) {
  const { organization } = useOrganization();
  const organizationId = organizationIdProp || organization?.id || '';
  const [products, setProducts] = useState<ProductWithRelations[]>(initialProducts ?? []);
  const [categories, setCategories] = useState<Category[]>(initialCategories ?? []);
  const [totalProducts, setTotalProducts] = useState(totalProductsProp ?? 0);
  const [isLoadingData, setIsLoadingData] = useState(!initialProducts);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!organizationId || initialProducts) return;
    let cancelled = false;
    setIsLoadingData(true);
    Promise.all([
      getProducts(organizationId),
      getCategories(organizationId),
    ]).then(([p, c]) => {
      if (cancelled) return;
      setProducts(p.data || []);
      setCategories(c.data || []);
      setTotalProducts(p.total);
      setIsLoadingData(false);
    });
    return () => { cancelled = true; };
  }, [organizationId, initialProducts]);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithRelations | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const [bulkFieldDialogOpen, setBulkFieldDialogOpen] = useState(false);
  const [bulkFieldKey, setBulkFieldKey] = useState('');
  // 各行は rowId で一意に管理。同じ商品を複数行に追加できるようにするため。
  type DialogRow = { rowId: string; product: ProductWithRelations };
  // rowId → value のマップ
  const [bulkFieldValues, setBulkFieldValues] = useState<Record<string, string>>({});
  // rowId → アップロード中フラグ
  const [bulkUploadingIds, setBulkUploadingIds] = useState<Set<string>>(new Set());
  // ダイアログ内の行リスト（同一商品の複数行 OK）
  const [dialogRows, setDialogRows] = useState<DialogRow[]>([]);
  // useRef でも同期的に保持
  const dialogRowsRef = useRef<DialogRow[]>([]);
  const newRowId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return products.filter((p) => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.variants.some(v => v.sku.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchCat = categoryFilter === 'all' || p.categories.some(c => c.id === categoryFilter);
      return matchSearch && matchStatus && matchCat;
    });
  }, [products, debouncedSearch, statusFilter, categoryFilter]);

  const stats = useMemo(() => ({
    total: products.length,
    published: products.filter(p => p.status === 'published').length,
    draft: products.filter(p => p.status === 'draft').length,
    outOfStock: products.filter(p => p.variants.reduce((s, v) => s + v.stock, 0) === 0).length,
  }), [products]);

  const handleDelete = async () => {
    if (!productToDelete) return;
    startTransition(async () => {
      const result = await deleteProduct(productToDelete.id);
      if (result.success) {
        setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
        setSelectedIds(prev => { const s = new Set(prev); s.delete(productToDelete.id); return s; });
        toast.success('商品を削除しました');
      } else {
        toast.error('削除に失敗しました');
      }
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    });
  };

  const toggleSelect = (productId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const filteredIds = useMemo(() => filteredProducts.map(p => p.id), [filteredProducts]);
  // products に実際に存在するものだけカウント（削除済み ID が残らないよう）
  const selectedCount = useMemo(
    () => products.filter(p => selectedIds.has(p.id)).length,
    [products, selectedIds],
  );
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));
  const someFilteredSelected = !allFilteredSelected && filteredIds.some(id => selectedIds.has(id));

  const toggleSelectAllFiltered = () => {
    setSelectedIds(prev => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of filteredIds) next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const idsToDelete = Array.from(selectedIds);
    startTransition(async () => {
      const result = await deleteProducts(idsToDelete);
      if (result.success) {
        const deletedSet = new Set(idsToDelete);
        setProducts(prev => prev.filter(p => !deletedSet.has(p.id)));
        clearSelection();
        toast.success(`${result.deletedCount}件の商品を削除しました`);
      } else {
        toast.error('一括削除に失敗しました');
      }
      setBulkDeleteDialogOpen(false);
    });
  };

  const fieldSchema: ProductFieldSchemaItem[] = organization?.productFieldSchema ?? [];
  const selectedFieldSchema = fieldSchema.find(f => f.key === bulkFieldKey);

  const selectedProducts = useMemo(
    () => products.filter(p => selectedIds.has(p.id)),
    [products, selectedIds],
  );

  const openBulkFieldDialog = useCallback(() => {
    // 選択中の商品をそれぞれ1行ずつのスナップショットに
    const rows: DialogRow[] = products
      .filter(p => selectedIds.has(p.id))
      .map(p => ({ rowId: newRowId(), product: p }));
    dialogRowsRef.current = rows;
    setDialogRows(rows);

    const initial: Record<string, string> = {};
    for (const r of rows) initial[r.rowId] = '';
    setBulkFieldValues(initial);
    setBulkFieldKey('');
    setBulkFieldDialogOpen(true);
  }, [products, selectedIds]);

  const handleFieldKeyChange = (key: string) => {
    setBulkFieldKey(key);
    const rows = dialogRowsRef.current;
    const next: Record<string, string> = {};
    for (const r of rows) next[r.rowId] = '';
    setBulkFieldValues(next);
  };

  // ダイアログ内で商品を追加する（同じ商品でも複数回追加 OK）
  const addProductToDialog = (product: ProductWithRelations) => {
    const row: DialogRow = { rowId: newRowId(), product };
    const next = [...dialogRowsRef.current, row];
    dialogRowsRef.current = next;
    setDialogRows(next);
    setSelectedIds(prev => {
      if (prev.has(product.id)) return prev;
      const s = new Set(prev);
      s.add(product.id);
      return s;
    });
    setBulkFieldValues(prev => ({ ...prev, [row.rowId]: '' }));
  };

  // ダイアログから1行外す。最後の1行が外れたときだけ selectedIds から商品を消す。
  const removeRowFromDialog = (rowId: string) => {
    const target = dialogRowsRef.current.find(r => r.rowId === rowId);
    const next = dialogRowsRef.current.filter(r => r.rowId !== rowId);
    dialogRowsRef.current = next;
    setDialogRows(next);
    if (target && !next.some(r => r.product.id === target.product.id)) {
      setSelectedIds(prev => {
        const s = new Set(prev);
        s.delete(target.product.id);
        return s;
      });
    }
    setBulkFieldValues(prev => {
      const n = { ...prev };
      delete n[rowId];
      return n;
    });
  };

  const uploadOneImage = async (file: File): Promise<{ url: string } | { error: string }> => {
    const optimized = await compressImage(file);
    const formData = new FormData();
    formData.append('file', optimized);
    formData.append('bucket', 'contents');
    formData.append('folder', organizationId ? `products/${organizationId}` : 'products');
    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) return { error: data.error || `HTTP ${res.status}` };
      if (!data.url) return { error: 'URLが返されませんでした' };
      return { url: data.url };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'ネットワークエラー' };
    }
  };

  // image_url（単一）:
  //   1枚選択 → その行にセット
  //   複数選択 → 選択した行から順に各行へ1枚ずつ振り分け（行 = スロット）
  // image_url_list（複数）: 複数ファイルをアップロードして JSON 配列に追記
  const handleBulkImageUpload = async (rowId: string, files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024);
    if (fileArr.length === 0) { toast.error('有効な画像ファイルを選択してください（10MB 以下）'); return; }

    if (selectedFieldSchema?.type === 'image_url_list') {
      // ── 複数画像フィールド: その行に追記 ──
      setBulkUploadingIds(prev => new Set(prev).add(rowId));
      try {
        const uploaded: string[] = [];
        const errors: string[] = [];
        for (const f of fileArr) {
          const result = await uploadOneImage(f);
          if ('url' in result) uploaded.push(result.url);
          else errors.push(`${f.name}: ${result.error}`);
        }
        if (uploaded.length > 0) {
          setBulkFieldValues(prev => {
            const current: string[] = (() => {
              try { const p = JSON.parse(prev[rowId] ?? ''); return Array.isArray(p) ? p : []; } catch { return []; }
            })();
            return { ...prev, [rowId]: JSON.stringify([...current, ...uploaded]) };
          });
          toast.success(`${uploaded.length}枚アップロードしました`);
        }
        if (errors.length > 0) toast.error(`${errors.length}件失敗: ${errors[0]}`);
      } finally {
        setBulkUploadingIds(prev => { const s = new Set(prev); s.delete(rowId); return s; });
      }
    } else {
      // ── 単一画像フィールド: 複数ファイル → 後続の行（スロット）へ順番に振り分け ──
      const rows = dialogRowsRef.current;
      const startIdx = rows.findIndex(r => r.rowId === rowId);
      const targets = rows.slice(startIdx, startIdx + fileArr.length);

      setBulkUploadingIds(prev => {
        const s = new Set(prev);
        targets.forEach(r => s.add(r.rowId));
        return s;
      });
      try {
        const results = await Promise.all(
          fileArr.map((f, i) => targets[i] ? uploadOneImage(f) : Promise.resolve(null as null))
        );
        const errors: string[] = [];
        setBulkFieldValues(prev => {
          const next = { ...prev };
          targets.forEach((r, i) => {
            const res = results[i];
            if (res && 'url' in res) next[r.rowId] = res.url;
            else if (res && 'error' in res) errors.push(`${fileArr[i].name}: ${res.error}`);
          });
          return next;
        });
        const ok = results.filter(r => r && 'url' in r).length;
        if (ok > 0) {
          toast.success(ok === 1 ? '画像をアップロードしました' : `${ok}枚の画像を${ok}個のスロットに割り当てました`);
        }
        if (errors.length > 0) toast.error(`${errors.length}件失敗: ${errors[0]}`);
      } finally {
        setBulkUploadingIds(prev => {
          const s = new Set(prev);
          targets.forEach(r => s.delete(r.rowId));
          return s;
        });
      }
    }
  };

  const handleBulkFieldUpdate = () => {
    if (!bulkFieldKey || dialogRows.length === 0) return;
    const schema = fieldSchema.find(f => f.key === bulkFieldKey);
    if (!schema) return;

    // 同じ商品 ID で複数行ある場合の集約方法はフィールド型で分岐
    //   - image_url: 各行の値を URL として並べて 1枚なら文字列、2枚以上なら JSON 配列文字列に集約
    //   - image_url_list: 各行は既に JSON 配列。重複なしで結合して JSON 配列に
    //   - その他: 「最後の非空値」を採用
    const valueByProduct = new Map<string, string>();

    if (schema.type === 'image_url') {
      const urlsByProduct = new Map<string, string[]>();
      for (const r of dialogRows) {
        const v = (bulkFieldValues[r.rowId] ?? '').trim();
        if (!v) continue;
        const list = urlsByProduct.get(r.product.id) ?? [];
        list.push(v);
        urlsByProduct.set(r.product.id, list);
      }
      // 入力された商品はその値で
      for (const [pid, urls] of urlsByProduct) {
        valueByProduct.set(pid, urls.length === 1 ? urls[0] : JSON.stringify(urls));
      }
      // 1行も非空が無い商品は空文字（現状維持/クリア）
      for (const r of dialogRows) {
        if (!valueByProduct.has(r.product.id)) valueByProduct.set(r.product.id, '');
      }
    } else if (schema.type === 'image_url_list') {
      const allByProduct = new Map<string, string[]>();
      for (const r of dialogRows) {
        const raw = bulkFieldValues[r.rowId] ?? '';
        let list: string[] = [];
        try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) list = parsed.filter(x => typeof x === 'string'); }
        catch { /* ignore */ }
        if (list.length === 0) continue;
        const acc = allByProduct.get(r.product.id) ?? [];
        for (const u of list) if (!acc.includes(u)) acc.push(u);
        allByProduct.set(r.product.id, acc);
      }
      for (const [pid, urls] of allByProduct) {
        valueByProduct.set(pid, JSON.stringify(urls));
      }
      for (const r of dialogRows) {
        if (!valueByProduct.has(r.product.id)) valueByProduct.set(r.product.id, '');
      }
    } else {
      for (const r of dialogRows) {
        const v = bulkFieldValues[r.rowId];
        if (v == null || v === '') continue;
        valueByProduct.set(r.product.id, v);
      }
      for (const r of dialogRows) {
        if (!valueByProduct.has(r.product.id)) {
          valueByProduct.set(r.product.id, bulkFieldValues[r.rowId] ?? '');
        }
      }
    }

    const entries = Array.from(valueByProduct.entries()).map(([productId, value]) => ({ productId, value }));
    startTransition(async () => {
      const result = await bulkUpdateCustomFieldPerProduct(entries, schema.key, schema.label, schema.type);
      if (result.success) {
        setProducts(prev => prev.map(p => {
          const newValue = valueByProduct.get(p.id);
          if (newValue === undefined) return p;
          const existing = Array.isArray((p as unknown as { custom_fields?: unknown }).custom_fields)
            ? [...(p as unknown as { custom_fields: Array<Record<string, unknown>> }).custom_fields]
            : [];
          const idx = existing.findIndex(f => f.key === schema.key);
          if (idx >= 0) {
            existing[idx] = { ...existing[idx], value: newValue };
          } else {
            existing.push({ id: schema.key, key: schema.key, label: schema.label, value: newValue, type: schema.type });
          }
          return { ...p, custom_fields: existing } as typeof p;
        }));
        toast.success(`${result.updatedCount}件の商品を更新しました`);
        setBulkFieldDialogOpen(false);
        setBulkFieldKey('');
        setBulkFieldValues({});
        setDialogRows([]);
        dialogRowsRef.current = [];
      } else {
        toast.error(result.error ?? '一括更新に失敗しました');
      }
    });
  };

  const handleStatusUpdate = (productId: string, newStatus: 'draft' | 'published' | 'archived') => {
    startTransition(async () => {
      const result = await updateProductStatus(productId, newStatus);
      if (result.success) {
        setProducts(prev => prev.map(p =>
          p.id === productId
            ? { ...p, status: newStatus, published_at: newStatus === 'published' ? new Date().toISOString() : p.published_at }
            : p
        ));
      }
    });
  };

  const hasActiveFilter = statusFilter !== 'all' || categoryFilter !== 'all';

  const handleDownloadTemplate = () => {
    const fieldSchema = organization?.productFieldSchema ?? [];

    function escapeCsv(v: string): string {
      if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) return `"${v.replace(/"/g, '""')}"`;
      return v;
    }

    const headers = [
      '商品名※必須', 'slug※必須', 'カテゴリ', 'サブカテゴリ', 'サイズ',
      '価格※必須', 'ステータス', '説明', '並び順', '画像URL',
      ...fieldSchema.map((f) => f.label),
    ];
    const hints = [
      'サンプル商品 1', 'sample-product-1', '食品', '', 'S / M / L',
      '1000', 'draft / published / archived', '商品の説明文', '1',
      'https://example.com/image.jpg（複数は;区切り）',
      ...fieldSchema.map((f) => {
        if (f.type === 'select' || f.type === 'multi_select') return f.options?.join(' / ') ?? '';
        if (f.type === 'boolean') return 'true / false';
        if (f.type === 'number' || f.type === 'rating') return '数値';
        if (f.type === 'date') return 'YYYY-MM-DD';
        if (f.type === 'color') return '#RRGGBB';
        if (f.type === 'url' || f.type === 'image_url') return 'https://...';
        return '';
      }),
    ];
    const sampleRows = Array.from({ length: 30 }, (_, i) => [
      `サンプル商品 ${i + 1}`, `sample-product-${i + 1}`, '', '', '',
      '1000', 'draft', '', String(i + 1), '',
      ...fieldSchema.map(() => ''),
    ]);

    const lines = [
      headers.map(escapeCsv).join(','),
      hints.map(escapeCsv).join(','),
      ...sampleRows.map((r) => r.map(escapeCsv).join(',')),
    ];
    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `商品一括登録テンプレート${fieldSchema.length > 0 ? `_カスタム${fieldSchema.length}項目` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const fieldSchema = organization?.productFieldSchema ?? [];

    function escapeCsv(v: string): string {
      if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    }

    const headers = [
      'id', '商品名', 'slug', 'カテゴリ', 'サブカテゴリ', 'サイズ',
      '価格', 'ステータス', '説明', '並び順', '画像URL',
      '在庫数', 'SKU',
      ...fieldSchema.map((f) => f.label),
    ];

    const rows = filteredProducts.map((p, i) => {
      const variant = p.variants[0];
      const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
      const imageUrls = p.images?.map((img: { url: string }) => img.url).join(';') ?? '';
      const category = p.categories?.[0]?.name ?? '';
      const subcategory = (variant?.options as Record<string, string> | undefined)?.['サブカテゴリ'] ?? '';
      const size = (variant?.options as Record<string, string> | undefined)?.['サイズ'] ?? '';
      const customFields = fieldSchema.map((f) => {
        // custom_fields は配列形式 [{ key, label, value, type }, ...] で保存されている
        const cf = (p as unknown as { custom_fields?: Array<{ key: string; value: unknown }> }).custom_fields;
        const field = Array.isArray(cf) ? cf.find((item) => item.key === f.key) : undefined;
        const val = field?.value;
        let strVal = val !== undefined && val !== null ? String(val) : '';

        // multi_select / list 型は JSON 配列文字列 → カンマ区切り文字列に展開
        if ((f.type === 'multi_select' || f.type === 'list') && strVal) {
          try {
            const parsed = JSON.parse(strVal);
            if (Array.isArray(parsed)) strVal = parsed.join(',');
          } catch {
            // JSON でなければそのまま
          }
        }

        return strVal;
      });
      const baseFields = [
        p.id,
        p.name,
        p.slug ?? '',
        category,
        subcategory,
        size,
        String(variant?.price ?? 0),
        p.status,
        p.description ?? '',
        String(i + 1),
        imageUrls,
        String(totalStock),
        variant?.sku ?? '',
      ];
      const customFieldCells = fieldSchema.map((f, fi) => {
        const strVal = customFields[fi];
        // text / phone 型で純数字8桁以上の値は Excel が科学表記に変換するのを防ぐ
        // escapeCsv の対象外にするため、行セルとして直接出力する
        if ((f.type === 'text' || f.type === 'phone') && /^\d{8,}$/.test(strVal)) {
          return `="${strVal}"`;
        }
        return escapeCsv(strVal);
      });
      return [...baseFields.map(escapeCsv), ...customFieldCells].join(',');
    });

    const lines = [
      headers.map(escapeCsv).join(','),
      ...rows,
    ];

    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suffix = hasActiveFilter || debouncedSearch ? '_フィルター適用' : '';
    a.download = `商品一覧${suffix}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredProducts.length}件の商品をエクスポートしました`);
  };

  return (
    <div className="space-y-5 min-w-0">

      {/* ── ヘッダー ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            商品管理
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              （全{totalProducts.toLocaleString()}件）
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            商品の登録・編集・在庫管理
            <span className="ml-2">
              ・公開中 {stats.published.toLocaleString()}件 / 下書き {stats.draft.toLocaleString()}件
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/products">
              <Sparkles className="h-4 w-4 sm:mr-1.5 text-sky-500" />
              <span className="hidden sm:inline">カスタムフィールド</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">テンプレート</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 sm:mr-1.5 text-slate-400" />
            <span className="hidden sm:inline">CSV出力</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">CSVインポート</span>
          </Button>
          <Button asChild size="sm" className="bg-sky-500 hover:bg-sky-600 text-white shadow-sm">
            <Link href="/products/new">
              <Plus className="h-4 w-4 mr-1.5" />
              商品を追加
            </Link>
          </Button>
        </div>
      </div>

      {/* ── タブ ── */}
      <PageTabs tabs={productTabs} />

      {/* ── 検索・フィルター ── */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="商品名・SKUで検索..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters || hasActiveFilter ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(v => !v)}
            className={hasActiveFilter ? 'bg-sky-500 hover:bg-sky-600 text-white border-sky-500' : ''}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* フィルターパネル（展開式） */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-3 rounded-2xl border border-white/40" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(16px)' }}>
            {/* ステータス */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">ステータス</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'all', label: 'すべて' },
                  { value: 'published', label: '公開中' },
                  { value: 'draft', label: '下書き' },
                  { value: 'archived', label: 'アーカイブ' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${
                      statusFilter === opt.value
                        ? 'bg-sky-500 text-white border-sky-500 font-medium'
                        : 'border-sky-200 text-sky-800 hover:border-sky-400 hover:bg-sky-50'
                    }`}
                    style={statusFilter !== opt.value ? { background: 'rgba(255,255,255,0.35)' } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* カテゴリー */}
            {categories.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">カテゴリー</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${
                      categoryFilter === 'all'
                        ? 'bg-sky-500 text-white border-sky-500 font-medium'
                        : 'border-sky-200 text-sky-800 hover:border-sky-400 hover:bg-sky-50'
                    }`}
                    style={categoryFilter !== 'all' ? { background: 'rgba(255,255,255,0.35)' } : {}}
                  >
                    すべて
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-3 py-1 rounded-full text-xs border transition-all ${
                        categoryFilter === cat.id
                          ? 'bg-sky-500 text-white border-sky-500 font-medium'
                          : 'border-sky-200 text-sky-800 hover:border-sky-400 hover:bg-sky-50'
                      }`}
                      style={categoryFilter !== cat.id ? { background: 'rgba(255,255,255,0.35)' } : {}}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {hasActiveFilter && (
              <div className="w-full flex justify-end">
                <button
                  onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  フィルターをリセット
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 件数表示 / 選択バー ── */}
      {selectedCount > 0 ? (
        <div
          className="flex items-center justify-between gap-3 px-3 py-2 rounded-2xl border border-sky-200/60 shadow-sm"
          style={{ background: 'rgba(224,242,254,0.7)', backdropFilter: 'blur(16px)' }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <Checkbox
              checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
              onCheckedChange={toggleSelectAllFiltered}
              aria-label="表示中の商品をすべて選択"
            />
            <span className="text-sm font-semibold text-sky-900">
              {selectedCount.toLocaleString()}件を選択中
            </span>
            <button
              onClick={toggleSelectAllFiltered}
              className="text-xs text-sky-700 hover:text-sky-900 underline"
            >
              {allFilteredSelected ? '表示中の選択を解除' : `表示中の${filteredProducts.length}件をすべて選択`}
            </button>
            <button
              onClick={clearSelection}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              選択をクリア
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteDialogOpen(true)}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              一括削除
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {(debouncedSearch || hasActiveFilter) ? (
            <>
              <span className="font-semibold text-foreground">{filteredProducts.length.toLocaleString()}</span>
              {' / '}
              {products.length.toLocaleString()} 件を表示中（絞り込み適用）
            </>
          ) : (
            <>
              全 <span className="font-semibold text-foreground">{totalProducts.toLocaleString()}</span> 件
            </>
          )}
        </p>
      )}

      {/* ── 商品グリッド ── */}
      {isLoadingData ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-white/60 bg-white/40 h-52" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-sky-200/40" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)' }}>
          <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-sky-400" />
          </div>
          {products.length === 0 ? (
            <>
              <p className="font-medium mb-1">まだ商品がありません</p>
              <p className="text-sm text-muted-foreground mb-4">最初の商品を追加してみましょう</p>
              <Button asChild size="sm" className="bg-sky-500 hover:bg-sky-600 text-white">
                <Link href="/products/new">
                  <Plus className="h-4 w-4 mr-1.5" />
                  商品を追加
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="font-medium mb-1">該当する商品が見つかりません</p>
              <p className="text-sm text-muted-foreground">検索条件を変えてみてください</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {filteredProducts.map((product) => {
            const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
            const prices = product.variants.map(v => v.price);
            const minPrice = prices.length ? Math.min(...prices) : 0;
            const maxPrice = prices.length ? Math.max(...prices) : 0;
            const priceText = prices.length === 0 ? '-' : minPrice === maxPrice ? formatCurrency(minPrice) : `${formatCurrency(minPrice)}〜`;
            const status = statusConfig[product.status];
            const isOutOfStock = totalStock === 0;

            const isSelected = selectedIds.has(product.id);

            return (
              <div
                key={product.id}
                onClick={() => toggleSelect(product.id)}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(100,120,160,0.15)] ${
                  isSelected ? 'ring-2 ring-sky-400 ring-offset-1' : ''
                }`}
                style={{
                  background: 'rgba(255,255,255,0.62)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.8)',
                  boxShadow: '0 2px 20px rgba(100,120,160,0.07), inset 0 1px 0 rgba(255,255,255,0.95)',
                }}
              >
                {/* 選択チェックボックス */}
                <div
                  className={`absolute top-2 left-2 z-20 transition-opacity pointer-events-none ${
                    isSelected ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'
                  }`}
                >
                  <div className="bg-white/95 backdrop-blur-sm rounded-md p-2 shadow-sm border border-white/80">
                    <Checkbox
                      checked={isSelected}
                      aria-label={`${product.name}を選択`}
                      className="pointer-events-none"
                    />
                  </div>
                </div>

                {/* 画像エリア */}
                <div className="relative aspect-square overflow-hidden rounded-t-2xl"
                  style={{ background: 'linear-gradient(135deg, rgba(250,250,252,0.9) 0%, rgba(245,246,250,0.9) 100%)' }}>
                  {product.images[0] ? (
                    <ProductImage
                      src={product.images[0].thumbnail_url || product.images[0].url}
                      alt={product.images[0].alt || product.name}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-10 w-10 opacity-15" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-red-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide">
                        在庫切れ
                      </span>
                    </div>
                  )}
                </div>

                {/* 情報エリア */}
                <div className="p-3">
                  {/* ステータスドット */}
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                    <span className="text-[10px] text-muted-foreground">{status.label}</span>
                  </div>

                  {/* 商品名 */}
                  <p className="text-xs font-semibold leading-tight line-clamp-2 text-foreground mb-2">
                    {product.name}
                  </p>

                  {/* 価格・在庫 */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{priceText}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      isOutOfStock
                        ? 'text-red-600 bg-red-50'
                        : totalStock <= 5
                          ? 'text-sky-600 bg-sky-50'
                          : 'text-slate-500 bg-slate-50'
                    }`}>
                      在庫 {totalStock}
                    </span>
                  </div>
                </div>

                {/* アクションメニュー（ホバーで表示） */}
                <div
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-white/90 backdrop-blur-sm shadow-sm border border-white/80"
                        disabled={isPending}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link href={`/products/${product.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> 詳細を見る
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/products/${product.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" /> 編集
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => startTransition(async () => {
                          const result = await duplicateProduct(product.id);
                          if (result.data) {
                            toast.success('複製しました');
                            const { data } = await getProducts(organizationId);
                            if (data) setProducts(data);
                          } else {
                            toast.error(result.error || '複製に失敗しました');
                          }
                        })}
                      >
                        <Copy className="mr-2 h-4 w-4" /> 複製
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {product.status !== 'published' && (
                        <DropdownMenuItem onClick={() => handleStatusUpdate(product.id, 'published')}>
                          <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" /> 公開する
                        </DropdownMenuItem>
                      )}
                      {product.status === 'published' && (
                        <DropdownMenuItem onClick={() => handleStatusUpdate(product.id, 'draft')}>
                          <FileEdit className="mr-2 h-4 w-4" /> 下書きに戻す
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleStatusUpdate(product.id, 'archived')}>
                        <Archive className="mr-2 h-4 w-4" /> アーカイブ
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => { setProductToDelete(product); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> 削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ダイアログ類 ── */}
      <ProductImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        organizationId={organizationId}
        fieldSchema={organization?.productFieldSchema ?? []}
        onImportComplete={async () => {
          const [p, c] = await Promise.all([getProducts(organizationId), getCategories(organizationId)]);
          if (p.data) setProducts(p.data);
          if (c.data) setCategories(c.data);
          toast.success('インポートが完了しました');
        }}
      />

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>選択した商品を一括削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              選択中の <span className="font-semibold text-foreground">{selectedCount.toLocaleString()}件</span> の商品を削除します。関連するバリエーション・画像・カテゴリ紐付けも削除され、この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />削除中...</> : `${selectedCount.toLocaleString()}件を削除する`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>商品を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{productToDelete?.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />削除中...</> : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
