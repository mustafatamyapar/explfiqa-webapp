export interface Prompt {
  index: number;
  text: string;
  shortText: string;
  category: string;
}

export interface CategoryMeta {
  colors: Record<string, string>;
  displayNames: Record<string, string>;
}

export interface WeightsData {
  weights: number[];
  bias: number;
}

export interface TextEmbeddingsData {
  shape: [number, number];
  dtype: string;
  data: string; // base64
}

export interface CategoryBoundary {
  start: number;
  end: number;
  category: string;
}

export interface AnalysisResult {
  similarities: Float32Array;
  contributions: Float32Array;
  qualityScore: number;
  topKIndices: Set<number>;
}

export interface ChartBar {
  position: number;
  value: number;
  promptIndex: number;
  promptText: string;
  shortText: string;
  category: string;
  color: string;
  similarity: number;
  weight: number;
  isTopK: boolean;
}

export interface ChartData {
  bars: ChartBar[];
  categoryBoundaries: CategoryBoundary[];
}
