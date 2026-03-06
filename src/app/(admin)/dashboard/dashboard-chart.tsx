'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';

export function DashboardChart({ data }: { data: { name: string; sales: number; orders: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Area type="monotone" dataKey="orders" stroke="#fbbf24" strokeWidth={2} fill="url(#fillOrders)" />
        <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={2.5} fill="url(#fillSales)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
