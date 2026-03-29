import { Search, Clock, Settings, LayoutGrid } from 'lucide-react';
import { Button } from '../ui/Button';

export default function Header() {
  return (
    <header className="flex h-16 items-center justify-between bg-background-sidebar border-b border-white/6">
      {/* Left Side - App Icon & Title */}
      <div className="flex items-center gap-3 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-800">
          <LayoutGrid className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-bold text-white tracking-tight">
          Tab Story
        </h1>
      </div>

      {/* Right Side - Action Buttons */}
      <div className="flex items-center gap-2 px-4">
        <Button variant="icon" size="icon" aria-label="Search">
          <Search className="h-4 w-4" strokeWidth={2} />
        </Button>
        <Button variant="icon" size="icon" aria-label="History">
          <Clock className="h-4 w-4" strokeWidth={2} />
        </Button>
        <Button variant="icon" size="icon" aria-label="Settings">
          <Settings className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>
    </header>
  );
}
