import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/ImageUploader";
import { ContributionChart } from "@/components/ContributionChart";
import { CategoryLegend } from "@/components/CategoryLegend";
import { getTopCategories } from "@/lib/analysis";
import {
  useQualityAnalysis,
  type ComparisonResult,
} from "@/hooks/useQualityAnalysis";
import { Loader2 } from "lucide-react";

export function ComparisonPage() {
  const { loading, analyzing, status, staticData, analyzeComparison } =
    useQualityAnalysis();

  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [previewA, setPreviewA] = useState<string | undefined>();
  const [previewB, setPreviewB] = useState<string | undefined>();
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const handleSelectA = useCallback((file: File) => {
    setFileA(file);
    setPreviewA(URL.createObjectURL(file));
    setResult(null);
  }, []);

  const handleSelectB = useCallback((file: File) => {
    setFileB(file);
    setPreviewB(URL.createObjectURL(file));
    setResult(null);
  }, []);

  const handleCompare = useCallback(async () => {
    if (!fileA || !fileB) return;
    const res = await analyzeComparison(fileA, fileB);
    setResult(res);
  }, [fileA, fileB, analyzeComparison]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-muted-foreground">{status || "Loading..."}</span>
      </div>
    );
  }

  // Compute top-3 categories from weighted difference chart
  const topCats = result
    ? getTopCategories(result.weightedDiffData, 3)
    : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2
          className="text-xl font-bold mb-1"
          style={{
            fontFamily:
              "'Times New Roman', 'DejaVu Serif', Georgia, serif",
          }}
        >
          Pairwise Quality Comparison
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload two face images to identify which text prompts drive the
          quality difference. The top-3 categories with the largest absolute
          contribution difference are outlined in{" "}
          <span className="text-red-600 font-semibold">red</span>.
        </p>
      </div>

      {/* Upload area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageUploader
          label="Image A"
          previewUrl={previewA}
          onImageSelected={handleSelectA}
        />
        <ImageUploader
          label="Image B"
          previewUrl={previewB}
          onImageSelected={handleSelectB}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleCompare}
          disabled={!fileA || !fileB || analyzing}
        >
          {analyzing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {analyzing ? status || "Comparing..." : "Compare"}
        </Button>
        {analyzing && (
          <span className="text-sm text-muted-foreground">{status}</span>
        )}
      </div>

      {result && staticData && (
        <>
          {/* Category Legend */}
          <CategoryLegend categoryMeta={staticData.categoryMeta} />

          {/* Row 1: Images + similarity difference */}
          <div className="flex items-start gap-3">
            {/* Left: both thumbnails + scores */}
            <div className="flex flex-col items-center gap-2 pt-6 shrink-0 w-[90px]">
              <img
                src={result.imageUrlA}
                alt="Image A"
                className="w-14 h-14 rounded object-cover border"
              />
              <span
                className="text-[10px] font-bold"
                style={{
                  fontFamily:
                    "'Times New Roman', 'DejaVu Serif', Georgia, serif",
                }}
              >
                A · Q={result.scoreA.toFixed(3)}
              </span>
              <span className="text-muted-foreground text-[10px] font-semibold">vs</span>
              <img
                src={result.imageUrlB}
                alt="Image B"
                className="w-14 h-14 rounded object-cover border"
              />
              <span
                className="text-[10px] font-bold"
                style={{
                  fontFamily:
                    "'Times New Roman', 'DejaVu Serif', Georgia, serif",
                }}
              >
                B · Q={result.scoreB.toFixed(3)}
              </span>
              <Badge variant="secondary" className="text-[9px] font-mono mt-1">
                ΔQ={" "}
                {(result.scoreB - result.scoreA) >= 0 ? "+" : ""}
                {(result.scoreB - result.scoreA).toFixed(3)}
              </Badge>
            </div>
            {/* Right: first chart */}
            <div className="flex-1 min-w-0">
              <ContributionChart
                data={result.simDiffData}
                title="Similarity Difference (Δsᵢ = sᵢᴮ − sᵢᴬ)"
                yLabel="Δsᵢ"
                height={210}
              />
            </div>
          </div>

          {/* Row 2: Weighted difference — top-3 highlighted */}
          <ContributionChart
            data={result.weightedDiffData}
            title="Weighted Contribution Difference (Δsᵢ · wᵢ)"
            yLabel="Δsᵢ · wᵢ"
            height={220}
            highlightCategories={topCats}
          />

          {/* Row 3: Negative contributions only — top-3 highlighted */}
          <ContributionChart
            data={result.negativeDiffData}
            title="Negative Contributions Only (min(Δsᵢ · wᵢ, 0))"
            yLabel="min(Δsᵢ·wᵢ, 0)"
            height={210}
            highlightCategories={topCats}
          />

          {/* Row 4: Weights */}
          <ContributionChart
            data={staticData.weightChartData}
            title="Learned Regressor Weights (wᵢ)"
            yLabel="wᵢ"
            height={220}
          />
        </>
      )}
    </div>
  );
}
