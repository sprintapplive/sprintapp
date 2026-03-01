// Normalized article interface used across all news sources
export interface NormalizedArticle {
  id: string;
  title: string;
  source: string;
  description: string;
  content: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  category: 'news' | 'fda' | 'trials' | 'funding';
}

export interface NewsResponse {
  articles: NormalizedArticle[];
  isPlaceholder: boolean;
  error?: string;
  category: string;
}

// Source identifiers
export const NEWS_SOURCES = {
  news: { label: 'Business News', api: 'NewsAPI' },
  fda: { label: 'FDA 510(k)', api: 'openFDA' },
  trials: { label: 'Clinical Trials', api: 'ClinicalTrials.gov' },
  funding: { label: 'VC Funding', api: 'Crunchbase' },
} as const;

export type NewsSourceId = keyof typeof NEWS_SOURCES;
