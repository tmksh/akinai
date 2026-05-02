'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { CustomerFieldSchema } from '@/lib/actions/settings';
import type { CustomerRoleLabels, CustomerRoleEnabled } from '@/lib/customer-roles';

type Role = 'personal' | 'buyer' | 'supplier';

interface ImportTemplateDialogProps {
  fieldSchema: CustomerFieldSchema[];
  roleLabels: CustomerRoleLabels;
  roleEnabled: CustomerRoleEnabled;
}

const SAMPLE_COUNT = 15;

/** 種別ごとの固定カラム定義 */
const COMMON_COLUMNS = [
  { key: 'name', label: '氏名・会社名', required: true, placeholder: '山田太郎' },
  { key: 'email', label: 'メールアドレス', required: true, placeholder: 'taro@example.com' },
  { key: 'phone', label: '電話番号', required: false, placeholder: '090-1234-5678' },
  { key: 'notes', label: 'メモ', required: false, placeholder: '' },
  { key: 'status', label: 'ステータス', required: false, placeholder: 'active' },
] as const;

const BUSINESS_COLUMNS = [
  { key: 'company', label: '会社名', required: false, placeholder: '株式会社サンプル' },
  { key: 'business_type', label: '業種', required: false, placeholder: '製造業' },
] as const;

const ADDRESS_COLUMNS = [
  { key: 'address_postal_code', label: '郵便番号', required: false, placeholder: '150-0001' },
  { key: 'address_prefecture', label: '都道府県', required: false, placeholder: '東京都' },
  { key: 'address_city', label: '市区町村', required: false, placeholder: '渋谷区' },
  { key: 'address_line1', label: '番地等', required: false, placeholder: '渋谷1-1-1' },
  { key: 'address_line2', label: '建物名・部屋番号', required: false, placeholder: 'サンプルビル 101' },
] as const;

/** CSVとして安全な文字列に変換 */
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** 種別に対応するカスタムフィールドを抽出 */
function getFieldsForRole(schema: CustomerFieldSchema[], role: Role): CustomerFieldSchema[] {
  return schema.filter((f) => {
    if (!f.roles || f.roles.length === 0) return true;
    return f.roles.includes(role);
  });
}

/** CSVヘッダー行とサンプルデータ行を生成 */
function buildCsv(role: Role, schema: CustomerFieldSchema[]): string {
  const customFields = getFieldsForRole(schema, role);
  const isBusinessRole = role === 'buyer' || role === 'supplier';

  // ヘッダー（末尾に ※必須 を付与）
  const headers: string[] = [
    ...COMMON_COLUMNS.map((c) => (c.required ? `${c.label}※必須` : c.label)),
    ...(isBusinessRole ? BUSINESS_COLUMNS.map((c) => c.label) : []),
    ...ADDRESS_COLUMNS.map((c) => c.label),
    ...customFields.map((f) => (f.required ? `${f.label}※必須` : f.label)),
  ];

  // フォーマット説明行（2行目）
  const formatHints: string[] = [
    ...COMMON_COLUMNS.map((c) => {
      if (c.key === 'status') return 'active / pending / suspended';
      return c.placeholder;
    }),
    ...(isBusinessRole ? BUSINESS_COLUMNS.map((c) => c.placeholder) : []),
    ...ADDRESS_COLUMNS.map((c) => c.placeholder),
    ...customFields.map((f) => {
      if (f.type === 'select' || f.type === 'multiselect') {
        return f.options?.join(' / ') ?? '';
      }
      if (f.type === 'boolean') return 'true / false';
      if (f.type === 'number') return '数値';
      return f.placeholder ?? '';
    }),
  ];

  // サンプル行生成
  const sampleRows = Array.from({ length: SAMPLE_COUNT }, (_, i) => {
    const n = i + 1;
    const row: string[] = [
      `サンプル ${n}`,
      `sample${n}@example.com`,
      `090-0000-${String(n).padStart(4, '0')}`,
      '',
      'active',
    ];
    if (isBusinessRole) {
      row.push(`サンプル株式会社 ${n}`, '');
    }
    // 住所（空欄）
    row.push('', '', '', '', '');
    // カスタムフィールド（空欄）
    customFields.forEach(() => row.push(''));
    return row;
  });

  const lines = [
    headers.map(escapeCsv).join(','),
    formatHints.map(escapeCsv).join(','),
    ...sampleRows.map((row) => row.map(escapeCsv).join(',')),
  ];

  // BOM付き UTF-8（Excelで文字化けしないように）
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

export function ImportTemplateDialog({
  fieldSchema,
  roleLabels,
  roleEnabled,
}: ImportTemplateDialogProps) {
  const [open, setOpen] = useState(false);

  const enabledRoles = (Object.entries(roleEnabled) as [Role, boolean][]).filter(([, v]) => v);

  const handleDownload = (role: Role) => {
    const csv = buildCsv(role, fieldSchema);
    const label = roleLabels[role];
    const customCount = getFieldsForRole(fieldSchema, role).length;
    const filename = `顧客一括登録テンプレート_${label}${customCount > 0 ? `_カスタム${customCount}項目` : ''}.csv`;
    downloadCsv(csv, filename);
    setOpen(false);
  };

  const handleDownloadAll = () => {
    setOpen(true);
  };

  // 有効な種別が1つだけなら直接ダウンロード
  if (enabledRoles.length === 1) {
    const [[role]] = enabledRoles;
    return (
      <Button variant="outline" size="sm" onClick={() => handleDownload(role)}>
        <Download className="mr-2 h-4 w-4" />
        一括登録テンプレート
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            一括登録テンプレート
            <ChevronDown className="ml-1 h-3.5 w-3.5 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {enabledRoles.map(([role]) => {
            const customCount = getFieldsForRole(fieldSchema, role).length;
            return (
              <DropdownMenuItem
                key={role}
                onClick={() => handleDownload(role)}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                  {roleLabels[role]}
                </span>
                {customCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    +{customCount}項目
                  </Badge>
                )}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuItem onClick={handleDownloadAll} className="text-sky-600">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            種別ごとに確認する
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-sky-500" />
              一括登録テンプレート
            </DialogTitle>
            <DialogDescription>
              種別を選択してCSVテンプレートをダウンロードします。
              ヘッダー行・フォーマット説明行の後に{SAMPLE_COUNT}行分のサンプルが入っています。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {enabledRoles.map(([role]) => {
              const customFields = getFieldsForRole(fieldSchema, role);
              const isBusinessRole = role === 'buyer' || role === 'supplier';
              const totalCols =
                COMMON_COLUMNS.length +
                (isBusinessRole ? BUSINESS_COLUMNS.length : 0) +
                ADDRESS_COLUMNS.length +
                customFields.length;

              return (
                <button
                  key={role}
                  onClick={() => handleDownload(role)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-sky-950/30 hover:border-sky-300 transition-all text-left group"
                >
                  <div>
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100 group-hover:text-sky-700">
                      {roleLabels[role]}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {totalCols}カラム
                      {customFields.length > 0 && (
                        <span className="text-sky-500 ml-1">
                          （カスタム{customFields.length}項目含む）
                        </span>
                      )}
                      ・{SAMPLE_COUNT}行サンプル付き
                    </div>
                    {customFields.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {customFields.map((f) => (
                          <Badge
                            key={f.key}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {f.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Download className="h-4 w-4 text-slate-400 group-hover:text-sky-500 shrink-0 ml-3" />
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
