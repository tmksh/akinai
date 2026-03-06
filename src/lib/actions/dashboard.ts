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

// パフォーマンスデータを取得
export async function getPerformanceData(organizationId: string, monthOffset: number = 0) {
  const supabase = await createClient();

  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 0, 23, 59, 59, 999);
  const prevMonthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1);
  const prevMonthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 0, 23, 59, 59, 999);

  // 3つのクエリを並列実行（1つのクライアントで）
  const [currentOrdersRes, currentCustomersRes, prevOrdersRes] = await Promise.all([
    supabase
      .from('orders')
      .select('total')
      .eq('organization_id', organizationId)
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
      .gte('created_at', targetMonth.toISOString())
      .lte('created_at', monthEnd.toISOString()),
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', targetMonth.toISOString())
      .lte('created_at', monthEnd.toISOString()),
    supabase
      .from('orders')
      .select('total')
      .eq('organization_id', organizationId)
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
      .gte('created_at', prevMonthStart.toISOString())
      .lte('created_at', prevMonthEnd.toISOString()),
  ]);

  const currentOrders = currentOrdersRes.data;
  const currentCustomers = currentCustomersRes.count;
  const prevOrders = prevOrdersRes.data;

  const currentSales = currentOrders?.reduce((sum, o) => sum + o.total, 0) || 0;
  const currentOrderCount = currentOrders?.length || 0;
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

// ダッシュボード全体のデータを一括取得（1つのSupabaseクライアントで全クエリ実行）
export async function getDashboardData(organizationId: string) {
  const supabase = await createClient();
  const now = new Date();

  // --- 日付範囲の事前計算 ---
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  const chartRangeStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const chartRangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // --- 全クエリを並列実行（期間制限+重複排除済み） ---
  const [
    allOrdersRes,
    ordersCountTotalRes,
    ordersCountMonthRes,
    ordersCountYearRes,
    ordersCountPrevMonthRes,
    ordersCountPrevYearRes,
    customersCountTotalRes,
    customersCountMonthRes,
    customersCountYearRes,
    customersCountPrevMonthRes,
    customersCountPrevYearRes,
    productsCountTotalRes,
    productsCountNewRes,
    recentOrdersRes,
    lowStockRes,
    allOrderItemsRes,
  ] = await Promise.all([
    // 売上集計用: 前年〜今（チャート・パフォーマンス計算に十分）
    supabase
      .from('orders')
      .select('total, created_at')
      .eq('organization_id', organizationId)
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
      .gte('created_at', prevYearStart.toISOString()),
    // 注文COUNT（全ステータス）
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
      .gte('created_at', monthStart.toISOString()).lte('created_at', todayEnd.toISOString()),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
      .gte('created_at', yearStart.toISOString()).lte('created_at', todayEnd.toISOString()),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
      .gte('created_at', prevMonthStart.toISOString()).lte('created_at', prevMonthEnd.toISOString()),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
      .gte('created_at', prevYearStart.toISOString()).lte('created_at', prevYearEnd.toISOString()),
    // 顧客COUNT
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
      .gte('created_at', monthStart.toISOString()).lte('created_at', todayEnd.toISOString()),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
      .gte('created_at', yearStart.toISOString()).lte('created_at', todayEnd.toISOString()),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
      .gte('created_at', prevMonthStart.toISOString()).lte('created_at', prevMonthEnd.toISOString()),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
      .gte('created_at', prevYearStart.toISOString()).lte('created_at', prevYearEnd.toISOString()),
    // 商品COUNT
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
      .gte('created_at', monthStart.toISOString()),
    // 最近の注文
    supabase.from('orders').select('id, order_number, customer_name, total, status, created_at')
      .eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(5),
    // 低在庫
    supabase.from('product_variants').select(`
        id, name, sku, stock, low_stock_threshold,
        product:products!inner ( id, name, organization_id, product_images (url, sort_order) )
      `).eq('product.organization_id', organizationId).order('stock', { ascending: true }).limit(10),
    // 人気商品用
    supabase.from('order_items')
      .select('product_id, product_name, quantity, orders!inner(status, organization_id)')
      .eq('orders.organization_id', organizationId)
      .in('orders.status', ['confirmed', 'processing', 'shipped', 'delivered'])
      .not('product_id', 'is', null),
  ]);

  // --- 売上集計（全期間データからJS側で期間ごとに集計） ---
  const allOrders = allOrdersRes.data || [];

  const revenueMonth = allOrders
    .filter(o => new Date(o.created_at) >= monthStart && new Date(o.created_at) <= todayEnd)
    .reduce((sum, o) => sum + o.total, 0);
  const revenueYear = allOrders
    .filter(o => new Date(o.created_at) >= yearStart && new Date(o.created_at) <= todayEnd)
    .reduce((sum, o) => sum + o.total, 0);
  const revenueTotal = allOrders.reduce((sum, o) => sum + o.total, 0);

  // 前月・前年の売上もJS側で集計（重複クエリ排除）
  const prevMonthRevenue = allOrders
    .filter(o => new Date(o.created_at) >= prevMonthStart && new Date(o.created_at) <= prevMonthEnd)
    .reduce((sum, o) => sum + o.total, 0);
  const prevYearRevenue = allOrders
    .filter(o => new Date(o.created_at) >= prevYearStart && new Date(o.created_at) <= prevYearEnd)
    .reduce((sum, o) => sum + o.total, 0);

  const calcChange = (current: number, prev: number) =>
    prev > 0 ? Math.round(((current - prev) / prev) * 100 * 10) / 10 : 0;

  const calcCountChange = (current: number, prev: number) =>
    prev > 0 ? Math.round(((current - prev) / prev) * 100 * 10) / 10 : 0;

  // --- 注文カウント（SQL COUNTの結果を利用） ---
  const ordersCountMonth = ordersCountMonthRes.count ?? 0;
  const ordersCountYear = ordersCountYearRes.count ?? 0;
  const prevMonthOrdersCount = ordersCountPrevMonthRes.count ?? 0;
  const prevYearOrdersCount = ordersCountPrevYearRes.count ?? 0;

  // --- 顧客カウント（SQL COUNTの結果を利用） ---
  const customersCountMonth = customersCountMonthRes.count ?? 0;
  const customersCountYear = customersCountYearRes.count ?? 0;
  const prevMonthCustomersCount = customersCountPrevMonthRes.count ?? 0;
  const prevYearCustomersCount = customersCountPrevYearRes.count ?? 0;

  // --- 人気商品（Promise.allで取得済みのorder_itemsを利用） ---
  let topProducts: { id: string; name: string; image: string | null; sales: number }[] = [];
  const allOrderItems = allOrderItemsRes.data;

  if (allOrderItems && allOrderItems.length > 0) {
    const salesByProduct: Record<string, { id: string; name: string; sales: number }> = {};
    for (const item of allOrderItems) {
      if (!item.product_id) continue;
      if (!salesByProduct[item.product_id]) {
        salesByProduct[item.product_id] = { id: item.product_id, name: item.product_name, sales: 0 };
      }
      salesByProduct[item.product_id].sales += (item.quantity ?? 1);
    }

    const sortedProducts = Object.values(salesByProduct)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 7);

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

    topProducts = sortedProducts.map(p => ({ ...p, image: imageMap[p.id] || null }));
  } else {
    // 注文がない場合は商品一覧から返す
    const { data: products } = await supabase
      .from('products')
      .select('id, name, product_images (url)')
      .eq('organization_id', organizationId)
      .eq('status', 'published')
      .limit(7);

    topProducts = (products || []).map(p => ({
      id: p.id,
      name: p.name,
      image: p.product_images?.[0]?.url || null,
      sales: 0,
    }));
  }

  // --- 低在庫フィルタ ---
  const lowStockItems = (lowStockRes.data || [])
    .filter(item => item.stock <= item.low_stock_threshold)
    .slice(0, 10)
    .map(item => {
      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      const images = product?.product_images || [];
      const sortedImages = [...images].sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);
      return {
        productId: product?.id,
        variantId: item.id,
        productName: product?.name || '',
        variantName: item.name,
        sku: item.sku,
        stock: item.stock,
        threshold: item.low_stock_threshold,
        image: sortedImages[0]?.url || null,
      };
    });

  // --- チャートデータ集計（allOrdersから直接集計、追加クエリ不要） ---
  const months = 7;
  const buckets: Record<string, { sales: number; orders: number }> = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets[key] = { sales: 0, orders: 0 };
  }
  for (const o of allOrders) {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (buckets[key]) {
      buckets[key].sales += Number(o.total) || 0;
      buckets[key].orders += 1;
    }
  }
  const monthlySales: { name: string; sales: number; orders: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlySales.push({
      name: `${d.getMonth() + 1}月`,
      sales: Math.round(buckets[key].sales / 1000),
      orders: buckets[key].orders,
    });
  }

  // --- パフォーマンスデータ（SQL COUNTの結果を再利用） ---
  const perfCurrentSales = revenueMonth;
  const perfCurrentOrderCount = ordersCountMonth;
  const perfCurrentCustomers = customersCountMonth;
  const perfPrevSales = prevMonthRevenue;
  const perfPrevOrderCount = prevMonthOrdersCount;

  const perfGrowthRate = perfPrevSales > 0
    ? ((perfCurrentSales - perfPrevSales) / perfPrevSales) * 100
    : 0;

  const perfSalesTarget = perfPrevSales > 0 ? Math.round(perfPrevSales * 1.2) : 1000000;
  const perfOrdersTarget = perfPrevOrderCount > 0 ? Math.round(perfPrevOrderCount * 1.2) : 50;
  const perfCustomersTarget = 30;

  const perfSalesAchievement = perfSalesTarget > 0 ? Math.round((perfCurrentSales / perfSalesTarget) * 100) : 0;
  const perfOrdersAchievement = perfOrdersTarget > 0 ? Math.round((perfCurrentOrderCount / perfOrdersTarget) * 100) : 0;
  const perfCustomersAchievement = perfCustomersTarget > 0 ? Math.round((perfCurrentCustomers / perfCustomersTarget) * 100) : 0;
  const perfAvgAchievement = Math.round((perfSalesAchievement + perfOrdersAchievement + perfCustomersAchievement) / 3);

  let perfGrade = 'C';
  if (perfAvgAchievement >= 120) perfGrade = 'S';
  else if (perfAvgAchievement >= 100) perfGrade = 'A+';
  else if (perfAvgAchievement >= 90) perfGrade = 'A';
  else if (perfAvgAchievement >= 80) perfGrade = 'B+';
  else if (perfAvgAchievement >= 70) perfGrade = 'B';
  else if (perfAvgAchievement >= 60) perfGrade = 'C+';
  else if (perfAvgAchievement >= 50) perfGrade = 'C';
  else perfGrade = 'D';

  return {
    revenue: {
      month: { total: revenueMonth, change: calcChange(revenueMonth, prevMonthRevenue) },
      year: { total: revenueYear, change: calcChange(revenueYear, prevYearRevenue) },
      total: { total: revenueTotal, change: 0 },
    },
    orders: {
      month: {
        total: ordersCountMonth,
        change: calcCountChange(ordersCountMonth, prevMonthOrdersCount),
      },
      year: {
        total: ordersCountYear,
        change: calcCountChange(ordersCountYear, prevYearOrdersCount),
      },
      total: { total: ordersCountTotalRes.count || 0, change: 0 },
    },
    customers: {
      month: {
        total: customersCountMonth,
        change: calcCountChange(customersCountMonth, prevMonthCustomersCount),
      },
      year: {
        total: customersCountYear,
        change: calcCountChange(customersCountYear, prevYearCustomersCount),
      },
      total: { total: customersCountTotalRes.count || 0, change: 0 },
    },
    products: {
      total: productsCountTotalRes.count || 0,
      newThisMonth: productsCountNewRes.count || 0,
    },
    recentOrders: recentOrdersRes.data || [],
    topProducts,
    lowStockItems,
    monthlySales,
    performance: {
      salesTarget: perfSalesTarget,
      salesActual: perfCurrentSales,
      salesAchievement: perfSalesAchievement,
      ordersTarget: perfOrdersTarget,
      ordersActual: perfCurrentOrderCount,
      ordersAchievement: perfOrdersAchievement,
      customersTarget: perfCustomersTarget,
      customersActual: perfCurrentCustomers,
      customersAchievement: perfCustomersAchievement,
      growthRate: Math.round(perfGrowthRate * 10) / 10,
      avgAchievement: perfAvgAchievement,
      grade: perfGrade,
    },
  };
}
