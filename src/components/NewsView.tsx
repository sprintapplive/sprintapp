'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Newspaper,
  Linkedin,
  TrendingUp,
  Mail,
  ExternalLink,
  Loader2,
  RefreshCw,
  Clock,
  X,
  Globe,
  ShieldCheck,
  FlaskConical,
  LineChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NormalizedArticle, NewsSourceId } from '@/lib/news-types';

// Icon-only category tabs with their API endpoints
const CATEGORIES = [
  {
    id: 'news' as NewsSourceId,
    label: 'Business News',
    icon: Globe,
    endpoint: '/api/news',
    description: 'Top business headlines from NewsAPI',
  },
  {
    id: 'fda' as NewsSourceId,
    label: 'FDA 510(k)',
    icon: ShieldCheck,
    endpoint: '/api/news/fda',
    description: 'Recent medical device clearances from openFDA',
  },
  {
    id: 'trials' as NewsSourceId,
    label: 'Clinical Trials',
    icon: FlaskConical,
    endpoint: '/api/news/trials',
    description: 'Digital health clinical trials from ClinicalTrials.gov',
  },
  {
    id: 'funding' as NewsSourceId,
    label: 'VC Funding',
    icon: LineChart,
    endpoint: '/api/news/funding',
    description: 'Healthtech venture capital news',
  },
] as const;

export function NewsView() {
  const [articles, setArticles] = useState<NormalizedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<NormalizedArticle | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NewsSourceId>('news');

  const fetchNews = async (categoryId: NewsSourceId = activeCategory) => {
    setLoading(true);
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    try {
      const response = await fetch(category.endpoint);
      const data = await response.json();
      setArticles(data.articles || []);
      setIsPlaceholder(data.isPlaceholder || false);

      if (data.error && !data.isPlaceholder) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
      toast.error('Failed to load articles');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(activeCategory);
  }, [activeCategory]);

  const handleCategoryChange = (categoryId: NewsSourceId) => {
    if (categoryId !== activeCategory) {
      setActiveCategory(categoryId);
    }
  };

  const handleEmailArticle = async () => {
    if (!selectedArticle) return;

    setSendingEmail(true);
    try {
      const response = await fetch('/api/email-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedArticle.title,
          url: selectedArticle.url,
          summary: selectedArticle.content || selectedArticle.description,
          source: selectedArticle.source,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      toast.success('Article sent to your email!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const activeCategoryData = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="space-y-6">
      {/* Header with Icon Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-laurel-700/30 flex items-center justify-center">
            <Newspaper className="h-5 w-5 text-gold-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold italic">News</h1>
            <p className="text-xs text-muted-foreground">
              {activeCategoryData?.description}
              {isPlaceholder && ' (sample data)'}
            </p>
          </div>
        </div>

        {/* Icon-only tabs + refresh */}
        <div className="flex items-center gap-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={cn(
                  'p-2.5 rounded-xl transition-all relative group',
                  isActive
                    ? 'bg-laurel-700/50 text-gold-400 shadow-[0_0_15px_rgba(74,103,65,0.3)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                )}
                title={cat.label}
              >
                <Icon className="h-5 w-5" />
                {/* Tooltip */}
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-popover border border-border rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {cat.label}
                </span>
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px h-6 bg-border/50 mx-1" />

          {/* Refresh */}
          <button
            onClick={() => fetchNews()}
            disabled={loading}
            className={cn(
              'p-2.5 rounded-xl hover:bg-card/50 transition-colors text-muted-foreground hover:text-foreground',
              loading && 'animate-spin text-gold-400'
            )}
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-gold-400 mb-4" />
          <p className="text-muted-foreground">Loading {activeCategoryData?.label}...</p>
        </div>
      ) : (
        <>
          {/* Article Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {articles.map((article) => (
              <button
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className={cn(
                  'group text-left p-4 rounded-xl border border-border/50 bg-card',
                  'hover:border-gold-400/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.1)]',
                  'transition-all duration-200',
                )}
              >
                {/* Image thumbnail if available */}
                {article.imageUrl && (
                  <div className="mb-3 rounded-lg overflow-hidden aspect-video bg-muted -mx-1 -mt-1">
                    <img
                      src={article.imageUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Source & Time */}
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="text-xs font-medium text-gold-400 uppercase tracking-wide truncate">
                    {article.source}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(article.publishedAt)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-foreground group-hover:text-gold-400 transition-colors line-clamp-2 mb-2">
                  {article.title}
                </h3>

                {/* Description */}
                {article.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {article.description}
                  </p>
                )}
              </button>
            ))}
          </div>

          {articles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Newspaper className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No articles available</p>
              <button
                onClick={() => fetchNews()}
                className="mt-4 text-sm text-gold-400 hover:underline"
              >
                Try refreshing
              </button>
            </div>
          )}
        </>
      )}

      {/* Article Modal */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" showCloseButton={false}>
          {selectedArticle && (
            <>
              {/* Custom Header with Action Buttons */}
              <div className="flex items-start justify-between gap-4">
                <DialogHeader className="flex-1 pr-2">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-medium text-gold-400 uppercase tracking-wide">
                      {selectedArticle.source}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(selectedArticle.publishedAt)}
                    </span>
                  </div>
                  <DialogTitle className="text-xl leading-tight pr-4">
                    {selectedArticle.title}
                  </DialogTitle>
                </DialogHeader>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* LinkedIn */}
                  <a
                    href="https://www.linkedin.com/in/isaacjwilkins/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-[#0A66C2]"
                    title="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>

                  {/* Stocks App */}
                  <a
                    href="stocks://"
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-green-500"
                    title="Open Stocks App"
                  >
                    <TrendingUp className="h-5 w-5" />
                  </a>

                  {/* Email to Self */}
                  <button
                    onClick={handleEmailArticle}
                    disabled={sendingEmail}
                    className={cn(
                      'p-2 rounded-lg hover:bg-muted transition-colors',
                      sendingEmail
                        ? 'text-gold-400'
                        : 'text-muted-foreground hover:text-gold-400'
                    )}
                    title="Email to Self"
                  >
                    {sendingEmail ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Mail className="h-5 w-5" />
                    )}
                  </button>

                  {/* Close */}
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Article Content - Scrollable */}
              <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-4">
                {/* Image */}
                {selectedArticle.imageUrl && (
                  <div className="rounded-xl overflow-hidden mb-4 aspect-video bg-muted">
                    <img
                      src={selectedArticle.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Lead/Description */}
                {selectedArticle.description && (
                  <p className="text-foreground font-medium leading-relaxed mb-4 text-lg">
                    {selectedArticle.description}
                  </p>
                )}

                {/* Full Content */}
                {selectedArticle.content && selectedArticle.content !== selectedArticle.description && (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedArticle.content}
                    </p>
                  </div>
                )}

                {/* Note about content */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Tip:</span> Click &quot;Read Full Article&quot; for complete details, or use the email button to save for later.
                  </p>
                </div>
              </div>

              {/* Footer with Read More */}
              <div className="flex justify-between items-center pt-4 border-t border-border/50 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedArticle(null)}
                >
                  Close
                </Button>
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="bg-gold-400 hover:bg-gold-500 text-olympus-900">
                    Read Full Article
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
