import type { ChartBar } from "@/types";

interface TopPromptsListProps {
  positive: ChartBar[];
  negative: ChartBar[];
}

/** Strip the first word (e.g. "person") to save space */
function trimFirst(text: string): string {
  const idx = text.indexOf(" ");
  return idx > 0 ? text.slice(idx + 1) : text;
}

export function TopPromptsList({ positive, negative }: TopPromptsListProps) {
  return (
    <div className="w-full text-left space-y-1.5">
      <p
        className="text-[9px] font-semibold text-green-700"
        style={{ fontFamily: "'Times New Roman', 'DejaVu Serif', Georgia, serif" }}
      >
        Top 3:
      </p>
      {positive.map((p, i) => (
        <p key={`p${i}`} className="text-[8px] leading-tight text-green-600 truncate">
          {trimFirst(p.shortText)}
        </p>
      ))}
      <p
        className="text-[9px] font-semibold text-red-700 pt-0.5"
        style={{ fontFamily: "'Times New Roman', 'DejaVu Serif', Georgia, serif" }}
      >
        Bottom 3:
      </p>
      {negative.map((p, i) => (
        <p key={`n${i}`} className="text-[8px] leading-tight text-red-600 truncate">
          {trimFirst(p.shortText)}
        </p>
      ))}
    </div>
  );
}
