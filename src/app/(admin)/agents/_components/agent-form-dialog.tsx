'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Percent,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { type Agent } from '@/lib/mock-data';
import { toast } from 'sonner';

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: Agent | null;
  onSubmit: (data: AgentFormData) => Promise<void>;
}

export interface AgentFormData {
  code: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  commissionRate: number;
  status: Agent['status'];
}

export function AgentFormDialog({
  open,
  onOpenChange,
  agent,
  onSubmit,
}: AgentFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    code: '',
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    commissionRate: 10,
    status: 'pending',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AgentFormData, string>>>({});

  const isEditing = !!agent;

  useEffect(() => {
    if (agent) {
      setFormData({
        code: agent.code,
        name: agent.name,
        company: agent.company,
        email: agent.email,
        phone: agent.phone,
        address: agent.address,
        commissionRate: agent.commissionRate,
        status: agent.status,
      });
    } else {
      setFormData({
        code: '',
        name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        commissionRate: 10,
        status: 'pending',
      });
    }
    setErrors({});
  }, [agent, open]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AgentFormData, string>> = {};

    if (!formData.code.trim()) {
      newErrors.code = '代理店コードは必須です';
    }
    if (!formData.name.trim()) {
      newErrors.name = '担当者名は必須です';
    }
    if (!formData.company.trim()) {
      newErrors.company = '会社名は必須です';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスは必須です';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'メールアドレスの形式が正しくありません';
    }
    if (formData.commissionRate < 0 || formData.commissionRate > 100) {
      newErrors.commissionRate = '0〜100の範囲で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success(isEditing ? '代理店情報を更新しました' : '代理店を登録しました');
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? '更新に失敗しました' : '登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof AgentFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-500" />
            {isEditing ? '代理店情報を編集' : '新規代理店登録'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? '代理店パートナーの情報を更新します'
              : '新しい代理店パートナーを登録します'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 代理店コード・ステータス */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="flex items-center gap-1">
                代理店コード
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                placeholder="AG-006"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                className={errors.code ? 'border-destructive' : ''}
              />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">ステータス</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value as Agent['status'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">審査中</SelectItem>
                  <SelectItem value="active">アクティブ</SelectItem>
                  <SelectItem value="inactive">停止中</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 会社名 */}
          <div className="space-y-2">
            <Label htmlFor="company" className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              会社名
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company"
              placeholder="株式会社サンプル"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              className={errors.company ? 'border-destructive' : ''}
            />
            {errors.company && (
              <p className="text-xs text-destructive">{errors.company}</p>
            )}
          </div>

          {/* 担当者名 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              担当者名
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="山田 太郎"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* 連絡先 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                メールアドレス
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                電話番号
              </Label>
              <Input
                id="phone"
                placeholder="03-1234-5678"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
          </div>

          {/* 住所 */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              住所
            </Label>
            <Textarea
              id="address"
              placeholder="東京都千代田区..."
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={2}
            />
          </div>

          {/* コミッション率 */}
          <div className="space-y-2">
            <Label htmlFor="commissionRate" className="flex items-center gap-1">
              <Percent className="h-3.5 w-3.5" />
              コミッション率
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formData.commissionRate}
                onChange={(e) => handleChange('commissionRate', parseFloat(e.target.value) || 0)}
                className={`w-24 ${errors.commissionRate ? 'border-destructive' : ''}`}
              />
              <span className="text-muted-foreground">%</span>
            </div>
            {errors.commissionRate && (
              <p className="text-xs text-destructive">{errors.commissionRate}</p>
            )}
            <p className="text-xs text-muted-foreground">
              売上に対して支払うコミッションの割合
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? '更新する' : '登録する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
