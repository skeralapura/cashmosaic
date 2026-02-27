import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { useNavigate } from 'react-router-dom';
import type { CategoryTotal } from '@/lib/types';

interface CategoryDonutProps {
  data: CategoryTotal[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="card p-2.5 text-sm shadow-xl">
      <p className="text-slate-200 font-medium">{name}</p>
      <p className="text-slate-400">{formatCurrency(value)}</p>
    </div>
  );
};

export function CategoryDonut({ data }: CategoryDonutProps) {
  const navigate = useNavigate();
  const total = data.reduce((s, d) => s + d.total, 0);
  const top10 = data.slice(0, 10);

  return (
    <div className="card p-5">
      <h3 className="section-title">Spending by Category</h3>
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={top10}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                onClick={(entry) => navigate(`/transactions?category=${encodeURIComponent(entry.category_id)}`)}
                style={{ cursor: 'pointer' }}
              >
                {top10.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5 overflow-y-auto max-h-48">
          {top10.map(item => (
            <button
              key={item.category_id}
              onClick={() => navigate(`/transactions?category=${encodeURIComponent(item.category_id)}`)}
              className="flex items-center gap-2 w-full text-left hover:bg-slate-700/30 rounded p-1 transition-colors"
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-slate-300 flex-1 truncate">{item.icon} {item.category}</span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {formatPercent((item.total / total) * 100, 0)}
              </span>
              <span className="text-xs font-medium text-slate-200 flex-shrink-0 w-16 text-right">
                {formatCurrency(item.total)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
