import { Search } from 'lucide-react';
import { useTabStore } from '../../store/useTabStore';

export default function SearchBar() {
  const searchQuery = useTabStore((state) => state.searchQuery);
  const setSearchQuery = useTabStore((state) => state.setSearchQuery);

  return (
    <div className="mx-4 mt-3 h-14 flex items-center rounded-xl bg-white/4 border border-white/8 transition-all focus-within:border-accent-purple/50">
      <Search className="ml-4 mr-3 h-4.5 w-4.5 text-white/40" strokeWidth={2} />
      <input
        type="text"
        placeholder="Search for tabs, domains, tags..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="flex-1 bg-transparent text-sm text-white placeholder:text-[#606070] placeholder:italic outline-none"
      />
    </div>
  );
}
