import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { NormalizedArticle, NewsResponse } from '@/lib/news-types';

// RSS feeds for healthtech/VC news (all free, no API keys needed)
const RSS_FEEDS = [
  {
    url: 'https://techcrunch.com/category/health/feed/',
    source: 'TechCrunch',
  },
  {
    url: 'https://www.mobihealthnews.com/rss.xml',
    source: 'MobiHealthNews',
  },
  {
    url: 'https://www.fiercehealthcare.com/rss/xml',
    source: 'Fierce Healthcare',
  },
];

// Keywords to filter for funding/VC related articles
const FUNDING_KEYWORDS = [
  'funding', 'raises', 'raised', 'series a', 'series b', 'series c', 'series d',
  'venture', 'investment', 'investor', 'million', 'billion', 'capital', 'vc',
  'seed round', 'funding round', 'backed', 'valuation', 'acquisition', 'acquires',
  'ipo', 'spac', 'merger', 'startup', 'unicorn',
];

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; SprintNewsBot/1.0)',
  },
});

export async function GET() {
  try {
    // Fetch all RSS feeds in parallel
    const feedPromises = RSS_FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return parsed.items.map((item) => ({
          ...item,
          feedSource: feed.source,
        }));
      } catch (error) {
        console.error(`Failed to fetch RSS feed from ${feed.source}:`, error);
        return [];
      }
    });

    const feedResults = await Promise.all(feedPromises);
    const allItems = feedResults.flat();

    // Filter for funding-related articles
    const fundingItems = allItems.filter((item) => {
      const text = `${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''}`.toLowerCase();
      return FUNDING_KEYWORDS.some((keyword) => text.includes(keyword));
    });

    // Sort by date (newest first)
    fundingItems.sort((a, b) => {
      const dateA = new Date(a.pubDate || a.isoDate || 0).getTime();
      const dateB = new Date(b.pubDate || b.isoDate || 0).getTime();
      return dateB - dateA;
    });

    // Normalize to our article format
    const articles: NormalizedArticle[] = fundingItems
      .slice(0, 20)
      .map((item, index) => normalizeRssItem(item, index));

    // If we got some articles, return them
    if (articles.length >= 3) {
      return NextResponse.json<NewsResponse>({
        articles,
        isPlaceholder: false,
        category: 'funding',
      });
    }

    // If not enough funding articles, return all health tech articles
    const allArticles: NormalizedArticle[] = allItems
      .sort((a, b) => {
        const dateA = new Date(a.pubDate || a.isoDate || 0).getTime();
        const dateB = new Date(b.pubDate || b.isoDate || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 20)
      .map((item, index) => normalizeRssItem(item, index));

    if (allArticles.length > 0) {
      return NextResponse.json<NewsResponse>({
        articles: allArticles,
        isPlaceholder: false,
        category: 'funding',
      });
    }

    throw new Error('No RSS articles available');
  } catch (error) {
    console.error('Failed to fetch RSS feeds:', error);
    return NextResponse.json<NewsResponse>({
      articles: getPlaceholderArticles(),
      isPlaceholder: true,
      error: 'Failed to fetch funding news',
      category: 'funding',
    });
  }
}

function normalizeRssItem(item: any, index: number): NormalizedArticle {
  // Extract image from content or media
  let imageUrl: string | null = null;
  if (item.enclosure?.url) {
    imageUrl = item.enclosure.url;
  } else if (item['media:content']?.$.url) {
    imageUrl = item['media:content'].$.url;
  } else if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src="([^"]+)"/);
    if (imgMatch) {
      imageUrl = imgMatch[1];
    }
  }

  // Clean up description (remove HTML tags)
  const description = (item.contentSnippet || item.description || '')
    .replace(/<[^>]*>/g, '')
    .substring(0, 300)
    .trim();

  return {
    id: `funding-${index}-${Date.now()}`,
    title: item.title || 'Untitled',
    source: item.feedSource || item.creator || 'Unknown',
    description,
    content: item.contentSnippet || item.content?.replace(/<[^>]*>/g, '') || description,
    url: item.link || '',
    imageUrl,
    publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
    category: 'funding',
  };
}

function getPlaceholderArticles(): NormalizedArticle[] {
  return [
    {
      id: 'funding-placeholder-1',
      title: 'AI Diagnostics Startup Raises $85M Series C',
      source: 'TechCrunch',
      description: 'PathAI competitor secures major funding to expand AI-powered pathology platform across hospital networks.',
      content: 'A leading AI diagnostics company has closed an $85 million Series C round led by Andreessen Horowitz. The company\'s AI platform analyzes pathology slides to assist physicians in cancer diagnosis. The funding will be used to expand into new cancer types and pursue additional FDA clearances.',
      url: 'https://example.com/funding-1',
      imageUrl: null,
      publishedAt: new Date().toISOString(),
      category: 'funding',
    },
    {
      id: 'funding-placeholder-2',
      title: 'Remote Monitoring Platform Closes $52M Series B',
      source: 'MobiHealthNews',
      description: 'Chronic care management startup expands connected device ecosystem with new funding.',
      content: 'A remote patient monitoring company focused on chronic disease management has raised $52 million in Series B funding led by General Catalyst. The platform integrates data from over 300 connected medical devices.',
      url: 'https://example.com/funding-2',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      category: 'funding',
    },
    {
      id: 'funding-placeholder-3',
      title: 'Mental Health App Secures $40M Growth Round',
      source: 'Fierce Healthcare',
      description: 'Employer-focused mental health platform raises as corporate wellness spending increases.',
      content: 'A digital mental health company providing therapy services through employer benefits has raised $40 million. Over 500 employers now offer the platform as a benefit, covering 2 million employees.',
      url: 'https://example.com/funding-3',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      category: 'funding',
    },
    {
      id: 'funding-placeholder-4',
      title: 'Surgical Robotics Company Raises $120M Series D',
      source: 'Bloomberg',
      description: 'Orthopedic surgery robotics firm accelerates commercialization with growth funding.',
      content: 'A surgical robotics company specializing in orthopedic procedures has closed a $120 million Series D round led by SoftBank Vision Fund 2.',
      url: 'https://example.com/funding-4',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 259200000).toISOString(),
      category: 'funding',
    },
    {
      id: 'funding-placeholder-5',
      title: 'Genomics Startup Closes $65M for Genetic Testing',
      source: 'STAT News',
      description: 'Direct-to-consumer genetic testing company aims to make pharmacogenomics accessible.',
      content: 'A genomics company focused on pharmacogenomics has raised $65 million in Series B funding to expand its at-home genetic testing service.',
      url: 'https://example.com/funding-5',
      imageUrl: null,
      publishedAt: new Date(Date.now() - 345600000).toISOString(),
      category: 'funding',
    },
  ];
}
