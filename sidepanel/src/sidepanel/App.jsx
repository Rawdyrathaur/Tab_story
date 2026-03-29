import { useEffect } from 'react';
import { useTabStore } from '../store/useTabStore';
import { ErrorBoundary } from '../components/ErrorBoundary';
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

function EverythingButton() {
  return (
    <button
      className="flex h-9 items-center gap-2 pl-3 text-xs font-medium text-[#A0A0B0] hover:bg-white/5 transition-colors"
      type="button"
      aria-label="Show all tabs"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      <span>Everything</span>
    </button>
  );
}

export default function App() {
  const isLoading = useTabStore((state) => state.isLoading);
  const error = useTabStore((state) => state.error);

  useEffect(() => {
    document.title = 'Tab Story';
    console.log('App: Component mounted. Calling loadData...');
    useTabStore.getState().loadData();
  }, []);

  if (isLoading) {
    console.log('App: Loading state is true. Displaying loading message.');
    return (
      <div className="flex h-full w-full items-center justify-center bg-background-base">
        <div className="text-sm text-[#A0A0B0]">Loading...</div>
      </div>
    );
  }

  if (error) {
    console.error('App: Error state is set. Displaying error message.', error);
    return (
      <div className="flex h-full w-full items-center justify-center bg-background-base">
        <div className="text-center p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-white mb-2">Error loading data</h2>
          <p className="text-sm text-[#A0A0B0]">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-lg bg-accent-purple text-white hover:bg-accent-purple/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-full w-screen flex-col bg-background-base text-white">
        <Header />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar>
            <div className="flex flex-col gap-0.5">
              <NewIntentButton />
              <EverythingButton />
              <div className="mt-2">
                <FolderTree />
              </div>
              <div className="flex-1" />
              <StatusBar />
            </div>
          </Sidebar>

          <MainPanel>
            <SearchBar />
            <FilterChips />
            <TabList />
          </MainPanel>
        </div>

        <TabDetailPopup />
      </div>
    </ErrorBoundary>
  );
}
