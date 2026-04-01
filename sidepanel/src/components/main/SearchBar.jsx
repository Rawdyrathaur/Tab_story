import { Search, X } from 'lucide-react';
import { useTabStore } from '../../store/useTabStore';

export default function SearchBar() {
  const searchQuery = useTabStore((state) => state.searchQuery);
  const setSearchQuery = useTabStore((state) => state.setSearchQuery);
  const activeFilter = useTabStore((state) => state.activeFilter);

  const handleClear = () => {
    setSearchQuery('');
  };

  const hasValue = searchQuery.length > 0;

  return (
    <div className="h-14 flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 transition-all focus-within:border-accent-purple/50 focus-within:bg-white/8 focus-within:shadow-lg focus-within:shadow-accent-purple/10 hover:border-white/15 hover:bg-white/8">
      <Search className={`h-5 w-5 ${hasValue ? 'text-accent-purple' : 'text-white/35'}`} strokeWidth={2} />

      <input
        type="text"
        placeholder={activeFilter ? `Search in ${activeFilter}...` : "Search tabs, domains, tags..."}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="flex-1 bg-transparent text-[14px] text-white placeholder:text-[#606070] placeholder:italic outline-none"
      />

      {hasValue && (
        <button
          onClick={handleClear}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}

      {activeFilter && (
        <div className="flex items-center gap-1.5 rounded-full bg-accent-purple/20 px-2.5 py-1 border border-accent-purple/30">
          <div className="h-1.5 w-1.5 rounded-full bg-accent-purple" />
          <span className="text-[11px] font-medium text-accent-purple">{activeFilter}</span>
          <button
            onClick={() => useTabStore.getState().setActiveFilter(null)}
            className="ml-1 text-white/40 hover:text-white"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
