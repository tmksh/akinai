'use client';

import { Sparkles, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { mockSettings } from '@/lib/mock-data';

export default function FeaturesSettingsPage() {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">機能設定</h1>
          <p className="text-muted-foreground">
            システム機能のオン/オフを管理します
          </p>
        </div>
        <Button className="gradient-brand text-white">
          <Save className="mr-2 h-4 w-4" />
          設定を保存
        </Button>
      </div>

      {/* 機能トグル */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>EC機能</CardTitle>
            <CardDescription>Eコマース関連の機能を設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>ゲストチェックアウト</Label>
                <p className="text-sm text-muted-foreground">
                  会員登録なしで購入を許可する
                </p>
              </div>
              <Switch defaultChecked={mockSettings.enableGuestCheckout} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>見積機能</Label>
                <p className="text-sm text-muted-foreground">
                  見積書の作成・管理機能を有効にする
                </p>
              </div>
              <Switch defaultChecked={mockSettings.enableEstimates} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>高度な在庫管理</Label>
                <p className="text-sm text-muted-foreground">
                  複数倉庫・ロット管理などの高度な在庫機能
                </p>
              </div>
              <Switch defaultChecked={mockSettings.enableAdvancedInventory} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle>営業機能</CardTitle>
            <CardDescription>営業・代理店関連の機能を設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>代理店管理</Label>
                <p className="text-sm text-muted-foreground">
                  代理店・営業担当者の管理機能
                </p>
              </div>
              <Switch defaultChecked={mockSettings.enableAgentManagement} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>コミッション計算</Label>
                <p className="text-sm text-muted-foreground">
                  販売手数料の自動計算機能
                </p>
              </div>
              <Switch defaultChecked={false} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>テリトリー管理</Label>
                <p className="text-sm text-muted-foreground">
                  営業エリアの区分管理機能
                </p>
              </div>
              <Switch defaultChecked={false} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle>コンテンツ機能</CardTitle>
            <CardDescription>コンテンツ管理関連の機能を設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>ブログ機能</Label>
                <p className="text-sm text-muted-foreground">
                  記事の作成・公開機能
                </p>
              </div>
              <Switch defaultChecked={true} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>ニュース機能</Label>
                <p className="text-sm text-muted-foreground">
                  お知らせ・ニュースの配信機能
                </p>
              </div>
              <Switch defaultChecked={true} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>商品連携</Label>
                <p className="text-sm text-muted-foreground">
                  コンテンツと商品の関連付け機能
                </p>
              </div>
              <Switch defaultChecked={true} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle>分析機能</CardTitle>
            <CardDescription>レポート・分析関連の機能を設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>売上レポート</Label>
                <p className="text-sm text-muted-foreground">
                  売上データの集計・可視化
                </p>
              </div>
              <Switch defaultChecked={true} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>顧客分析</Label>
                <p className="text-sm text-muted-foreground">
                  顧客行動の分析レポート
                </p>
              </div>
              <Switch defaultChecked={true} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>在庫予測</Label>
                <p className="text-sm text-muted-foreground">
                  AIによる在庫需要予測（β版）
                </p>
              </div>
              <Switch defaultChecked={false} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



