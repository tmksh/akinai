'use client';

import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { importProducts, type CsvProductRow, type ImportResult } from '@/lib/actions/products';
import { toast } from 'sonner';
import type { ProductFieldSchemaItem } from '@/components/providers/organization-provider';

const TEMPLATE_SAMPLE_COUNT = 30;

/** CSVとして安全な文字列に変換 */
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Excel が科学表記に変換した値を元に戻す。
 * - ="12345" 形式（Excel 強制テキスト）→ 12345
 * - 4.58993E+12 のような科学表記 → 整数文字列（精度が失われている場合あり）
 */
function normalizeExcelValue(v: string): string {
  const trimmed = v.trim();
  // ="..." 形式を剥がす
  const formulaMatch = trimmed.match(/^="([\s\S]*)"$/);
  if (formulaMatch) return formulaMatch[1];
  // 科学表記を検出して変換（例: 4.58993E+12 → 4589930000000）
  // ※精度が既に失われているため、ユーザーには再入力を促す
  if (/^-?\d+\.?\d*[eE][+\-]?\d+$/i.test(trimmed)) {
    const num = Number(trimmed);
    if (!isNaN(num) && Number.isFinite(num)) return num.toFixed(0);
  }
  return trimmed;
}

/**
 * Google Drive 共有URL等を <img src> で表示可能な直接URLに正規化する。
 * drive.google.com/thumbnail は 302 リダイレクトで lh3.googleusercontent.com に飛び、
 * その途中の Content-Type が image でないため Next.js Image が 400 を返す。
 * これを避けるため、最初から lh3.googleusercontent.com を直接指す URL に変換する。
 *
 * - https://drive.google.com/file/d/{ID}/view?... → https://lh3.googleusercontent.com/d/{ID}=w1600
 * - https://drive.google.com/open?id={ID}        → 同上
 * - https://drive.google.com/uc?id={ID}          → 同上
 * - それ以外はそのまま返す
 */
function normalizeImageUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  if (!trimmed.includes('drive.google.com') && !trimmed.includes('docs.google.com')) {
    return trimmed;
  }
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return `https://lh3.googleusercontent.com/d/${fileMatch[1]}=w1600`;
  }
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    return `https://lh3.googleusercontent.com/d/${idMatch[1]}=w1600`;
  }
  return trimmed;
}

function buildProductTemplateCsv(fieldSchema: ProductFieldSchemaItem[]): string {
  const fixedHeaders = [
    'id（更新時に使用）',
    '商品名※必須',
    'slug※必須',
    'カテゴリ',
    'サブカテゴリ',
    'サイズ',
    '価格※必須',
    'ステータス',
    '説明',
    '並び順',
    '画像URL',
  ];
  const fixedHints = [
    '（空欄で新規作成）',
    'サンプル商品 1',
    'sample-product-1',
    '食品',
    '',
    'S / M / L',
    '1000',
    'draft / published / archived',
    '商品の説明文',
    '1',
    'https://example.com/image.jpg（複数は;区切り）',
  ];

  const customHeaders = fieldSchema.map((f) =>
    f.type === 'text' || f.type === 'textarea' || f.type === 'url' || f.type === 'email' || f.type === 'phone'
      ? f.label
      : f.label
  );
  const customHints = fieldSchema.map((f) => {
    if (f.type === 'multi_select') return `${f.options?.join(' / ') ?? ''}（複数はカンマ区切り）`;
    if (f.type === 'list') return '値1,値2,値3（カンマ区切り）';
    if (f.type === 'select') return f.options?.join(' / ') ?? '';
    if (f.type === 'boolean') return 'true / false';
    if (f.type === 'number' || f.type === 'rating') return '数値';
    if (f.type === 'date') return 'YYYY-MM-DD';
    if (f.type === 'color') return '#RRGGBB';
    if (f.type === 'url' || f.type === 'image_url') return 'https://...';
    return '';
  });

  const headers = [...fixedHeaders, ...customHeaders];
  const hints = [...fixedHints, ...customHints];

  const sampleRows = Array.from({ length: TEMPLATE_SAMPLE_COUNT }, (_, i) => {
    const n = i + 1;
    const row = [
      '',
      `サンプル商品 ${n}`,
      `sample-product-${n}`,
      '',
      '',
      '',
      '1000',
      'draft',
      '',
      String(n),
      '',
      ...fieldSchema.map(() => ''),
    ];
    return row;
  });

  const lines = [
    headers.map(escapeCsv).join(','),
    hints.map(escapeCsv).join(','),
    ...sampleRows.map((row) => row.map(escapeCsv).join(',')),
  ];

  return '\uFEFF' + lines.join('\r\n');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onImportComplete: () => void;
  fieldSchema?: ProductFieldSchemaItem[];
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'result';

interface ParsedRow {
  id?: string;
  商品名: string;
  slug: string;
  カテゴリ: string;
  サブカテゴリ: string;
  サイズ: string;
  価格: string;
  ステータス: string;
  説明: string;
  並び順: string;
  画像URL: string;
}

export function ProductImportDialog({
  open,
  onOpenChange,
  organizationId,
  onImportComplete,
  fieldSchema = [],
}: ProductImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedRows, setParsedRows] = useState<CsvProductRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setParsedRows([]);
    setFileName('');
    setParseErrors([]);
    setImportResult(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) reset();
    onOpenChange(newOpen);
  }, [onOpenChange, reset]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('CSVファイルを選択してください');
      return;
    }

    setFileName(file.name);

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const errors: string[] = [];
        const rows: CsvProductRow[] = [];

        for (let i = 0; i < results.data.length; i++) {
          const raw = results.data[i];
          const rawAny = raw as unknown as Record<string, string>;
          // ヘッダーに "列名※必須" 形式が含まれていても拾えるようフォールバック
          const get = (k: string): string =>
            (rawAny[k] ?? rawAny[`${k}※必須`] ?? '').toString();

          const name = get('商品名').trim();
          if (!name) {
            errors.push(`行 ${i + 2}: 商品名が空です`);
            continue;
          }
          const priceStr = get('価格');
          const price = parseInt(priceStr, 10);
          if (isNaN(price)) {
            errors.push(`行 ${i + 2}: 価格が無効です (${priceStr})`);
            continue;
          }

          // id 列: ヘッダー名が「id（更新時に使用）」の場合もフォールバックで読む
          const rawId =
            rawAny['id'] ??
            rawAny['id（更新時に使用）'] ??
            '';
          const productId = rawId.toString().trim() || undefined;

          const imageUrlStr = get('画像URL');
          const imageUrls = imageUrlStr
            .split(';')
            .map(u => normalizeImageUrl(u.trim()))
            .filter(u => u.length > 0);

          // カスタムフィールド列を読み込む（ラベル名でマッチ）
          const customFields = fieldSchema
            .map((f) => {
              const rawColValue = rawAny[f.label] ?? rawAny[`${f.label}※必須`] ?? '';
              if (rawColValue === '') return null;
              const rawStr = rawColValue.toString();
              // 科学表記が検出された場合は警告（精度が失われている可能性）
              if (/^-?\d+\.?\d*[eE][+\-]?\d+$/i.test(rawStr.trim())) {
                errors.push(`行 ${i + 2} [${f.label}]: 科学表記（${rawStr}）が検出されました。Excelで開いたことで精度が失われている可能性があります。`);
              }
              // Excel による科学表記・="..." 形式を正規化
              let colValue = normalizeExcelValue(rawStr);
              if (colValue === '') return null;

              // multi_select / list 型はカンマ・読点・セミコロン区切りを JSON 配列文字列に変換
              if (f.type === 'multi_select' || f.type === 'list') {
                // 既に JSON 配列ならそのまま使う
                let isJsonArray = false;
                try {
                  const parsed = JSON.parse(colValue);
                  if (Array.isArray(parsed)) isJsonArray = true;
                } catch {
                  // ignore
                }
                if (!isJsonArray) {
                  const arr = colValue
                    .split(/[,、;；\n]/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  colValue = JSON.stringify(arr);
                }
              }

              return {
                key: f.key,
                label: f.label,
                value: colValue,
                type: f.type,
                ...(f.options ? { options: f.options } : {}),
              };
            })
            .filter((f): f is NonNullable<typeof f> => f !== null);

          rows.push({
            id: productId,
            name,
            slug: get('slug').trim(),
            category: get('カテゴリ').trim(),
            subcategory: get('サブカテゴリ').trim(),
            size: get('サイズ').trim(),
            price,
            status: get('ステータス').trim() || 'draft',
            description: get('説明').trim(),
            sortOrder: parseInt(get('並び順'), 10) || 0,
            imageUrls,
            customFields: customFields.length > 0 ? customFields : undefined,
          });
        }

        if (results.errors.length > 0) {
          for (const err of results.errors.slice(0, 5)) {
            errors.push(`CSV解析エラー (行 ${(err.row ?? 0) + 2}): ${err.message}`);
          }
        }

        // CSV内での商品名重複を警告
        const nameCounts = new Map<string, number>();
        for (const r of rows) {
          const key = r.name.trim().toLowerCase();
          nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
        }
        for (const [, count] of nameCounts) {
          if (count > 1) {
            const dupName = rows.find(r => nameCounts.get(r.name.trim().toLowerCase())! > 1)?.name;
            errors.push(`⚠️ 同じ商品名が${count}行含まれています（例: 「${dupName}」）。重複はサーバー側で自動的に更新扱いになります。`);
            break;
          }
        }

        setParsedRows(rows);
        setParseErrors(errors);
        setStep('preview');
      },
      error: (error) => {
        toast.error(`CSVの読み込みに失敗しました: ${error.message}`);
      },
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleImport = useCallback(async () => {
    setStep('importing');
    setProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      const result = await importProducts(organizationId, parsedRows);

      clearInterval(progressInterval);
      setProgress(100);
      setImportResult(result);
      setStep('result');

      if (result.success > 0) {
        onImportComplete();
      }
    } catch {
      toast.error('インポート中にエラーが発生しました');
      setStep('preview');
    }
  }, [organizationId, parsedRows, onImportComplete]);

  const categorySet = new Set(parsedRows.map(r => r.category).filter(Boolean));
  const statusCounts = parsedRows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const updateCount = parsedRows.filter(r => r.id).length;
  const newCount = parsedRows.length - updateCount;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            商品CSVインポート
          </DialogTitle>
          <DialogDescription>
            CSVファイルから商品を一括登録します
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-3">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed rounded-lg p-10 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                CSVファイルをドラッグ＆ドロップ
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                またはクリックしてファイルを選択
              </p>
              <p className="text-xs text-muted-foreground">
                対応カラム: 商品名, slug, カテゴリ, サブカテゴリ, サイズ, 価格, ステータス, 説明, 並び順, 画像URL
                {fieldSchema.length > 0 && `、カスタム${fieldSchema.length}項目`}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  テンプレートをダウンロード
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {TEMPLATE_SAMPLE_COUNT}行サンプル付き
                  {fieldSchema.length > 0 && (
                    <span className="text-sky-500 ml-1">・カスタムフィールド{fieldSchema.length}項目含む</span>
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  const csv = buildProductTemplateCsv(fieldSchema);
                  const customCount = fieldSchema.length;
                  const filename = `商品一括登録テンプレート${customCount > 0 ? `_カスタム${customCount}項目` : ''}.csv`;
                  downloadCsv(csv, filename);
                }}
              >
                <Download className="h-4 w-4 mr-1.5" />
                CSV取得
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4 mr-1" />
                やり直す
              </Button>
            </div>

            {/* サマリー */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{parsedRows.length}</p>
                <p className="text-xs text-muted-foreground">合計</p>
              </div>
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{newCount}</p>
                <p className="text-xs text-muted-foreground">新規</p>
              </div>
              <div className="rounded-lg border border-sky-200 dark:border-sky-800 p-3 text-center">
                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{updateCount}</p>
                <p className="text-xs text-muted-foreground">更新</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{parsedRows.reduce((sum, r) => sum + r.imageUrls.length, 0)}</p>
                <p className="text-xs text-muted-foreground">画像数</p>
              </div>
            </div>

            {/* ステータス内訳 */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Badge key={status} variant="secondary" className="text-xs">
                  {status === 'published' ? '公開' : status === 'draft' ? '下書き' : status} × {count}
                </Badge>
              ))}
              {[...categorySet].map(cat => (
                <Badge key={cat} variant="outline" className="text-xs">
                  {cat}
                </Badge>
              ))}
            </div>

            {/* プレビューテーブル */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">種別</th>
                      <th className="text-left p-2 font-medium">商品名</th>
                      <th className="text-left p-2 font-medium">カテゴリ</th>
                      <th className="text-right p-2 font-medium">価格</th>
                      <th className="text-center p-2 font-medium">画像</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2">
                          {row.id ? (
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                              更新
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              新規
                            </span>
                          )}
                        </td>
                        <td className="p-2 font-medium max-w-[200px] truncate">{row.name}</td>
                        <td className="p-2 text-muted-foreground">{row.category}</td>
                        <td className="p-2 text-right">¥{row.price.toLocaleString()}</td>
                        <td className="p-2 text-center text-muted-foreground">{row.imageUrls.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* パースエラー */}
            {parseErrors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {parseErrors.length}件の警告
                  </span>
                </div>
                {parseErrors.some(e => e.includes('科学表記')) && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-2 leading-relaxed">
                    ⚠️ JANコードなどの数値はExcelで開くと精度が失われます。今後は <strong>CSV出力</strong> ボタンで出力したファイルをそのまま使用してください（自動的に保護されます）。
                  </p>
                )}
                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  {parseErrors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <div>
              <p className="text-sm font-medium mb-2">インポート中...</p>
              <Progress value={progress} className="w-full max-w-xs mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">
                {parsedRows.length}件の商品を処理しています
                {updateCount > 0 && `（更新 ${updateCount}件 / 新規 ${newCount}件）`}
              </p>
            </div>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="space-y-4">
            <div className={`rounded-lg p-6 text-center ${importResult.failed === 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-sky-50 dark:bg-sky-950/30'}`}>
              {importResult.failed === 0 ? (
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
              ) : (
                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-sky-500" />
              )}
              <p className="text-lg font-bold">
                {importResult.success}件の処理が完了しました
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {importResult.updated > 0 && `更新 ${importResult.updated}件`}
                {importResult.updated > 0 && importResult.success - importResult.updated > 0 && ' ・ '}
                {importResult.success - importResult.updated > 0 && `新規作成 ${importResult.success - importResult.updated}件`}
              </p>
              {importResult.failed > 0 && (
                <p className="text-sm text-destructive mt-1">
                  {importResult.failed}件が失敗しました
                </p>
              )}
            </div>

            {/* エラー詳細 */}
            {importResult.errors.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">行</th>
                        <th className="text-left p-2 font-medium">商品名</th>
                        <th className="text-left p-2 font-medium">エラー</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errors.map((err, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{err.row}</td>
                          <td className="p-2 font-medium">{err.name}</td>
                          <td className="p-2 text-destructive">{err.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleImport}
                disabled={parsedRows.length === 0}
                className="btn-premium"
              >
                <Upload className="mr-2 h-4 w-4" />
                {updateCount > 0 && newCount > 0
                  ? `新規 ${newCount}件・更新 ${updateCount}件を実行`
                  : updateCount > 0
                    ? `${updateCount}件を更新`
                    : `${parsedRows.length}件をインポート`}
              </Button>
            </>
          )}
          {step === 'result' && (
            <Button onClick={() => handleOpenChange(false)}>
              閉じる
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
