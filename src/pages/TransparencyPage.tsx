import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/ImageUploader";
import { ContributionChart } from "@/components/ContributionChart";
import { TopPromptsList } from "@/components/TopPromptsList";
import { CategoryLegend } from "@/components/CategoryLegend";
import { getTopCategories } from "@/lib/analysis";
import {
  useQualityAnalysis,
  type TransparencyResult,
} from "@/hooks/useQualityAnalysis";
import { loadSampleImages, SAMPLE_URLS } from "@/lib/samples";
import { Loader2 } from "lucide-react";

export function TransparencyPage() {
  const { loading, analyzing, status, staticData, analyzeTransparency } =
    useQualityAnalysis();

  const [imageFiles, setImageFiles] = useState<(File | null)[]>([
    null,
    null,
    null,
  ]);
  const [previewUrls, setPreviewUrls] = useState<(string | undefined)[]>([
    undefined,
    undefined,
    undefined,
  ]);
  const [results, setResults] = useState<(TransparencyResult | null)[]>([
    null,
    null,
    null,
  ]);
  const [samplesLoaded, setSamplesLoaded] = useState(false);

  // Pre-load sample images on mount
  useEffect(() => {
    loadSampleImages().then((files) => {
      setImageFiles(files);
      setPreviewUrls(SAMPLE_URLS.map((url) => url));
      setSamplesLoaded(true);
    });
  }, []);

  const handleImageSelected = useCallback(
    (index: number, file: File) => {
      setImageFiles((prev) => {
        const next = [...prev];
        next[index] = file;
        return next;
      });
      setPreviewUrls((prev) => {
        const next = [...prev];
        next[index] = URL.createObjectURL(file);
        return next;
      });
      setResults((prev) => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
    },
    []
  );

  const handleAnalyze = useCallback(async () => {
    const filesToAnalyze = imageFiles.filter(Boolean) as File[];
    if (filesToAnalyze.length === 0) return;

    const newResults: (TransparencyResult | null)[] = [null, null, null];
    for (let i = 0; i < imageFiles.length; i++) {
      if (imageFiles[i]) {
        newResults[i] = await analyzeTransparency(imageFiles[i]!);
      }
    }
    setResults(newResults);
  }, [imageFiles, analyzeTransparency]);

  const hasImages = imageFiles.some(Boolean);
  const hasResults = results.some(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-muted-foreground">{status || "Loading..."}</span>
      </div>
    );
  }

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
          Quality Transparency Analysis
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload 1–3 face images to decompose the predicted quality score into
          per-prompt contributions. The top-384 most similar prompts are
          highlighted; the top-3 contributing categories are outlined in{" "}
          <span className="text-red-600 font-semibold">red</span>.
        </p>
        {samplesLoaded && !hasResults && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            Sample images are pre-loaded — click Analyze to try, or upload your own.
          </p>
        )}
      </div>

      {/* Upload area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <ImageUploader
            key={i}
            label={`Image ${i + 1}`}
            previewUrl={previewUrls[i]}
            onImageSelected={(file) => handleImageSelected(i, file)}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleAnalyze} disabled={!hasImages || analyzing}>
          {analyzing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {analyzing ? status || "Analyzing..." : "Analyze"}
        </Button>
        {analyzing && (
          <span className="text-sm text-muted-foreground">{status}</span>
        )}
      </div>

      {/* Category Legend */}
      {staticData && hasResults && (
        <CategoryLegend categoryMeta={staticData.categoryMeta} />
      )}

      {/* ── Per-image results ── */}
      {results.map((result, i) => {
        if (!result) return null;
        const topCats = getTopCategories(result.chartData, 3);
        return (
          <div key={i} className="flex items-start gap-3">
            {/* Left: image thumbnail + score + top prompts */}
            <div className="flex flex-col items-center gap-2 pt-8 shrink-0 w-[90px]">
              <img
                src={result.imageUrl}
                alt={`Image ${i + 1}`}
                className="w-16 h-16 rounded object-cover border"
              />
              <span
                className="text-xs font-bold"
                style={{
                  fontFamily:
                    "'Times New Roman', 'DejaVu Serif', Georgia, serif",
                }}
              >
                Image {i + 1}
              </span>
              <Badge variant="secondary" className="text-[10px] font-mono">
                Q = {result.qualityScore.toFixed(3)}
              </Badge>
              <TopPromptsList
                positive={result.topPrompts.positive}
                negative={result.topPrompts.negative}
              />
            </div>

            {/* Right: full-width chart */}
            <div className="flex-1 min-w-0">
              <ContributionChart
                data={result.chartData}
                title={`Prompt Contributions (wᵢ · sᵢ) — Image ${i + 1}`}
                yLabel="wᵢ · sᵢ"
                height={260}
                highlightCategories={topCats}
              />
            </div>
          </div>
        );
      })}

      {/* Weight chart */}
      {staticData && hasResults && (
        <ContributionChart
          data={staticData.weightChartData}
          title="Learned Regressor Weights (wᵢ)"
          yLabel="wᵢ"
          height={230}
        />
      )}
    </div>
  );
}
