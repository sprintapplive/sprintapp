import { NextRequest, NextResponse } from 'next/server';
import { NormalizedArticle, NewsResponse } from '@/lib/news-types';

export async function GET(request: NextRequest) {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    return NextResponse.json<NewsResponse>({
      articles: getPlaceholderArticles(),
      isPlaceholder: true,
      category: 'news',
    });
  }

  try {
    // Fetch top business/general headlines
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&category=business&pageSize=20&apiKey=${apiKey}`,
      { next: { revalidate: 900 } }
    );

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    const data = await response.json();

    const articles: NormalizedArticle[] = data.articles
      .filter((a: any) => a.title && a.title !== '[Removed]' && a.description)
      .slice(0, 20)
      .map((article: any, index: number) => normalizeNewsApiArticle(article, index));

    return NextResponse.json<NewsResponse>({
      articles,
      isPlaceholder: false,
      category: 'news',
    });
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return NextResponse.json<NewsResponse>({
      articles: getPlaceholderArticles(),
      isPlaceholder: true,
      error: 'Failed to fetch live news',
      category: 'news',
    });
  }
}

function normalizeNewsApiArticle(article: any, index: number): NormalizedArticle {
  return {
    id: `news-${index}-${Date.now()}`,
    title: article.title,
    source: article.source?.name || 'Unknown',
    description: article.description || '',
    content: (article.content || article.description || '').replace(/\[\+\d+ chars\]$/, '').trim(),
    url: article.url,
    imageUrl: article.urlToImage,
    publishedAt: article.publishedAt,
    category: 'news',
  };
}

function getPlaceholderArticles(): NormalizedArticle[] {
  return [
    {
      id: 'news-placeholder-1',
      title: 'Markets Rally on Strong Earnings Reports',
      source: 'Financial Times',
      description: 'Major indices climbed as tech giants exceeded expectations in quarterly results.',
      content: 'Wall Street saw significant gains today as several major technology companies reported earnings that surpassed analyst expectations. The S&P 500 rose 1.2%, while the Nasdaq Composite gained 1.8%. Investors are optimistic about the economic outlook despite ongoing concerns about inflation.',
      url: 'https://example.com/markets',
      imageUrl: null,
      publishedAt: new Date().toISOString(),
      category: 'news',
    },
    {
      id: 'news-placeholder-2',
      title: 'Fed Signals Potential Rate Adjustments',
      source: 'Bloomberg',
      description: 'Central bank officials hint at policy changes in upcoming meetings.',
      content: 'Federal Reserve officials indicated they are closely monitoring economic data and may adjust interest rates in the coming months. The central bank has maintained a cautious approach, balancing inflation concerns with employment goals.',
      url: 'https://example.com/fed',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      category: 'news',
    },
    {
      id: 'news-placeholder-3',
      title: 'Tech Giants Report Record Cloud Revenue',
      source: 'Wall Street Journal',
      description: 'Enterprise cloud services continue to drive growth for major technology companies.',
      content: 'Major technology companies reported record revenue from their cloud computing divisions, signaling continued enterprise adoption of cloud services. AWS, Azure, and Google Cloud all showed double-digit growth year-over-year.',
      url: 'https://example.com/cloud',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      category: 'news',
    },
    {
      id: 'news-placeholder-4',
      title: 'Global Supply Chains Show Signs of Recovery',
      source: 'Reuters',
      description: 'Shipping delays decrease as logistics networks stabilize worldwide.',
      content: 'International supply chains are showing improvement after years of disruption. Port congestion has eased significantly, and shipping costs have normalized. Companies are reporting better inventory management and reduced lead times.',
      url: 'https://example.com/supply-chain',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
      category: 'news',
    },
    {
      id: 'news-placeholder-5',
      title: 'Consumer Spending Remains Resilient',
      source: 'CNBC',
      description: 'Retail sales data shows strong consumer confidence despite economic headwinds.',
      content: 'Despite elevated inflation, consumer spending has remained robust according to the latest retail sales data. Economists attribute this to a strong job market and accumulated savings from previous years.',
      url: 'https://example.com/consumer',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 14400000).toISOString(),
      category: 'news',
    },
  ];
}
