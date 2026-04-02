import { useEffect } from 'react';
import { useTabStore, useInitializeStore } from '../store/useTabStore';
import { List } from 'lucide-react';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import MainPanel from '../components/layout/MainPanel';
import NewIntentButton from '../components/sidebar/NewIntentButton';
import FolderTree from '../components/sidebar/FolderTree';
import StatusBar from '../components/sidebar/StatusBar';
import SearchBar from '../components/main/SearchBar';
import FilterChips from '../components/main/FilterChips';
import TabList from '../components/main/TabList';
import TabDetailPopup from '../components/popup/TabDetailPopup';

export default function App() {
  // Initialize store on mount
  useInitializeStore();
  const isLoading = useTabStore((state) => state.isLoading);

  useEffect(() => {
    document.title = 'Tab Story';
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background-base">
        <div className="text-sm text-[#A0A0B0]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-screen flex-col bg-background-base text-white">
      {/* Header */}
      <Header />

    
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar>
          <div className="flex flex-col gap-3">
            {/* New Intent Button */}
            <NewIntentButton />

            {/* Everything Link */}
            <button
              className="flex h-10 items-center gap-2 px-3 text-xs font-medium text-[#A0A0B0] rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => console.log('Everything clicked')}
            >
              <List className="h-4 w-4" strokeWidth={2} />
              <span>Everything</span>
            </button>
          </div>

          {/* Folder Tree */}
          <div className="mt-4">
            <FolderTree />
          </div>

          {/* Spacer for status bar */}
          <div className="flex-1" />

          {/* Status Bar */}
          <StatusBar />
        </Sidebar>

        {/* Main Panel */}
        <MainPanel>
          {/* Search Bar */}
          <SearchBar />

          {/* Filter Chips */}
          <FilterChips />

          {/* Tab List */}
          <div className="mt-6">
            <TabList />
          </div>
        </MainPanel>
      </div>

      {/* Tab Detail Popup */}
      <TabDetailPopup />
    </div>
  );
}
