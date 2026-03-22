import type { CategoryMeta } from "@/types";

interface CategoryLegendProps {
  categoryMeta: CategoryMeta;
}

export function CategoryLegend({ categoryMeta }: CategoryLegendProps) {
  const categories = Object.entries(categoryMeta.colors);

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {categories.map(([cat, color]) => (
        <div key={cat} className="flex items-center gap-1">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: color }}
          />
          <span className="text-muted-foreground">
            {categoryMeta.displayNames[cat] || cat}
          </span>
        </div>
      ))}
    </div>
  );
}
