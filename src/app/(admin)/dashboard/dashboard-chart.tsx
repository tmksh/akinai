'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  LabelList,
} from 'recharts';

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; dataKey: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const sales = payload.find(p => p.dataKey === 'sales');
  const orders = payload.find(p => p.dataKey === 'orders');
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.8)',
        boxShadow: '0 4px 16px rgba(100,120,160,0.12)',
      }}
    >
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {sales && <p style={{ color: '#0ea5e9' }}>¥{(sales.value * 1000).toLocaleString()}</p>}
      {orders && <p style={{ color: '#8b5cf6' }}>{orders.value}件</p>}
    </div>
  );
}

function CustomBarShape(props: {
  x?: number; y?: number; width?: number; height?: number; fill?: string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, fill } = props;
  if (!height || height <= 0) return null;
  const r = Math.min(6, width / 2);
  return (
    <path
      d={`M${x + r},${y} h${width - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${height - r} h-${width} v-${height - r} a${r},${r} 0 0 1 ${r},-${r}z`}
      fill={fill}
    />
  );
}

export function DashboardChart({ data }: { data: { name: string; sales: number; orders: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 4, bottom: 0, left: -16 }} barCategoryGap="28%">
        <defs>
          <linearGradient id="barSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="barOrders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
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
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
        <Bar dataKey="orders" fill="url(#barOrders)" shape={<CustomBarShape />} barSize={14}>
          <LabelList
            dataKey="orders"
            position="top"
            style={{ fontSize: 9, fill: '#8b5cf6', fontWeight: 600 }}
            formatter={(v: number) => v > 0 ? `${v}件` : ''}
          />
        </Bar>
        <Bar dataKey="sales" fill="url(#barSales)" shape={<CustomBarShape />} barSize={14}>
          <LabelList
            dataKey="sales"
            position="top"
            style={{ fontSize: 9, fill: '#0ea5e9', fontWeight: 600 }}
            formatter={(v: number) => v > 0 ? `${v}k` : ''}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
