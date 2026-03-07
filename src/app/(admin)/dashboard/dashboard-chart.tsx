'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const sales = payload.find(p => p.dataKey === 'sales');
  const orders = payload.find(p => p.dataKey === 'orders');
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.8)',
        boxShadow: '0 4px_16px rgba(100,120,160,0.12)',
      }}
    >
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {sales && (
        <p className="text-sky-500">¥{(sales.value * 1000).toLocaleString()}</p>
      )}
      {orders && (
        <p className="text-sky-500">{orders.value}件</p>
      )}
    </div>
  );
}

export function DashboardChart({ data }: { data: { name: string; sales: number; orders: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="0"
          stroke="rgba(0,0,0,0.04)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.08)', strokeWidth: 1 }} />
        <Area
          type="natural"
          dataKey="orders"
          stroke="#38bdf8"
          strokeWidth={2}
          fill="url(#fillOrders)"
          dot={false}
          activeDot={{ r: 4, fill: '#38bdf8', strokeWidth: 0 }}
        />
        <Area
          type="natural"
          dataKey="sales"
          stroke="#f97316"
          strokeWidth={2.5}
          fill="url(#fillSales)"
          dot={false}
          activeDot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
