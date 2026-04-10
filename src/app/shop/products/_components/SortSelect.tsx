'use client';

export function SortSelect({ currentSort, currentCategory }: { currentSort: string; currentCategory: string }) {
  const sortOptions = [
    { value: 'popular', label: '人気順' },
    { value: 'new', label: '新着順' },
    { value: 'price-low', label: '価格：安い順' },
    { value: 'price-high', label: '価格：高い順' },
  ];

  return (
    <div className="flex items-center gap-4">
      <span className="text-xs text-slate-400 tracking-wide">Sort by</span>
      <div className="relative">
        <select
          defaultValue={currentSort}
          onChange={(e) => {
            const url = new URL(window.location.href);
            url.searchParams.set('sort', e.target.value);
            window.location.href = url.toString();
          }}
          className="text-sm text-slate-600 bg-transparent border-0 focus:ring-0 cursor-pointer appearance-none pr-6"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0 center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.5em 1.5em',
          }}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
