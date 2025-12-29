'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Building2,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Percent,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockAgents, type Agent } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const statusConfig = {
  active: { label: 'アクティブ', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: CheckCircle },
  inactive: { label: '非アクティブ', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: XCircle },
  pending: { label: '審査中', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Clock },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });

export default function AgentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewAgentDialog, setShowNewAgentDialog] = useState(false);

  // フィルタリング
  const filteredAgents = mockAgents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 統計
  const stats = {
    total: mockAgents.length,
    active: mockAgents.filter((a) => a.status === 'active').length,
    totalSales: mockAgents.reduce((sum, a) => sum + a.totalSales, 0),
    totalCommission: mockAgents.reduce((sum, a) => sum + a.totalCommission, 0),
  };

  // ランキング（売上順）
  const topAgents = [...mockAgents]
    .filter((a) => a.status === 'active')
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 3);

  const maxSales = topAgents[0]?.totalSales || 1;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">代理店管理</h1>
          <p className="text-muted-foreground">
            代理店の登録・売上管理を行います
          </p>
        </div>
        <Dialog open={showNewAgentDialog} onOpenChange={setShowNewAgentDialog}>
          <DialogTrigger asChild>
            <Button className="gradient-brand text-white">
              <Plus className="mr-2 h-4 w-4" />
              代理店を登録
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>新規代理店登録</DialogTitle>
              <DialogDescription>
                新しい代理店パートナーを登録します
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>代理店コード</Label>
                  <Input placeholder="AG-006" />
                </div>
                <div className="space-y-2">
                  <Label>担当者名 *</Label>
                  <Input placeholder="山田 太郎" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>会社名 *</Label>
                <Input placeholder="株式会社サンプル" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>メールアドレス *</Label>
                  <Input type="email" placeholder="contact@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>電話番号</Label>
                  <Input placeholder="03-1234-5678" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>住所</Label>
                <Input placeholder="東京都千代田区..." />
              </div>
              <div className="space-y-2">
                <Label>コミッション率 (%)</Label>
                <Input type="number" min="0" max="100" placeholder="10" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewAgentDialog(false)}>
                キャンセル
              </Button>
              <Button onClick={() => setShowNewAgentDialog(false)}>
                登録
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-500 p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <Users className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-xs font-medium">総代理店数</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <p className="text-white/70 text-xs">社</p>
            </div>
          </div>
        </div>

        <div className="h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-500 p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <CheckCircle className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-xs font-medium">アクティブ</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.active}</div>
              <p className="text-white/70 text-xs">社</p>
            </div>
          </div>
        </div>

        <div className="h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-violet-500 via-purple-500 to-purple-600 p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <TrendingUp className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-xs font-medium">代理店経由売上</p>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{formatCurrency(stats.totalSales)}</div>
              <p className="text-white/70 text-xs">累計</p>
            </div>
          </div>
        </div>

        <div className="h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <DollarSign className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-xs font-medium">支払コミッション</p>
            </div>
            <div>
              <div className="text-xl font-bold text-white">{formatCurrency(stats.totalCommission)}</div>
              <p className="text-white/70 text-xs">累計</p>
            </div>
          </div>
        </div>
      </div>

      {/* トップ代理店 */}
      <Card className="bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            トップ代理店
          </CardTitle>
          <CardDescription>売上上位の代理店パートナー</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {topAgents.map((agent, index) => (
              <div
                key={agent.id}
                className={cn(
                  "p-4 rounded-lg border relative overflow-hidden",
                  index === 0 && "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/20 dark:to-slate-800 border-amber-200",
                  index === 1 && "bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/50 dark:to-slate-900 border-slate-200",
                  index === 2 && "bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-slate-900 border-orange-200"
                )}
              >
                <div className="absolute top-2 right-2">
                  <Badge variant={index === 0 ? "default" : "secondary"} className={cn(
                    index === 0 && "bg-amber-500",
                    index === 1 && "bg-slate-400",
                    index === 2 && "bg-orange-400"
                  )}>
                    {index + 1}位
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={cn(
                      "font-bold",
                      index === 0 && "bg-amber-200 text-amber-700",
                      index === 1 && "bg-slate-200 text-slate-700",
                      index === 2 && "bg-orange-200 text-orange-700"
                    )}>
                      {agent.company.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{agent.company}</p>
                    <p className="text-xs text-muted-foreground">{agent.name}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">売上</span>
                    <span className="font-bold">{formatCurrency(agent.totalSales)}</span>
                  </div>
                  <Progress value={(agent.totalSales / maxSales) * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{agent.ordersCount} 件の注文</span>
                    <span>コミッション {agent.commissionRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 代理店一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>代理店一覧</CardTitle>
          <CardDescription>登録されている代理店パートナーを管理します</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 検索・フィルター */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="代理店名・コード・担当者名で検索..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="active">アクティブ</SelectItem>
                <SelectItem value="inactive">非アクティブ</SelectItem>
                <SelectItem value="pending">審査中</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* テーブル */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>代理店</TableHead>
                  <TableHead>連絡先</TableHead>
                  <TableHead className="text-right">売上</TableHead>
                  <TableHead className="text-right">コミッション</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>最終注文</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-muted-foreground">該当する代理店がありません</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAgents.map((agent) => {
                    const config = statusConfig[agent.status];
                    const StatusIcon = config.icon;

                    return (
                      <TableRow key={agent.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold">
                                {agent.company.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{agent.company}</p>
                                <Badge variant="outline" className="text-xs">{agent.code}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{agent.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {agent.email}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {agent.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-semibold">{formatCurrency(agent.totalSales)}</p>
                          <p className="text-xs text-muted-foreground">{agent.ordersCount} 件</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Badge variant="secondary" className="text-xs">
                              <Percent className="h-3 w-3 mr-1" />
                              {agent.commissionRate}%
                            </Badge>
                          </div>
                          <p className="text-sm font-medium mt-1">{formatCurrency(agent.totalCommission)}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1", config.bgColor, config.color, "border-0")}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {agent.lastOrderAt ? formatDate(agent.lastOrderAt) : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                詳細を見る
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <BarChart3 className="mr-2 h-4 w-4" />
                                売上レポート
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                編集
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {agent.status === 'active' ? (
                                <DropdownMenuItem className="text-amber-600">
                                  <XCircle className="mr-2 h-4 w-4" />
                                  非アクティブにする
                                </DropdownMenuItem>
                              ) : agent.status === 'inactive' ? (
                                <DropdownMenuItem className="text-emerald-600">
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  アクティブにする
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                削除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

