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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { importCustomers, type CsvCustomerRow, type CustomerImportResult } from '@/lib/actions/customers';
import type { CustomerFieldSchema } from '@/lib/actions/settings';
import type { CustomerRoleLabels, CustomerRoleEnabled } from '@/lib/customer-roles';
import { toast } from 'sonner';

interface CustomerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onImportComplete: () => void;
  fieldSchema?: CustomerFieldSchema[];
  roleLabels?: CustomerRoleLabels;
  roleEnabled?: CustomerRoleEnabled;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'result';

type Role = 'personal' | 'buyer' | 'supplier';

interface RawRow {
  [key: string]: string;
}

export function CustomerImportDialog({
  open,
  onOpenChange,
  organizationId,
  onImportComplete,
  fieldSchema = [],
  roleLabels,
  roleEnabled,
}: CustomerImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedRows, setParsedRows] = useState<CsvCustomerRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<CustomerImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [defaultRole, setDefaultRole] = useState<Role>('personal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const enabledRoles = (['personal', 'buyer', 'supplier'] as Role[]).filter(
    (r) => !roleEnabled || roleEnabled[r]
  );

  const getRoleLabel = (role: Role) => {
    if (!roleLabels) return role === 'personal' ? '個人会員' : role === 'buyer' ? 'バイヤー' : 'サプライヤー';
    return roleLabels[role];
  };

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

  const parseRows = useCallback((rows: RawRow[], role: Role): { parsed: CsvCustomerRow[]; errors: string[] } => {
    const errors: string[] = [];
    const parsed: CsvCustomerRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const name = raw['氏名・会社名']?.trim() || raw['氏名']?.trim() || raw['name']?.trim() || '';
      const email = raw['メールアドレス']?.trim() || raw['email']?.trim() || '';

      if (!name || !email) {
        errors.push(`行 ${i + 2}: 氏名・会社名またはメールアドレスが空です`);
        continue;
      }

      const rawStatus = raw['ステータス']?.trim() || '';
      const status = (['active', 'pending', 'suspended'].includes(rawStatus) ? rawStatus : 'active') as CsvCustomerRow['status'];

      const hasAddress =
        raw['郵便番号']?.trim() || raw['市区町村']?.trim() || raw['番地等']?.trim();

      const customFields = fieldSchema
        .map((f) => {
          const colValue = raw[f.label]?.trim() ?? raw[`${f.label}※必須`]?.trim() ?? '';
          if (colValue === '') return null;
          return {
            key: f.key,
            label: f.label,
            value: colValue,
            type: f.type,
            ...(f.options ? { options: f.options } : {}),
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null);

      parsed.push({
        name,
        email,
        phone: raw['電話番号']?.trim() || undefined,
        company: raw['会社名']?.trim() || undefined,
        notes: raw['メモ']?.trim() || undefined,
        status,
        role,
        prefecture: raw['都道府県']?.trim() || undefined,
        businessType: raw['業種']?.trim() || undefined,
        address: hasAddress ? {
          postalCode: raw['郵便番号']?.trim() || '',
          prefecture: raw['都道府県_住所']?.trim() || raw['都道府県']?.trim() || '',
          city: raw['市区町村']?.trim() || '',
          line1: raw['番地等']?.trim() || '',
          line2: raw['建物名・部屋番号']?.trim() || undefined,
        } : undefined,
        customFields: customFields.length > 0 ? customFields : undefined,
      });
    }

    return { parsed, errors };
  }, [fieldSchema]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('CSVファイルを選択してください');
      return;
    }
    setFileName(file.name);

    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const { parsed, errors } = parseRows(results.data, defaultRole);
        if (results.errors.length > 0) {
          for (const err of results.errors.slice(0, 5)) {
            errors.push(`CSV解析エラー (行 ${(err.row ?? 0) + 2}): ${err.message}`);
          }
        }
        setParsedRows(parsed);
        setParseErrors(errors);
        setStep('preview');
      },
      error: (error) => {
        toast.error(`CSVの読み込みに失敗しました: ${error.message}`);
      },
    });
  }, [defaultRole, parseRows]);

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

      const result = await importCustomers(organizationId, parsedRows);

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

  const roleCounts = parsedRows.reduce((acc, r) => {
    acc[r.role] = (acc[r.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-sky-500" />
            顧客CSVインポート
          </DialogTitle>
          <DialogDescription>
            CSVファイルから顧客を一括登録します
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-3">
            {/* 種別選択 */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400 shrink-0">登録する種別</span>
              <Select value={defaultRole} onValueChange={(v) => setDefaultRole(v as Role)}>
                <SelectTrigger className="h-8 text-sm flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enabledRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                対応カラム: 氏名・会社名, メールアドレス, 電話番号, 会社名, メモ, ステータス, 郵便番号, 都道府県, 市区町村, 番地等, 建物名・部屋番号, 業種
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
                <p className="text-xs text-muted-foreground">顧客数</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{parsedRows.filter(r => r.address).length}</p>
                <p className="text-xs text-muted-foreground">住所あり</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{parsedRows.filter(r => r.customFields && r.customFields.length > 0).length}</p>
                <p className="text-xs text-muted-foreground">カスタム入力あり</p>
              </div>
            </div>

            {/* 種別内訳 */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(roleCounts).map(([role, count]) => (
                <Badge key={role} variant="secondary" className="text-xs">
                  {getRoleLabel(role as Role)} × {count}
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
                      <th className="text-left p-2 font-medium">氏名</th>
                      <th className="text-left p-2 font-medium">メール</th>
                      <th className="text-left p-2 font-medium">電話番号</th>
                      <th className="text-left p-2 font-medium">ステータス</th>
                      <th className="text-left p-2 font-medium">住所</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2 font-medium max-w-[120px] truncate">{row.name}</td>
                        <td className="p-2 text-muted-foreground max-w-[150px] truncate">{row.email}</td>
                        <td className="p-2 text-muted-foreground">{row.phone || '-'}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {row.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {row.address ? `${row.address.prefecture}${row.address.city}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* パースエラー */}
            {parseErrors.length > 0 && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-800 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-sky-600" />
                  <span className="text-sm font-medium text-sky-800 dark:text-sky-200">
                    {parseErrors.length}件の警告
                  </span>
                </div>
                <ul className="text-xs text-sky-700 dark:text-sky-300 space-y-1">
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
                {parsedRows.length}件の顧客を登録しています
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
                {importResult.success}件の顧客を登録しました
              </p>
              {importResult.failed > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {importResult.failed}件が失敗しました
                </p>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">行</th>
                        <th className="text-left p-2 font-medium">氏名</th>
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
