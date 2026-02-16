'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  DollarSign,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOrganization } from '@/components/providers/organization-provider';
import { getCustomers, type CustomerWithAddresses } from '@/lib/actions/customers';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

// 顧客行をメモ化
const CustomerRow = memo(function CustomerRow({
  customer,
  onClick,
}: {
  customer: CustomerWithAddresses;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 sm:p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-orange-100 text-orange-600 text-sm">
            {customer.name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium text-sm">{customer.name}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            {customer.email}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="text-right hidden sm:block">
          <div className="text-xs text-muted-foreground">ご注文</div>
          <div className="font-medium text-sm">{customer.total_orders}回</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">ご購入合計</div>
          <div className="font-medium text-sm">{formatCurrency(customer.total_spent)}</div>
        </div>
        <Badge
          variant="outline"
          className={
            customer.total_orders >= 5
              ? 'bg-orange-50 text-orange-600 border-orange-200'
              : 'bg-muted text-muted-foreground'
          }
        >
          {customer.total_orders >= 5 ? '常連' : '一般'}
        </Badge>
      </div>
    </div>
  );
});

// 顧客詳細ダイアログをメモ化
const CustomerDialog = memo(function CustomerDialog({
  customer,
  open,
  onClose,
}: {
  customer: CustomerWithAddresses | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-orange-100 text-orange-600 text-lg">
                {customer.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-lg font-bold">{customer.name}</div>
              <Badge
                variant="outline"
                className={
                  customer.total_orders >= 5
                    ? 'bg-orange-50 text-orange-600 border-orange-200'
                    : 'bg-muted text-muted-foreground'
                }
              >
                {customer.total_orders >= 5 ? '常連のお客様' : '一般のお客様'}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 連絡先 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">連絡先</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.addresses?.[0] && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>
                    〒{customer.addresses[0].postal_code}
                    <br />
                    {customer.addresses[0].prefecture}
                    {customer.addresses[0].city}
                    {customer.addresses[0].line1}
                    {customer.addresses[0].line2 && ` ${customer.addresses[0].line2}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ご利用状況 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-center">
              <ShoppingBag className="h-5 w-5 text-orange-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                {customer.total_orders}
              </div>
              <div className="text-xs text-orange-600">ご注文回数</div>
            </div>
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-center">
              <DollarSign className="h-5 w-5 text-orange-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                {formatCurrency(customer.total_spent)}
              </div>
              <div className="text-xs text-orange-600">ご購入合計</div>
            </div>
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-center">
              <Calendar className="h-5 w-5 text-orange-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                {new Date(customer.created_at).toLocaleDateString('ja-JP', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="text-xs text-orange-600">ご登録日</div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2">
            <Button asChild className="flex-1 btn-premium">
              <Link href={`/customers/${customer.id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                詳しく見る
              </Link>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <a href={`mailto:${customer.email}`}>
                <Mail className="mr-2 h-4 w-4" />
                メールする
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export function CustomersTab() {
  const { organization } = useOrganization();
  const [customers, setCustomers] = useState<CustomerWithAddresses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithAddresses | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let mounted = true;

    async function fetchCustomers() {
      if (!organization) return;

      setIsLoading(true);
      const { data, error } = await getCustomers(organization.id);
      if (mounted) {
        if (error) {
          console.error('Failed to fetch customers:', error);
        } else {
          setCustomers(data || []);
        }
        setIsLoading(false);
      }
    }

    fetchCustomers();
    return () => {
      mounted = false;
    };
  }, [organization?.id]);

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        (customer.company?.toLowerCase() || '').includes(query)
    );
  }, [customers, searchQuery]);

  const handleCustomerClick = useCallback((customer: CustomerWithAddresses) => {
    setSelectedCustomer(customer);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setSelectedCustomer(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="お客様名やメールで探す..."
            className="pl-10 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="sm:w-auto">
          <Filter className="mr-2 h-4 w-4" />
          絞り込む
        </Button>
        <Button className="btn-premium" size="sm" asChild>
          <Link href="/customers/new">
            <Plus className="mr-2 h-4 w-4" />
            新しいお客様
          </Link>
        </Button>
      </div>

      {/* 顧客一覧 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? '条件に合うお客様が見つかりませんでした' : 'まだお客様が登録されていません'}
          </p>
          {!searchQuery && (
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/customers/new">
                <Plus className="mr-2 h-4 w-4" />
                お客様を登録する
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCustomers.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              onClick={() => handleCustomerClick(customer)}
            />
          ))}
        </div>
      )}

      {/* 顧客詳細ダイアログ */}
      <CustomerDialog
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
