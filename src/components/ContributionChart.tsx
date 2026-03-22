import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { ChartData, CategoryBoundary } from "@/types";

interface ContributionChartProps {
  data: ChartData;
  title: string;
  yLabel: string;
  height?: number;
  /** Category names to highlight with red border (top-3) */
  highlightCategories?: string[];
}

interface SelectedBar {
  shortText: string;
  promptText: string;
  category: string;
  color: string;
  similarity: number;
  weight: number;
  value: number;
  isTopK: boolean;
  position: number;
}

/* ── Detail panel (pinned on click) ───────────────────────────── */
function DetailPanel({
  bar,
  onClose,
}: {
  bar: SelectedBar;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 bg-muted/40 border-t text-xs">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div
            className="w-2.5 h-2.5 rounded-sm shrink-0 border"
            style={{ backgroundColor: bar.color }}
          />
          <span className="font-semibold text-foreground text-sm">
            {bar.promptText}
          </span>
          {bar.isTopK && (
            <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-semibold shrink-0 tracking-wide">
              TOP-384
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0 text-muted-foreground font-mono">
          <span>
            category:{" "}
            <strong className="not-italic" style={{ color: bar.color }}>
              {bar.category}
            </strong>
          </span>
          <span>
            s<sub>i</sub> ={" "}
            <strong className="text-foreground">
              {bar.similarity.toFixed(4)}
            </strong>
          </span>
          <span>
            w<sub>i</sub> ={" "}
            <strong className="text-foreground">
              {bar.weight.toFixed(4)}
            </strong>
          </span>
          <span>
            w<sub>i</sub>·s<sub>i</sub> ={" "}
            <strong className="text-foreground">
              {bar.value.toFixed(6)}
            </strong>
          </span>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="text-muted-foreground hover:text-foreground text-sm shrink-0 leading-none mt-0.5"
      >
        ×
      </button>
    </div>
  );
}

/* ── Hover tooltip ────────────────────────────────────────────── */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown> }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded border bg-white/95 backdrop-blur-sm px-3 py-2 shadow-lg text-[11px] max-w-[300px] font-mono">
      <p className="font-sans font-semibold text-foreground mb-0.5 text-xs leading-tight">
        {d.shortText as string}
      </p>
      <div className="flex flex-wrap gap-x-3 text-muted-foreground">
        <span style={{ color: d.color as string, fontWeight: 600 }}>
          {d.category as string}
        </span>
        <span>s={Number(d.similarity).toFixed(3)}</span>
        <span>w={Number(d.weight).toFixed(4)}</span>
        <span className="text-foreground font-semibold">
          v={Number(d.value).toFixed(5)}
        </span>
      </div>
      {(d.isTopK as boolean) && (
        <p className="text-[9px] text-blue-600 font-sans font-semibold mt-0.5">
          ● Top-384 most similar prompt
        </p>
      )}
    </div>
  );
}

/* ── Main chart ───────────────────────────────────────────────── */
export function ContributionChart({
  data,
  title,
  yLabel,
  height = 250,
  highlightCategories = [],
}: ContributionChartProps) {
  const [selected, setSelected] = useState<SelectedBar | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (chartRef.current && !chartRef.current.contains(e.target as Node)) {
        setSelected(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const chartData = useMemo(
    () =>
      data.bars.map((bar) => ({
        ...bar,
        fillOpacity: bar.isTopK ? 1.0 : 0.18,
      })),
    [data.bars]
  );

  const categoryTicks = useMemo(
    () =>
      data.categoryBoundaries.map((b: CategoryBoundary) => ({
        position: Math.round((b.start + b.end) / 2),
        label: b.category,
        color: chartData[b.start]?.color || "#888",
        isHighlighted: highlightCategories.includes(b.category),
      })),
    [data.categoryBoundaries, chartData, highlightCategories]
  );

  const categoryBands = useMemo(
    () =>
      data.categoryBoundaries.map((b: CategoryBoundary, i: number) => ({
        x1: b.start - 0.5,
        x2: b.end - 0.5,
        fill:
          i % 2 === 0 ? "rgba(0,0,0,0.012)" : "rgba(0,0,0,0.04)",
        category: b.category,
      })),
    [data.categoryBoundaries]
  );

  const handleBarClick = useCallback(
    (entry: Record<string, unknown>) => {
      if (!entry) return;
      setSelected({
        shortText: entry.shortText as string,
        promptText: entry.promptText as string,
        category: entry.category as string,
        color: entry.color as string,
        similarity: entry.similarity as number,
        weight: entry.weight as number,
        value: entry.value as number,
        isTopK: entry.isTopK as boolean,
        position: entry.position as number,
      });
    },
    []
  );

  const yDomain = useMemo(() => {
    let min = 0,
      max = 0;
    for (const bar of chartData) {
      if (bar.value < min) min = bar.value;
      if (bar.value > max) max = bar.value;
    }
    const pad = (max - min) * 0.12 || 0.001;
    return [min - pad, max + pad];
  }, [chartData]);

  return (
    <Card className="w-full overflow-hidden" ref={chartRef}>
      {/* Title */}
      <div className="px-4 pt-3 pb-1 flex items-baseline justify-between border-b border-border/40">
        <h3
          className="text-[13px] font-bold text-foreground tracking-tight"
          style={{
            fontFamily:
              "'Times New Roman', 'DejaVu Serif', Georgia, serif",
          }}
        >
          {title}
        </h3>
        <span className="text-[9px] text-muted-foreground/50 italic select-none">
          click any bar to inspect prompt
        </span>
      </div>

      <CardContent className="p-0 pr-2 pb-0">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 6, right: 8, bottom: 46, left: 4 }}
            barCategoryGap={0}
            barGap={0}
            onClick={(state) => {
              if (state?.activePayload?.[0])
                handleBarClick(state.activePayload[0].payload);
            }}
            onMouseMove={(state) => {
              if (state?.activePayload?.[0])
                setHoveredCategory(
                  state.activePayload[0].payload.category as string
                );
            }}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            {/* ── Background bands ── */}
            {categoryBands.map((band) => (
              <ReferenceArea
                key={band.category}
                x1={band.x1}
                x2={band.x2}
                y1={yDomain[0]}
                y2={yDomain[1]}
                fill={
                  hoveredCategory === band.category
                    ? "rgba(0,0,0,0.09)"
                    : selected?.category === band.category
                      ? "rgba(0,0,0,0.07)"
                      : band.fill
                }
                fillOpacity={1}
                ifOverflow="extendDomain"
                strokeOpacity={0}
              />
            ))}

            {/* ── Red highlight boxes for top-3 categories ── */}
            {data.categoryBoundaries
              .filter((b) => highlightCategories.includes(b.category))
              .map((b) => (
                <ReferenceArea
                  key={`hl-${b.category}`}
                  x1={b.start - 0.5}
                  x2={b.end - 0.5}
                  y1={yDomain[0]}
                  y2={yDomain[1]}
                  fill="none"
                  fillOpacity={1}
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeOpacity={0.7}
                  ifOverflow="extendDomain"
                />
              ))}

            {/* ── X axis: category labels ── */}
            <XAxis
              dataKey="position"
              type="number"
              domain={[-0.5, chartData.length - 0.5]}
              tick={({
                x,
                y,
                payload,
              }: {
                x: number;
                y: number;
                payload: { value: number };
              }) => {
                const tick = categoryTicks.find(
                  (t) => Math.abs(t.position - payload.value) < 0.5
                );
                if (!tick) return <g />;
                const isActive =
                  hoveredCategory === tick.label ||
                  selected?.category === tick.label;
                const isHl = tick.isHighlighted;
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={10}
                      textAnchor="end"
                      fill={
                        isActive
                          ? tick.color
                          : isHl
                            ? "#dc2626"
                            : "#aaa"
                      }
                      fontSize={isActive || isHl ? 9.5 : 7.5}
                      fontWeight={isActive || isHl ? 700 : 400}
                      transform="rotate(-45)"
                      style={{
                        fontFamily:
                          "'Times New Roman', 'DejaVu Serif', Georgia, serif",
                      }}
                    >
                      {tick.label}
                    </text>
                  </g>
                );
              }}
              ticks={categoryTicks.map((t) => t.position)}
              axisLine={false}
              tickLine={false}
            />

            {/* ── Y axis ── */}
            <YAxis
              domain={yDomain}
              label={{
                value: yLabel,
                angle: -90,
                position: "insideLeft",
                style: {
                  fontSize: 11,
                  fill: "#555",
                  fontStyle: "italic",
                  fontFamily:
                    "'Times New Roman', 'DejaVu Serif', Georgia, serif",
                },
              }}
              tick={{
                fontSize: 7.5,
                fill: "#aaa",
                fontFamily: "ui-monospace, monospace",
              }}
              axisLine={{ stroke: "#ddd" }}
              tickLine={false}
              width={56}
              tickFormatter={(v: number) => {
                if (v === 0) return "0";
                if (Math.abs(v) < 0.0001) return v.toExponential(0);
                return v.toFixed(4);
              }}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
              isAnimationActive={false}
            />

            <ReferenceLine y={0} stroke="#aaa" strokeWidth={0.5} />

            {/* ── Category separators ── */}
            {data.categoryBoundaries
              .filter((b: CategoryBoundary) => b.start > 0)
              .map((b: CategoryBoundary) => (
                <ReferenceLine
                  key={`sep-${b.start}`}
                  x={b.start - 0.5}
                  stroke="#ddd"
                  strokeWidth={0.3}
                  strokeDasharray="2 2"
                />
              ))}

            {/* ── Bars ── */}
            <Bar dataKey="value" isAnimationActive={false} maxBarSize={3}>
              {chartData.map((entry, index) => {
                const isSelected =
                  selected?.position === entry.position;
                return (
                  <Cell
                    key={index}
                    fill={isSelected ? "#111" : entry.color}
                    fillOpacity={
                      isSelected ? 1 : entry.fillOpacity
                    }
                    stroke={
                      isSelected
                        ? "#111"
                        : entry.isTopK
                          ? "#333"
                          : "none"
                    }
                    strokeWidth={
                      isSelected ? 2 : entry.isTopK ? 0.4 : 0
                    }
                    cursor="pointer"
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>

      {/* Legend row */}
      <div className="px-4 pb-1 flex items-center gap-4 text-[9px] text-muted-foreground border-t border-border/30 pt-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 bg-gray-500 rounded-sm" />
          Top-384 most similar (full opacity)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 bg-gray-300 rounded-sm opacity-40" />
          Other prompts (faded)
        </span>
        {highlightCategories.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 border-2 border-red-600 rounded-sm" />
            Top-{highlightCategories.length} contributing categories
          </span>
        )}
      </div>

      {/* Pinned detail panel */}
      {selected && (
        <DetailPanel bar={selected} onClose={() => setSelected(null)} />
      )}
    </Card>
  );
}
