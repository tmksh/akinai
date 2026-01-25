'use client';

import { useState, useEffect, useTransition } from 'react';
import { ArrowLeft, Users, UserPlus, Mail, Trash2, Loader2, Crown, Shield, Edit3, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrganization } from '@/components/providers/organization-provider';
import { 
  getOrganizationMembers, 
  updateMemberRole, 
  removeMember,
  createInvitation,
  getInvitations,
  deleteInvitation 
} from '@/lib/actions/settings';
import { toast } from 'sonner';

const roleLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  owner: { label: 'オーナー', icon: <Crown className="h-3 w-3" />, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  admin: { label: '管理者', icon: <Shield className="h-3 w-3" />, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  manager: { label: 'マネージャー', icon: <Users className="h-3 w-3" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  editor: { label: '編集者', icon: <Edit3 className="h-3 w-3" />, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  viewer: { label: '閲覧者', icon: <Eye className="h-3 w-3" />, color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
};

interface Member {
  id: string;
  role: string;
  joined_at: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

export default function MembersSettingsPage() {
  const { organization } = useOrganization();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'editor' | 'viewer'>('viewer');

  // データを取得
  useEffect(() => {
    async function loadData() {
      if (!organization?.id) return;
      
      const [membersResult, invitationsResult] = await Promise.all([
        getOrganizationMembers(organization.id),
        getInvitations(organization.id),
      ]);
      
      setMembers(membersResult.data as Member[]);
      setInvitations(invitationsResult.data as Invitation[]);
      setIsLoading(false);
    }
    
    loadData();
  }, [organization?.id]);

  // 招待を送信
  const handleInvite = async () => {
    if (!organization?.id || !inviteEmail) return;
    
    startTransition(async () => {
      const { data, error } = await createInvitation(
        organization.id,
        inviteEmail,
        inviteRole,
        '' // TODO: 現在のユーザーIDを取得
      );
      
      if (data) {
        setInvitations(prev => [data as Invitation, ...prev]);
        setShowInviteDialog(false);
        setInviteEmail('');
        setInviteRole('viewer');
        toast.success(`${inviteEmail}に招待を送信しました`);
      } else {
        toast.error(error || '招待の送信に失敗しました');
      }
    });
  };

  // 権限を変更
  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!organization?.id) return;
    
    startTransition(async () => {
      const { success, error } = await updateMemberRole(
        memberId,
        organization.id,
        newRole as 'owner' | 'admin' | 'manager' | 'editor' | 'viewer'
      );
      
      if (success) {
        setMembers(prev => 
          prev.map(m => m.id === memberId ? { ...m, role: newRole } : m)
        );
        toast.success('権限を更新しました');
      } else {
        toast.error(error || '権限の更新に失敗しました');
      }
    });
  };

  // メンバーを削除
  const handleRemoveMember = async (memberId: string) => {
    if (!organization?.id) return;
    
    if (!confirm('このメンバーを削除しますか？')) return;
    
    startTransition(async () => {
      const { success, error } = await removeMember(memberId, organization.id);
      
      if (success) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
        toast.success('メンバーを削除しました');
      } else {
        toast.error(error || 'メンバーの削除に失敗しました');
      }
    });
  };

  // 招待を削除
  const handleDeleteInvitation = async (invitationId: string) => {
    if (!organization?.id) return;
    
    startTransition(async () => {
      const { success, error } = await deleteInvitation(invitationId, organization.id);
      
      if (success) {
        setInvitations(prev => prev.filter(i => i.id !== invitationId));
        toast.success('招待を削除しました');
      } else {
        toast.error(error || '招待の削除に失敗しました');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">メンバー管理</h1>
            <p className="text-muted-foreground">チームメンバーの招待・権限管理</p>
          </div>
        </div>
        <Button className="btn-premium" onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          メンバーを招待
        </Button>
      </div>

      {/* メンバー一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>メンバー一覧</CardTitle>
          </div>
          <CardDescription>
            {members.length}人のメンバーが参加しています
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>メンバー</TableHead>
                <TableHead>権限</TableHead>
                <TableHead>参加日</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user.avatar_url} />
                        <AvatarFallback>
                          {member.user.name?.charAt(0) || member.user.email?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.user.name || '名前未設定'}</p>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.role === 'owner' ? (
                      <Badge className={roleLabels[member.role].color}>
                        {roleLabels[member.role].icon}
                        <span className="ml-1">{roleLabels[member.role].label}</span>
                      </Badge>
                    ) : (
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member.id, value)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">管理者</SelectItem>
                          <SelectItem value="manager">マネージャー</SelectItem>
                          <SelectItem value="editor">編集者</SelectItem>
                          <SelectItem value="viewer">閲覧者</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(member.joined_at).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell>
                    {member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 招待一覧 */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>招待中</CardTitle>
            </div>
            <CardDescription>
              承認待ちの招待
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>権限</TableHead>
                  <TableHead>有効期限</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <Badge className={roleLabels[invitation.role]?.color || ''}>
                        {roleLabels[invitation.role]?.label || invitation.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invitation.expires_at).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteInvitation(invitation.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 権限の説明 */}
      <Card>
        <CardHeader>
          <CardTitle>権限について</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(roleLabels).map(([role, { label, icon, color }]) => (
              <div key={role} className="flex items-start gap-3">
                <Badge className={color}>
                  {icon}
                  <span className="ml-1">{label}</span>
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {role === 'owner' && 'すべての機能にアクセス可能。組織の削除、プラン変更が可能'}
                  {role === 'admin' && 'すべての機能にアクセス可能。メンバーの管理が可能'}
                  {role === 'manager' && '商品・注文・顧客・見積の管理が可能'}
                  {role === 'editor' && '商品・コンテンツの編集が可能'}
                  {role === 'viewer' && 'データの閲覧のみ可能'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 招待ダイアログ */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メンバーを招待</DialogTitle>
            <DialogDescription>
              招待メールが送信されます。招待リンクは7日間有効です。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">権限</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理者</SelectItem>
                  <SelectItem value="manager">マネージャー</SelectItem>
                  <SelectItem value="editor">編集者</SelectItem>
                  <SelectItem value="viewer">閲覧者</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleInvite} disabled={isPending || !inviteEmail}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              招待を送信
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

