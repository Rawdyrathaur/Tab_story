import { Search, Clock, Settings, LayoutGrid, Filter } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTabStore } from '../../store/useTabStore';

export default function Header() {
  const searchQuery = useTabStore((state) => state.searchQuery);
  const activeFilter = useTabStore((state) => state.activeFilter);

  const toggleSearchFocus = () => {
    // Focus on the search input in the main panel
    const searchInput = document.querySelector('input[type="text"]');
    if (searchInput) {
      searchInput.focus();
    }
  };

  return (
    <header className="flex h-16 items-center justify-between bg-background-sidebar border-b border-white/6">
      {/* Left Side - App Icon & Title */}
      <div className="flex items-center gap-3 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-800 shadow-lg shadow-purple-500/20">
          <LayoutGrid className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            Tab Story
          </h1>
          <p className="text-[10px] text-white/40 -mt-0.5">Organize your browsing</p>
        </div>
      </div>

      {/* Right Side - Action Buttons */}
      <div className="flex items-center gap-1 px-4">
        <Button
          variant="icon"
          size="icon"
          aria-label="Search"
          onClick={toggleSearchFocus}
          className={searchQuery ? 'text-accent-purple bg-accent-purple/10 border-accent-purple/30' : ''}
        >
          <Search className="h-4 w-4" strokeWidth={2} />
        </Button>
        <Button
          variant="icon"
          size="icon"
          aria-label="Filter"
          className={activeFilter ? 'text-accent-purple bg-accent-purple/10 border-accent-purple/30' : ''}
        >
          <Filter className="h-4 w-4" strokeWidth={2} />
        </Button>
        <Button variant="icon" size="icon" aria-label="History">
          <Clock className="h-4 w-4" strokeWidth={2} />
        </Button>
        <div className="mx-2 h-5 w-px bg-white/10" />
        <Button variant="icon" size="icon" aria-label="Settings">
          <Settings className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>
    </header>
  );
}
