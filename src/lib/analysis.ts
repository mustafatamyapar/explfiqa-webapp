import type {
  Prompt,
  CategoryMeta,
  CategoryBoundary,
  ChartBar,
  ChartData,
} from "@/types";

/**
 * Compute cosine similarities between image embedding and all text embeddings.
 * Both must be L2-normalized, so similarity = dot product.
 */
export function computeSimilarities(
  imageEmbedding: Float32Array,
  textEmbeddings: Float32Array,
  numPrompts: number,
  embDim: number
): Float32Array {
  const similarities = new Float32Array(numPrompts);
  for (let i = 0; i < numPrompts; i++) {
    let dot = 0;
    const offset = i * embDim;
    for (let j = 0; j < embDim; j++) {
      dot += imageEmbedding[j] * textEmbeddings[offset + j];
    }
    similarities[i] = dot;
  }
  return similarities;
}

/**
 * Get indices of top-k values in descending order.
 */
export function getTopKIndices(arr: Float32Array, k: number): number[] {
  const indexed = Array.from(arr).map((v, i) => ({ v, i }));
  indexed.sort((a, b) => b.v - a.v);
  return indexed.slice(0, k).map((x) => x.i);
}

/**
 * Compute quality score: sum of top-k (similarity * weight) + bias
 */
export function computeQualityScore(
  similarities: Float32Array,
  weights: number[],
  bias: number,
  k: number = 384
): number {
  const topK = getTopKIndices(similarities, k);
  let score = bias;
  for (const idx of topK) {
    score += similarities[idx] * weights[idx];
  }
  return score;
}

/**
 * Build global display order: categories sorted by mean |weight| desc,
 * within each category sort prompts by weight desc.
 */
export function buildGlobalOrder(
  prompts: Prompt[],
  weights: number[]
): { globalOrder: number[]; categoryBoundaries: CategoryBoundary[] } {
  // Group prompt indices by category
  const catIndices: Record<string, number[]> = {};
  for (let i = 0; i < prompts.length; i++) {
    const cat = prompts[i].category;
    if (!catIndices[cat]) catIndices[cat] = [];
    catIndices[cat].push(i);
  }

  // Sort categories by mean absolute weight (descending)
  const catMeanAbs: Record<string, number> = {};
  for (const [cat, indices] of Object.entries(catIndices)) {
    let sum = 0;
    for (const idx of indices) sum += Math.abs(weights[idx]);
    catMeanAbs[cat] = sum / indices.length;
  }
  const sortedCats = Object.keys(catMeanAbs).sort(
    (a, b) => catMeanAbs[b] - catMeanAbs[a]
  );

  const globalOrder: number[] = [];
  const categoryBoundaries: CategoryBoundary[] = [];

  for (const cat of sortedCats) {
    const indices = [...catIndices[cat]];
    // Sort by weight descending within category
    indices.sort((a, b) => weights[b] - weights[a]);
    const start = globalOrder.length;
    globalOrder.push(...indices);
    categoryBoundaries.push({
      start,
      end: globalOrder.length,
      category: cat,
    });
  }

  return { globalOrder, categoryBoundaries };
}

/**
 * Build chart data for a transparency row (single image).
 */
export function buildTransparencyChartData(
  similarities: Float32Array,
  weights: number[],
  prompts: Prompt[],
  categoryMeta: CategoryMeta,
  globalOrder: number[],
  categoryBoundaries: CategoryBoundary[],
  k: number = 384
): ChartData {
  const topKOriginal = new Set(getTopKIndices(similarities, k));

  const bars: ChartBar[] = globalOrder.map((origIdx, displayPos) => {
    const contribution = similarities[origIdx] * weights[origIdx];
    const prompt = prompts[origIdx];
    return {
      position: displayPos,
      value: contribution,
      promptIndex: origIdx,
      promptText: prompt.text,
      shortText: prompt.shortText,
      category: prompt.category,
      color: categoryMeta.colors[prompt.category] || "#888",
      similarity: similarities[origIdx],
      weight: weights[origIdx],
      isTopK: topKOriginal.has(origIdx),
    };
  });

  return { bars, categoryBoundaries };
}

/**
 * Build chart data for comparison rows.
 */
export function buildComparisonChartData(
  simA: Float32Array,
  simB: Float32Array,
  weights: number[],
  prompts: Prompt[],
  categoryMeta: CategoryMeta,
  globalOrder: number[],
  categoryBoundaries: CategoryBoundary[],
  k: number = 384
): {
  simDiffData: ChartData;
  weightedDiffData: ChartData;
  negativeDiffData: ChartData;
} {
  const topKB = new Set(getTopKIndices(simB, k));

  const makeBars = (
    getValue: (origIdx: number) => number
  ): ChartBar[] =>
    globalOrder.map((origIdx, displayPos) => {
      const prompt = prompts[origIdx];
      return {
        position: displayPos,
        value: getValue(origIdx),
        promptIndex: origIdx,
        promptText: prompt.text,
        shortText: prompt.shortText,
        category: prompt.category,
        color: categoryMeta.colors[prompt.category] || "#888",
        similarity: simB[origIdx] - simA[origIdx],
        weight: weights[origIdx],
        isTopK: topKB.has(origIdx),
      };
    });

  return {
    simDiffData: {
      bars: makeBars((i) => simB[i] - simA[i]),
      categoryBoundaries,
    },
    weightedDiffData: {
      bars: makeBars((i) => (simB[i] - simA[i]) * weights[i]),
      categoryBoundaries,
    },
    negativeDiffData: {
      bars: makeBars((i) => Math.min((simB[i] - simA[i]) * weights[i], 0)),
      categoryBoundaries,
    },
  };
}

/**
 * Get top N categories by total absolute contribution (for highlight boxes).
 */
export function getTopCategories(
  chartData: ChartData,
  n: number = 3
): string[] {
  const catContrib: Record<string, number> = {};
  for (const bar of chartData.bars) {
    catContrib[bar.category] = (catContrib[bar.category] || 0) + Math.abs(bar.value);
  }
  return Object.entries(catContrib)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([cat]) => cat);
}

/**
 * Get top N positive and negative contributing prompts.
 */
export function getTopContributingPrompts(
  similarities: Float32Array,
  weights: number[],
  prompts: Prompt[],
  k: number = 384,
  n: number = 3
): { positive: ChartBar[]; negative: ChartBar[] } {
  const topKIndices = getTopKIndices(similarities, k);
  const topKSet = new Set(topKIndices);

  const contributions: { idx: number; contrib: number; sim: number }[] = [];
  for (const idx of topKIndices) {
    if (weights[idx] === 0) continue;
    contributions.push({
      idx,
      contrib: similarities[idx] * weights[idx],
      sim: similarities[idx],
    });
  }

  const positive = contributions
    .filter((c) => c.contrib > 0)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, n)
    .map((c) => ({
      position: 0,
      value: c.contrib,
      promptIndex: c.idx,
      promptText: prompts[c.idx].text,
      shortText: prompts[c.idx].shortText,
      category: prompts[c.idx].category,
      color: "",
      similarity: c.sim,
      weight: weights[c.idx],
      isTopK: topKSet.has(c.idx),
    }));

  const negative = contributions
    .filter((c) => c.contrib < 0)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, n)
    .map((c) => ({
      position: 0,
      value: c.contrib,
      promptIndex: c.idx,
      promptText: prompts[c.idx].text,
      shortText: prompts[c.idx].shortText,
      category: prompts[c.idx].category,
      color: "",
      similarity: c.sim,
      weight: weights[c.idx],
      isTopK: topKSet.has(c.idx),
    }));

  return { positive, negative };
}
