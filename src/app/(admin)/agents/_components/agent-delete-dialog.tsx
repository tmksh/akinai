'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type Agent } from '@/lib/mock-data';
import { toast } from 'sonner';

interface AgentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
  onConfirm: (agent: Agent) => Promise<void>;
}

export function AgentDeleteDialog({
  open,
  onOpenChange,
  agent,
  onConfirm,
}: AgentDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!agent) return;

    setIsDeleting(true);
    try {
      await onConfirm(agent);
      toast.success('代理店を削除しました');
      onOpenChange(false);
    } catch (error) {
      toast.error('削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>代理店を削除</DialogTitle>
              <DialogDescription className="mt-1">
                この操作は取り消せません
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium">{agent.company}</p>
            <p className="text-sm text-muted-foreground">{agent.code} / {agent.name}</p>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            この代理店を削除すると、関連するすべてのデータ（売上履歴、コミッション記録など）も削除されます。
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            削除する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
