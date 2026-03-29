import { Search } from 'lucide-react';
import { useUIStore } from '../../store/useTabStore';
import { memo, useCallback } from 'react';

/**
 * SearchBar component
 * @typedef {Object} SearchBarProps
 */

const SearchBar = memo(function SearchBar() {
  const searchQuery = useUIStore((state) => state.searchQuery);
  const setSearchQuery = useUIStore((state) => state.setSearchQuery);

  const handleChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  return (
    <div className="mx-4 mt-3 h-12 flex items-center rounded-xl bg-white/4 border border-white/8 transition-all focus-within:border-accent-purple/50">
      <Search className="ml-4 mr-3 h-4 w-4 flex-shrink-0 text-white/40" strokeWidth={2} />
      <input
        type="text"
        placeholder="Search tabs, domains, tags..."
        value={searchQuery}
        onChange={handleChange}
        className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-[#606070] placeholder:italic outline-none"
        aria-label="Search tabs"
      />
    </div>
  );
});

export default SearchBar;
