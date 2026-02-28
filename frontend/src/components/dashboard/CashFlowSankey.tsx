import { useRef, useState, useEffect, useMemo } from 'react';
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey';
import type { SankeyNode, SankeyLink } from 'd3-sankey';
import { useCashFlowData } from '@/hooks/useDashboard';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/formatters';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NodeExtra {
  name: string;
  icon: string;
  color: string;
  isSource: boolean;
  amount: number;
}

interface LinkExtra {
  sourceName: string;
  targetName: string;
  sourceColor: string;
  targetColor: string;
}

type SNode = SankeyNode<NodeExtra, LinkExtra>;
type SLink = SankeyLink<NodeExtra, LinkExtra>;

// ── Constants ─────────────────────────────────────────────────────────────────

const MARGIN = { top: 24, right: 200, bottom: 24, left: 170 };
const NODE_WIDTH = 16;
const NODE_PADDING = 14;

// Pre-built path generator (stateless, safe to share)
const linkPathGen = sankeyLinkHorizontal();

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(s: string, max = 22) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TooltipInfo {
  x: number;
  y: number;
  sourceName: string;
  targetName: string;
  value: number;
}

export function CashFlowSankey() {
  const { data, isLoading } = useCashFlowData();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(900);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  // Responsive container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSvgWidth(el.getBoundingClientRect().width || 900);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build layout whenever data or container width changes
  const graph = useMemo(() => {
    if (!data || !data.incomes.length || !data.expenses.length || svgWidth < 1) return null;

    const { incomes, expenses, totalIncome, savings } = data;
    const hasSavings = savings > 0;

    // ── Nodes ────────────────────────────────────────────────────────────────
    const inputNodes: NodeExtra[] = [
      ...incomes.map(i => ({
        name: i.name, icon: i.icon, color: i.color, isSource: true, amount: i.total,
      })),
      ...expenses.map(e => ({
        name: e.name, icon: e.icon, color: e.color, isSource: false, amount: e.total,
      })),
      ...(hasSavings ? [{
        name: 'Savings', icon: '📈', color: '#10b981', isSource: false, amount: savings,
      }] : []),
    ];

    const nIncome = incomes.length;
    const savingsIdx = hasSavings ? inputNodes.length - 1 : -1;

    // ── Links ─────────────────────────────────────────────────────────────────
    // Proportional allocation: link(i→e) = income_i × expense_e / totalIncome
    // Ensures income nodes balance (outflow = income_i.total) when savings ≥ 0.
    const inputLinks: Array<{ source: number; target: number; value: number } & LinkExtra> = [];

    for (let i = 0; i < incomes.length; i++) {
      const inc = incomes[i];
      for (let e = 0; e < expenses.length; e++) {
        const exp = expenses[e];
        const value = totalIncome > 0 ? (inc.total * exp.total) / totalIncome : 0;
        if (value >= 0.5) {
          inputLinks.push({
            source: i, target: nIncome + e, value,
            sourceName: inc.name, targetName: exp.name,
            sourceColor: inc.color, targetColor: exp.color,
          });
        }
      }
      if (hasSavings && savingsIdx >= 0) {
        const value = totalIncome > 0 ? (inc.total * savings) / totalIncome : 0;
        if (value >= 0.5) {
          inputLinks.push({
            source: i, target: savingsIdx, value,
            sourceName: inc.name, targetName: 'Savings',
            sourceColor: inc.color, targetColor: '#10b981',
          });
        }
      }
    }

    // ── Chart height ──────────────────────────────────────────────────────────
    const sinkCount = expenses.length + (hasSavings ? 1 : 0);
    const chartH = Math.max(400, sinkCount * 52 + MARGIN.top + MARGIN.bottom);

    // ── Run d3-sankey ─────────────────────────────────────────────────────────
    const layout = sankey<NodeExtra, LinkExtra>()
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .nodeAlign(sankeyJustify)
      .extent([
        [MARGIN.left, MARGIN.top],
        [svgWidth - MARGIN.right, chartH - MARGIN.bottom],
      ]);

    const result = layout({
      // d3-sankey mutates inputs; always pass copies
      nodes: inputNodes.map(n => ({ ...n })),
      links: inputLinks.map(l => ({ ...l })),
    });

    return {
      nodes: result.nodes as SNode[],
      links: result.links as SLink[],
      height: chartH,
    };
  }, [data, svgWidth]);

  // ── Empty / loading states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="card p-5">
        <h3 className="section-title">Cash Flow</h3>
        <div className="flex justify-center py-16"><Spinner /></div>
      </div>
    );
  }

  if (!data || !data.incomes.length || !data.expenses.length) {
    return (
      <div className="card p-5">
        <h3 className="section-title">Cash Flow</h3>
        <p className="text-slate-500 text-sm text-center py-10">
          No categorized income and expenses found for the selected period.
        </p>
      </div>
    );
  }

  const { totalIncome, totalExpenses, savings } = data;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="card p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="section-title mb-0">Cash Flow</h3>
          <p className="text-xs text-slate-500 mt-0.5">Where your money comes from and where it goes</p>
        </div>
        <div className="flex gap-5 text-xs">
          <div className="text-center">
            <p className="text-slate-500 mb-0.5">Income</p>
            <p className="text-green-400 font-semibold">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-500 mb-0.5">Expenses</p>
            <p className="text-red-400 font-semibold">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-500 mb-0.5">{savings >= 0 ? 'Savings' : 'Deficit'}</p>
            <p className={`font-semibold ${savings >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {formatCurrency(Math.abs(savings))}
            </p>
          </div>
        </div>
      </div>

      {/* SVG chart */}
      <div ref={containerRef} className="w-full">
        {graph && (
          <svg
            width={svgWidth}
            height={graph.height}
            className="overflow-visible"
            onMouseLeave={() => setTooltip(null)}
          >
            <defs>
              {/* Gradient for each link: source color → target color */}
              {graph.links.map((link, i) => {
                const src = link.source as SNode;
                const tgt = link.target as SNode;
                return (
                  <linearGradient
                    key={i}
                    id={`cfs-lg-${i}`}
                    gradientUnits="userSpaceOnUse"
                    x1={src.x1 ?? 0}
                    y1="0"
                    x2={tgt.x0 ?? 0}
                    y2="0"
                  >
                    <stop offset="0%" stopColor={src.color} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={tgt.color} stopOpacity={0.55} />
                  </linearGradient>
                );
              })}
            </defs>

            {/* ── Links ── */}
            {graph.links.map((link, i) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const d = linkPathGen(link as any);
              if (!d) return null;
              return (
                <path
                  key={i}
                  d={d}
                  fill={`url(#cfs-lg-${i})`}
                  stroke="none"
                  className="cursor-default"
                  style={{ transition: 'opacity 120ms' }}
                  onMouseMove={(e) =>
                    setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      sourceName: link.sourceName,
                      targetName: link.targetName,
                      value: link.value,
                    })
                  }
                  onMouseEnter={(e) => {
                    // Dim all other links
                    e.currentTarget.closest('svg')
                      ?.querySelectorAll<SVGPathElement>('[data-link]')
                      .forEach((el, j) => { if (j !== i) el.style.opacity = '0.3'; });
                  }}
                  onMouseLeave={(e) => {
                    setTooltip(null);
                    e.currentTarget.closest('svg')
                      ?.querySelectorAll<SVGPathElement>('[data-link]')
                      .forEach((el) => { el.style.opacity = '1'; });
                  }}
                  data-link={i}
                />
              );
            })}

            {/* ── Nodes ── */}
            {graph.nodes.map((node, i) => {
              const nh = (node.y1 ?? 0) - (node.y0 ?? 0);
              const midY = (node.y0 ?? 0) + nh / 2;
              const isLeft = node.isSource;
              const lx = isLeft
                ? (node.x0 ?? 0) - 12
                : (node.x1 ?? 0) + 12;
              const anchor = isLeft ? 'end' : 'start';

              // Show both name + amount only when the node is tall enough
              const showAmount = nh > 32;
              const nameY = showAmount ? midY - 9 : midY;

              return (
                <g key={i}>
                  {/* Node bar */}
                  <rect
                    x={node.x0}
                    y={node.y0}
                    width={(node.x1 ?? 0) - (node.x0 ?? 0)}
                    height={nh}
                    fill={node.color}
                    fillOpacity={0.92}
                    rx={3}
                  />

                  {/* Icon + name */}
                  {nh > 10 && (
                    <text
                      x={lx}
                      y={nameY}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      fontSize={12.5}
                      fontWeight={500}
                      fill="#e2e8f0"
                    >
                      {node.icon} {truncate(node.name)}
                    </text>
                  )}

                  {/* Amount */}
                  {showAmount && (
                    <text
                      x={lx}
                      y={midY + 11}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      fontSize={11}
                      fill="#64748b"
                    >
                      {formatCurrency(node.amount)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-[999] pointer-events-none card px-3 py-2 text-xs shadow-2xl border border-slate-600"
          style={{ left: tooltip.x + 14, top: tooltip.y - 44 }}
        >
          <p className="text-slate-400">
            {tooltip.sourceName}
            <span className="mx-1.5 text-slate-600">→</span>
            {tooltip.targetName}
          </p>
          <p className="text-slate-100 font-semibold text-sm mt-0.5">
            {formatCurrency(tooltip.value)}
          </p>
        </div>
      )}
    </div>
  );
}
