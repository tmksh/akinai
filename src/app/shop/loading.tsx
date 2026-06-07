export default function ShopLoading() {
  return (
    <div className="min-h-[60vh] animate-pulse">
      <div className="h-[40vh] bg-slate-100" />
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-8">
        <div className="h-6 bg-slate-100 rounded w-40" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square bg-slate-100 rounded" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
