import type { ChartBar } from "@/types";

interface TopPromptsListProps {
  positive: ChartBar[];
  negative: ChartBar[];
}

export function TopPromptsList({ positive, negative }: TopPromptsListProps) {
  return (
    <div className="text-xs space-y-2 px-2">
      <div>
        <p className="font-semibold text-green-700 mb-1">Top positive contributions:</p>
        {positive.map((p, i) => (
          <p key={i} className="text-green-600 truncate">
            +{i + 1} {p.shortText}{" "}
            <span className="text-muted-foreground">
              (s={p.similarity.toFixed(2)}, v={p.value >= 0 ? "+" : ""}{p.value.toFixed(4)})
            </span>
          </p>
        ))}
      </div>
      <div>
        <p className="font-semibold text-red-700 mb-1">Top negative contributions:</p>
        {negative.map((p, i) => (
          <p key={i} className="text-red-600 truncate">
            -{i + 1} {p.shortText}{" "}
            <span className="text-muted-foreground">
              (s={p.similarity.toFixed(2)}, v={p.value >= 0 ? "+" : ""}{p.value.toFixed(4)})
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
