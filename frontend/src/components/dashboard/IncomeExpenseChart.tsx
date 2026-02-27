import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatMonthLabel, formatCompactCurrency } from '@/lib/formatters';
import type { MonthlySummary } from '@/lib/types';

interface IncomeExpenseChartProps {
  data: MonthlySummary[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-3 text-sm shadow-xl">
      <p className="text-slate-300 font-medium mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-400 capitalize">{p.name}:</span>
          <span className="text-slate-100 font-medium ml-auto pl-4">
            {formatCompactCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  const chartData = data.map(m => ({
    month: formatMonthLabel(m.month),
    income: m.income,
    expenses: m.expenses,
    net: m.net,
  }));

  return (
    <div className="card p-5">
      <h3 className="section-title">Income vs Expenses</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => formatCompactCurrency(v)}
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#94A3B8', paddingTop: '16px' }}
          />
          <Bar dataKey="income" fill="#22C55E" radius={[3, 3, 0, 0]} maxBarSize={40} name="income" />
          <Bar dataKey="expenses" fill="#EF4444" radius={[3, 3, 0, 0]} maxBarSize={40} name="expenses" />
          <Line
            type="monotone"
            dataKey="net"
            stroke="#6366F1"
            strokeWidth={2}
            dot={{ fill: '#6366F1', r: 3 }}
            name="net"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
