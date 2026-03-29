import { useEffect } from 'react';
import { useTabStore, useInitializeStore } from '../store/useTabStore';
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
          <div className="flex flex-col gap-0.5">
            {/* New Intent Button */}
            <NewIntentButton />

            {/* Everything Link */}
            <button
              className="flex h-9 items-center gap-2 pl-3 text-xs font-medium text-[#A0A0B0]"
              onClick={() => console.log('Everything clicked')}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Everything</span>
            </button>
          </div>

          {/* Folder Tree */}
          <div className="mt-2">
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
          <TabList />
        </MainPanel>
      </div>

      {/* Tab Detail Popup */}
      <TabDetailPopup />
    </div>
  );
}
