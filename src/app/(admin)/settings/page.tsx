'use client';

import { useState } from 'react';
import { Save, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { mockFeatureFlags } from '@/lib/mock-data';
import { PageTabs } from '@/components/layout/page-tabs';

const settingsTabs = [
  { label: '基本設定', href: '/settings', exact: true },
  { label: '組織設定', href: '/settings/organization' },
  { label: 'ユーザー・権限', href: '/settings/users' },
  { label: '決済設定', href: '/settings/payments' },
];

export default function SettingsPage() {
  const [siteName, setSiteName] = useState('商い サンプルショップ');
  const [siteDescription, setSiteDescription] = useState(
    '高品質な商品をお届けするオンラインショップです。'
  );
  const [currency, setCurrency] = useState('JPY');
  const [taxRate, setTaxRate] = useState('10');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('10000');
  const [defaultShippingCost, setDefaultShippingCost] = useState('550');
  const [features, setFeatures] = useState(mockFeatureFlags);

  const toggleFeature = (key: string) => {
    setFeatures(
      features.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
    );
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">設定</h1>
          <p className="text-muted-foreground">
            サイトの基本設定と機能の管理を行います
          </p>
        </div>
        <Button className="btn-premium">
          <Save className="mr-2 h-4 w-4" />
          設定を保存
        </Button>
      </div>

      {/* ページタブナビゲーション */}
      <PageTabs tabs={settingsTabs} />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">サイト基本</TabsTrigger>
          <TabsTrigger value="commerce">EC設定</TabsTrigger>
          <TabsTrigger value="features">機能ON/OFF</TabsTrigger>
        </TabsList>

        {/* 基本設定 */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>サイト情報</CardTitle>
              <CardDescription>
                サイトの基本的な情報を設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">サイト名</Label>
                <Input
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription">サイト説明</Label>
                <Textarea
                  id="siteDescription"
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>ロゴ</Label>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted">
                    <span className="text-xs text-muted-foreground">ロゴ</span>
                  </div>
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    アップロード
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>地域設定</CardTitle>
              <CardDescription>
                通貨を設定します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>通貨</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JPY">日本円 (JPY)</SelectItem>
                    <SelectItem value="USD">米ドル (USD)</SelectItem>
                    <SelectItem value="EUR">ユーロ (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EC設定 */}
        <TabsContent value="commerce" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>税金設定</CardTitle>
              <CardDescription>消費税の設定を行います</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">消費税率 (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>税金表示</Label>
                  <Select defaultValue="included">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="included">税込表示</SelectItem>
                      <SelectItem value="excluded">税抜表示</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>配送設定</CardTitle>
              <CardDescription>
                デフォルトの配送料金を設定します。商品ごとの送料は商品登録時に個別設定できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="defaultShipping">デフォルト送料 (円)</Label>
                  <Input
                    id="defaultShipping"
                    type="number"
                    value={defaultShippingCost}
                    onChange={(e) => setDefaultShippingCost(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    商品に個別送料が設定されていない場合に適用
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freeShipping">送料無料しきい値 (円)</Label>
                  <Input
                    id="freeShipping"
                    type="number"
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(e.target.value)}
                    placeholder="設定しない場合は空欄"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>キャンセル・返金設定</CardTitle>
              <CardDescription>キャンセル料金と返金ポリシーを設定します</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cancelFee">キャンセル料 (%)</Label>
                  <Input
                    id="cancelFee"
                    type="number"
                    defaultValue="0"
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    発送前キャンセルに適用される料金
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>返品期限</Label>
                  <Select defaultValue="7">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">商品到着後7日以内</SelectItem>
                      <SelectItem value="14">商品到着後14日以内</SelectItem>
                      <SelectItem value="30">商品到着後30日以内</SelectItem>
                      <SelectItem value="none">返品不可</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>決済設定</CardTitle>
              <CardDescription>利用可能な決済方法を設定します</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'クレジットカード', enabled: true },
                  { name: 'コンビニ払い', enabled: true },
                  { name: '銀行振込', enabled: true },
                  { name: '請求書払い（法人）', enabled: false },
                ].map((payment) => (
                  <div
                    key={payment.name}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{payment.name}</p>
                    </div>
                    <Switch defaultChecked={payment.enabled} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 機能設定 */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>機能フラグ</CardTitle>
              <CardDescription>
                各機能の有効/無効を切り替えます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {features.map((feature) => (
                  <div
                    key={feature.key}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{feature.name}</p>
                        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {feature.module}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                    <Switch
                      checked={feature.enabled}
                      onCheckedChange={() => toggleFeature(feature.key)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API設定</CardTitle>
              <CardDescription>
                外部連携用のAPI設定を行います
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>APIキー</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value="akinai_api_key_placeholder_12345678"
                    readOnly
                    className="font-mono"
                  />
                  <Button variant="outline">再生成</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  APIキーは安全に保管してください。漏洩した場合は再生成してください。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

