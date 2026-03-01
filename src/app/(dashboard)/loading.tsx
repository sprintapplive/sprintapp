export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-card rounded-lg" />
        <div className="h-6 w-24 bg-card rounded-lg" />
      </div>

      {/* Main content skeleton */}
      <div className="neo-card p-6 space-y-4">
        <div className="h-6 w-48 bg-muted/50 rounded" />
        <div className="space-y-3">
          <div className="h-12 bg-muted/30 rounded-xl" />
          <div className="h-12 bg-muted/30 rounded-xl" />
          <div className="h-12 bg-muted/30 rounded-xl" />
          <div className="h-12 bg-muted/30 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
