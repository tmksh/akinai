'use client';

import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
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

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onImportComplete: () => void;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'result';

interface ParsedRow {
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
          if (!raw['商品名'] || !raw['slug']) {
            errors.push(`行 ${i + 2}: 商品名またはslugが空です`);
            continue;
          }
          const price = parseInt(raw['価格'], 10);
          if (isNaN(price)) {
            errors.push(`行 ${i + 2}: 価格が無効です (${raw['価格']})`);
            continue;
          }

          const imageUrlStr = raw['画像URL'] || '';
          const imageUrls = imageUrlStr
            .split(';')
            .map(u => u.trim())
            .filter(u => u.length > 0);

          rows.push({
            name: raw['商品名'].trim(),
            slug: raw['slug'].trim(),
            category: raw['カテゴリ']?.trim() || '',
            subcategory: raw['サブカテゴリ']?.trim() || '',
            size: raw['サイズ']?.trim() || '',
            price,
            status: raw['ステータス']?.trim() || 'draft',
            description: raw['説明']?.trim() || '',
            sortOrder: parseInt(raw['並び順'], 10) || 0,
            imageUrls,
          });
        }

        if (results.errors.length > 0) {
          for (const err of results.errors.slice(0, 5)) {
            errors.push(`CSV解析エラー (行 ${(err.row ?? 0) + 2}): ${err.message}`);
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
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{parsedRows.length}</p>
                <p className="text-xs text-muted-foreground">商品数</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{categorySet.size}</p>
                <p className="text-xs text-muted-foreground">カテゴリ数</p>
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
                      <th className="text-left p-2 font-medium">商品名</th>
                      <th className="text-left p-2 font-medium">カテゴリ</th>
                      <th className="text-left p-2 font-medium">サイズ</th>
                      <th className="text-right p-2 font-medium">価格</th>
                      <th className="text-left p-2 font-medium">説明</th>
                      <th className="text-center p-2 font-medium">画像</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2 font-medium max-w-[200px] truncate">{row.name}</td>
                        <td className="p-2 text-muted-foreground">{row.category}</td>
                        <td className="p-2 text-muted-foreground">{row.size}</td>
                        <td className="p-2 text-right">¥{row.price.toLocaleString()}</td>
                        <td className="p-2 text-muted-foreground max-w-[150px] truncate" title={row.description}>
                          {row.description ? row.description.slice(0, 30) + (row.description.length > 30 ? '…' : '') : '-'}
                        </td>
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
                {parsedRows.length}件の商品を登録しています
              </p>
            </div>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="space-y-4">
            <div className={`rounded-lg p-6 text-center ${importResult.failed === 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
              {importResult.failed === 0 ? (
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
              ) : (
                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-amber-500" />
              )}
              <p className="text-lg font-bold">
                {importResult.success}件の商品をインポートしました
              </p>
              {importResult.failed > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
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
                {parsedRows.length}件をインポート
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
