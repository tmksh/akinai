'use server';

import { createClient } from '@/lib/supabase/server';

// 期間タイプ
type PeriodType = 'month' | 'year' | 'total';

// 日付範囲を取得
function getDateRange(period: PeriodType): { start: Date; end: Date } | null {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  switch (period) {
    case 'month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end,
      };
    case 'year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end,
      };
    case 'total':
      return null; // 全期間
  }
}

// 前期間の日付範囲を取得
function getPreviousDateRange(period: PeriodType): { start: Date; end: Date } | null {
  const now = new Date();
  
  switch (period) {
    case 'month': {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        start: prevMonth,
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    }
    case 'year': {
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
      };
    }
    case 'total':
      return null;
  }
}

// 売上統計を取得
export async function getRevenueStats(organizationId: string, period: PeriodType) {
  const supabase = await createClient();
  
  const dateRange = getDateRange(period);
  const prevDateRange = getPreviousDateRange(period);
  
  // 現在期間の売上
  let query = supabase
    .from('orders')
    .select('total')
    .eq('organization_id', organizationId)
    .in('status', ['confirmed', 'processing', 'shipped', 'delivered']);
  
  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
  }
  
  const { data: currentData } = await query;
  const currentRevenue = currentData?.reduce((sum, order) => sum + order.total, 0) || 0;
  
  // 前期間の売上（変化率計算用）
  let changePercent = 0;
  if (prevDateRange) {
    const { data: prevData } = await supabase
      .from('orders')
      .select('total')
      .eq('organization_id', organizationId)
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
      .gte('created_at', prevDateRange.start.toISOString())
      .lte('created_at', prevDateRange.end.toISOString());
    
    const prevRevenue = prevData?.reduce((sum, order) => sum + order.total, 0) || 0;
    if (prevRevenue > 0) {
      changePercent = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
    }
  }
  
  return {
    total: currentRevenue,
    change: Math.round(changePercent * 10) / 10,
  };
}

// 注文統計を取得
export async function getOrdersStats(organizationId: string, period: PeriodType) {
  const supabase = await createClient();
  
  const dateRange = getDateRange(period);
  const prevDateRange = getPreviousDateRange(period);
  
  // 現在期間の注文数
  let query = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  
  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
  }
  
  const { count: currentCount } = await query;
  
  // 前期間の注文数
  let changePercent = 0;
  if (prevDateRange) {
    const { count: prevCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', prevDateRange.start.toISOString())
      .lte('created_at', prevDateRange.end.toISOString());
    
    if (prevCount && prevCount > 0) {
      changePercent = (((currentCount || 0) - prevCount) / prevCount) * 100;
    }
  }
  
  return {
    total: currentCount || 0,
    change: Math.round(changePercent * 10) / 10,
  };
}

// 顧客統計を取得
export async function getCustomersStats(organizationId: string, period: PeriodType) {
  const supabase = await createClient();
  
  const dateRange = getDateRange(period);
  const prevDateRange = getPreviousDateRange(period);
  
  // 現在期間の顧客数
  let query = supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  
  if (dateRange) {
    query = query
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
  }
  
  const { count: currentCount } = await query;
  
  // 前期間の顧客数
  let changePercent = 0;
  if (prevDateRange) {
    const { count: prevCount } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', prevDateRange.start.toISOString())
      .lte('created_at', prevDateRange.end.toISOString());
    
    if (prevCount && prevCount > 0) {
      changePercent = (((currentCount || 0) - prevCount) / prevCount) * 100;
    }
  }
  
  return {
    total: currentCount || 0,
    change: Math.round(changePercent * 10) / 10,
  };
}

// 商品統計を取得
export async function getProductsStats(organizationId: string) {
  const supabase = await createClient();
  
  // 総商品数
  const { count: totalCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  
  // 今月追加された商品数
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const { count: newCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', monthStart.toISOString());
  
  return {
    total: totalCount || 0,
    newThisMonth: newCount || 0,
  };
}

// 最近の注文を取得
export async function getRecentOrders(organizationId: string, limit: number = 5) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, total, status, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching recent orders:', error);
    return [];
  }
  
  return data || [];
}

// 人気商品を取得（注文数ベース）
export async function getTopProducts(organizationId: string, limit: number = 5) {
  const supabase = await createClient();
  
  // 今月の注文アイテムを集計
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // まず今月の注文IDを取得
  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('organization_id', organizationId)
    .gte('created_at', monthStart.toISOString())
    .in('status', ['confirmed', 'processing', 'shipped', 'delivered']);
  
  if (!orders || orders.length === 0) {
    // 注文がない場合は商品一覧から返す
    const { data: products } = await supabase
      .from('products')
      .select(`
        id,
        name,
        product_images (url)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'published')
      .limit(limit);
    
    return (products || []).map(p => ({
      id: p.id,
      name: p.name,
      image: p.product_images?.[0]?.url || null,
      sales: 0,
    }));
  }
  
  const orderIds = orders.map(o => o.id);
  
  // 注文アイテムを取得して集計
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, product_name, quantity')
    .in('order_id', orderIds)
    .not('product_id', 'is', null);
  
  if (!orderItems || orderItems.length === 0) {
    return [];
  }
  
  // 商品ごとに集計
  const salesByProduct: Record<string, { id: string; name: string; sales: number }> = {};
  
  for (const item of orderItems) {
    if (!item.product_id) continue;
    
    if (!salesByProduct[item.product_id]) {
      salesByProduct[item.product_id] = {
        id: item.product_id,
        name: item.product_name,
        sales: 0,
      };
    }
    salesByProduct[item.product_id].sales += item.quantity;
  }
  
  // 売上順にソート
  const sortedProducts = Object.values(salesByProduct)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
  
  // 画像を取得
  const productIds = sortedProducts.map(p => p.id);
  const { data: images } = await supabase
    .from('product_images')
    .select('product_id, url')
    .in('product_id', productIds)
    .order('sort_order', { ascending: true });
  
  const imageMap: Record<string, string> = {};
  for (const img of images || []) {
    if (!imageMap[img.product_id]) {
      imageMap[img.product_id] = img.url;
    }
  }
  
  return sortedProducts.map(p => ({
    ...p,
    image: imageMap[p.id] || null,
  }));
}

// 在庫アラート（低在庫商品）を取得
export async function getLowStockItems(organizationId: string, limit: number = 5) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('product_variants')
    .select(`
      id,
      name,
      sku,
      stock,
      low_stock_threshold,
      product:products!inner (
        id,
        name,
        organization_id
      )
    `)
    .eq('product.organization_id', organizationId)
    .order('stock', { ascending: true })
    .limit(limit * 2); // 閾値以下のものだけフィルタするので多めに取得
  
  if (error) {
    console.error('Error fetching low stock items:', error);
    return [];
  }
  
  // 閾値以下のものだけフィルタ
  const lowStockItems = (data || [])
    .filter(item => item.stock <= item.low_stock_threshold)
    .slice(0, limit)
    .map(item => {
      // Supabaseのjoinは配列として返される場合がある
      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      return {
        productId: product?.id,
        variantId: item.id,
        productName: product?.name || '',
        variantName: item.name,
        sku: item.sku,
        stock: item.stock,
        threshold: item.low_stock_threshold,
      };
    });
  
  return lowStockItems;
}

// 月別売上データを取得（チャート用）― 1 クエリで全期間を取得して JS 側で月ごとに集計
export async function getMonthlySalesData(organizationId: string, months: number = 7) {
  const supabase = await createClient();

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const { data: orders } = await supabase
    .from('orders')
    .select('total, created_at')
    .eq('organization_id', organizationId)
    .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
    .gte('created_at', rangeStart.toISOString())
    .lte('created_at', rangeEnd.toISOString());

  // 月キー → 集計値のマップを作る
  const buckets: Record<string, { sales: number; orders: number }> = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets[key] = { sales: 0, orders: 0 };
  }

  for (const o of orders ?? []) {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (buckets[key]) {
      buckets[key].sales += Number(o.total) || 0;
      buckets[key].orders += 1;
    }
  }

  // 結果を古い月から順に返す
  const result: { name: string; sales: number; orders: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    result.push({
      name: `${d.getMonth() + 1}月`,
      sales: Math.round(buckets[key].sales / 1000),
      orders: buckets[key].orders,
    });
  }

  return result;
}

// パフォーマンスデータを取得
export async function getPerformanceData(organizationId: string, monthOffset: number = 0) {
  const supabase = await createClient();
  
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 0, 23, 59, 59, 999);
  const prevMonthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1);
  const prevMonthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 0, 23, 59, 59, 999);
  
  // 今月の売上
  const { data: currentOrders } = await supabase
    .from('orders')
    .select('total')
    .eq('organization_id', organizationId)
    .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
    .gte('created_at', targetMonth.toISOString())
    .lte('created_at', monthEnd.toISOString());
  
  const currentSales = currentOrders?.reduce((sum, o) => sum + o.total, 0) || 0;
  const currentOrderCount = currentOrders?.length || 0;
  
  // 今月の新規顧客
  const { count: currentCustomers } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', targetMonth.toISOString())
    .lte('created_at', monthEnd.toISOString());
  
  // 前月の売上（成長率計算用）
  const { data: prevOrders } = await supabase
    .from('orders')
    .select('total')
    .eq('organization_id', organizationId)
    .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
    .gte('created_at', prevMonthStart.toISOString())
    .lte('created_at', prevMonthEnd.toISOString());
  
  const prevSales = prevOrders?.reduce((sum, o) => sum + o.total, 0) || 0;
  
  // 成長率
  const growthRate = prevSales > 0 
    ? ((currentSales - prevSales) / prevSales) * 100 
    : 0;
  
  // 目標値（仮：前月の120%）
  const salesTarget = prevSales > 0 ? Math.round(prevSales * 1.2) : 1000000;
  const ordersTarget = (prevOrders?.length || 0) > 0 ? Math.round((prevOrders?.length || 0) * 1.2) : 50;
  const customersTarget = 30; // 固定目標
  
  // 達成率
  const salesAchievement = salesTarget > 0 ? Math.round((currentSales / salesTarget) * 100) : 0;
  const ordersAchievement = ordersTarget > 0 ? Math.round((currentOrderCount / ordersTarget) * 100) : 0;
  const customersAchievement = customersTarget > 0 ? Math.round(((currentCustomers || 0) / customersTarget) * 100) : 0;
  
  // 平均達成率
  const avgAchievement = Math.round((salesAchievement + ordersAchievement + customersAchievement) / 3);
  
  // 評価
  let grade = 'C';
  if (avgAchievement >= 120) grade = 'S';
  else if (avgAchievement >= 100) grade = 'A+';
  else if (avgAchievement >= 90) grade = 'A';
  else if (avgAchievement >= 80) grade = 'B+';
  else if (avgAchievement >= 70) grade = 'B';
  else if (avgAchievement >= 60) grade = 'C+';
  else if (avgAchievement >= 50) grade = 'C';
  else grade = 'D';
  
  return {
    salesTarget,
    salesActual: currentSales,
    salesAchievement,
    ordersTarget,
    ordersActual: currentOrderCount,
    ordersAchievement,
    customersTarget,
    customersActual: currentCustomers || 0,
    customersAchievement,
    growthRate: Math.round(growthRate * 10) / 10,
    avgAchievement,
    grade,
  };
}

// ダッシュボード全体のデータを一括取得
export async function getDashboardData(organizationId: string) {
  const [
    revenueMonth,
    revenueYear,
    revenueTotal,
    ordersMonth,
    ordersYear,
    ordersTotal,
    customersMonth,
    customersYear,
    customersTotal,
    productsStats,
    recentOrders,
    topProducts,
    lowStockItems,
    monthlySales,
    performance,
  ] = await Promise.all([
    getRevenueStats(organizationId, 'month'),
    getRevenueStats(organizationId, 'year'),
    getRevenueStats(organizationId, 'total'),
    getOrdersStats(organizationId, 'month'),
    getOrdersStats(organizationId, 'year'),
    getOrdersStats(organizationId, 'total'),
    getCustomersStats(organizationId, 'month'),
    getCustomersStats(organizationId, 'year'),
    getCustomersStats(organizationId, 'total'),
    getProductsStats(organizationId),
    getRecentOrders(organizationId, 5),
    getTopProducts(organizationId, 5),
    getLowStockItems(organizationId, 5),
    getMonthlySalesData(organizationId, 7),
    getPerformanceData(organizationId, 0),
  ]);
  
  return {
    revenue: {
      month: revenueMonth,
      year: revenueYear,
      total: revenueTotal,
    },
    orders: {
      month: ordersMonth,
      year: ordersYear,
      total: ordersTotal,
    },
    customers: {
      month: customersMonth,
      year: customersYear,
      total: customersTotal,
    },
    products: productsStats,
    recentOrders,
    topProducts,
    lowStockItems,
    monthlySales,
    performance,
  };
}

