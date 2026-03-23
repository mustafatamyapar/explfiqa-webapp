import { useState, useEffect, useRef, useCallback } from "react";
import { loadAllData } from "@/lib/data";
import { getImageEmbedding } from "@/lib/api";
import {
  computeSimilarities,
  computeQualityScore,
  buildGlobalOrder,
  buildTransparencyChartData,
  buildComparisonChartData,
  getTopContributingPrompts,
} from "@/lib/analysis";
import type {
  Prompt,
  CategoryMeta,
  WeightsData,
  CategoryBoundary,
  ChartData,
  ChartBar,
} from "@/types";

interface StaticData {
  prompts: Prompt[];
  categoryMeta: CategoryMeta;
  weights: WeightsData;
  embeddings: Float32Array;
  embeddingShape: [number, number];
  globalOrder: number[];
  categoryBoundaries: CategoryBoundary[];
  weightChartData: ChartData;
}

let cachedStaticData: StaticData | null = null;

export interface TransparencyResult {
  chartData: ChartData;
  qualityScore: number;
  topPrompts: { positive: ChartBar[]; negative: ChartBar[] };
  imageUrl: string;
}

export interface ComparisonResult {
  simDiffData: ChartData;
  weightedDiffData: ChartData;
  negativeDiffData: ChartData;
  scoreA: number;
  scoreB: number;
  imageUrlA: string;
  imageUrlB: string;
}

export function useQualityAnalysis() {
  const [staticData, setStaticData] = useState<StaticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading data...");
  const [analyzing, setAnalyzing] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    async function init() {
      if (cachedStaticData) {
        setStaticData(cachedStaticData);
        setLoading(false);
        return;
      }

      const data = await loadAllData();
      const { globalOrder, categoryBoundaries } = buildGlobalOrder(
        data.prompts,
        data.weights.weights
      );

      // Build weight chart data (static, doesn't depend on image)
      const weightBars: ChartBar[] = globalOrder.map((origIdx, displayPos) => {
        const prompt = data.prompts[origIdx];
        return {
          position: displayPos,
          value: data.weights.weights[origIdx],
          promptIndex: origIdx,
          promptText: prompt.text,
          shortText: prompt.shortText,
          category: prompt.category,
          color: data.categoryMeta.colors[prompt.category] || "#888",
          similarity: 0,
          weight: data.weights.weights[origIdx],
          isTopK: false,
        };
      });

      const result: StaticData = {
        prompts: data.prompts,
        categoryMeta: data.categoryMeta,
        weights: data.weights,
        embeddings: data.embeddings,
        embeddingShape: data.embeddingShape,
        globalOrder,
        categoryBoundaries,
        weightChartData: { bars: weightBars, categoryBoundaries },
      };

      cachedStaticData = result;
      setStaticData(result);
      setLoading(false);
    }

    init().catch((err) => {
      setStatus(`Error loading data: ${err.message}`);
    });
  }, []);

  /** Core transparency computation from an embedding */
  const computeTransparencyFromEmbedding = useCallback(
    (embedding: Float32Array, imageUrl: string): TransparencyResult => {
      if (!staticData) throw new Error("Data not loaded");

      const { embeddings, embeddingShape } = staticData;
      const similarities = computeSimilarities(
        embedding,
        embeddings,
        embeddingShape[0],
        embeddingShape[1]
      );

      const qualityScore = computeQualityScore(
        similarities,
        staticData.weights.weights,
        staticData.weights.bias
      );

      const chartData = buildTransparencyChartData(
        similarities,
        staticData.weights.weights,
        staticData.prompts,
        staticData.categoryMeta,
        staticData.globalOrder,
        staticData.categoryBoundaries
      );

      const topPrompts = getTopContributingPrompts(
        similarities,
        staticData.weights.weights,
        staticData.prompts
      );

      return { chartData, qualityScore, topPrompts, imageUrl };
    },
    [staticData]
  );

  const analyzeTransparency = useCallback(
    async (imageFile: File): Promise<TransparencyResult> => {
      if (!staticData) throw new Error("Data not loaded");
      setAnalyzing(true);
      setStatus("Getting image embedding...");

      try {
        const embedding = await getImageEmbedding(imageFile, setStatus);
        setStatus("Computing analysis...");
        const imageUrl = URL.createObjectURL(imageFile);
        return computeTransparencyFromEmbedding(embedding, imageUrl);
      } finally {
        setAnalyzing(false);
        setStatus("");
      }
    },
    [staticData, computeTransparencyFromEmbedding]
  );

  /** Analyze using a pre-computed embedding (no API call) */
  const analyzeTransparencyFromEmbedding = useCallback(
    (embedding: Float32Array, imageUrl: string): TransparencyResult => {
      return computeTransparencyFromEmbedding(embedding, imageUrl);
    },
    [computeTransparencyFromEmbedding]
  );

  /** Core comparison computation from two embeddings */
  const computeComparisonFromEmbeddings = useCallback(
    (
      embA: Float32Array,
      embB: Float32Array,
      imageUrlA: string,
      imageUrlB: string
    ): ComparisonResult => {
      if (!staticData) throw new Error("Data not loaded");

      const { embeddings, embeddingShape } = staticData;
      const simA = computeSimilarities(embA, embeddings, embeddingShape[0], embeddingShape[1]);
      const simB = computeSimilarities(embB, embeddings, embeddingShape[0], embeddingShape[1]);

      const scoreA = computeQualityScore(simA, staticData.weights.weights, staticData.weights.bias);
      const scoreB = computeQualityScore(simB, staticData.weights.weights, staticData.weights.bias);

      const { simDiffData, weightedDiffData, negativeDiffData } =
        buildComparisonChartData(
          simA,
          simB,
          staticData.weights.weights,
          staticData.prompts,
          staticData.categoryMeta,
          staticData.globalOrder,
          staticData.categoryBoundaries
        );

      return {
        simDiffData,
        weightedDiffData,
        negativeDiffData,
        scoreA,
        scoreB,
        imageUrlA,
        imageUrlB,
      };
    },
    [staticData]
  );

  const analyzeComparison = useCallback(
    async (
      imageFileA: File,
      imageFileB: File
    ): Promise<ComparisonResult> => {
      if (!staticData) throw new Error("Data not loaded");
      setAnalyzing(true);

      try {
        setStatus("Getting embedding for Image A...");
        const embA = await getImageEmbedding(imageFileA, setStatus);

        setStatus("Getting embedding for Image B...");
        const embB = await getImageEmbedding(imageFileB, setStatus);

        setStatus("Computing comparison...");
        return computeComparisonFromEmbeddings(
          embA,
          embB,
          URL.createObjectURL(imageFileA),
          URL.createObjectURL(imageFileB)
        );
      } finally {
        setAnalyzing(false);
        setStatus("");
      }
    },
    [staticData, computeComparisonFromEmbeddings]
  );

  /** Compare using pre-computed embeddings (no API call) */
  const analyzeComparisonFromEmbeddings = useCallback(
    (
      embA: Float32Array,
      embB: Float32Array,
      imageUrlA: string,
      imageUrlB: string
    ): ComparisonResult => {
      return computeComparisonFromEmbeddings(embA, embB, imageUrlA, imageUrlB);
    },
    [computeComparisonFromEmbeddings]
  );

  return {
    loading,
    analyzing,
    status,
    staticData,
    analyzeTransparency,
    analyzeTransparencyFromEmbedding,
    analyzeComparison,
    analyzeComparisonFromEmbeddings,
  };
}
