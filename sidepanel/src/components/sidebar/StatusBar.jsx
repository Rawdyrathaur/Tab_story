import { Folder, Clock, HardDrive, Database, Zap } from 'lucide-react';
import { useTabStore } from '../../store/useTabStore';
import { Button } from '../ui/Button';
import { useState, useEffect } from 'react';

export default function StatusBar() {
  const tabs = useTabStore((state) => state.tabs);
  const folders = useTabStore((state) => state.folders);
  const searchQuery = useTabStore((state) => state.searchQuery);
  const activeFilter = useTabStore((state) => state.activeFilter);
  const captureTabs = useTabStore((state) => state.captureTabs);
  const [storageSize, setStorageSize] = useState('0 KB');
  const [loadTime, setLoadTime] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

  // Calculate total folder count (including nested folders)
  const countFolders = (folderList) => {
    let count = 0;
    folderList.forEach((folder) => {
      count += 1;
      if (folder.children && folder.children.length > 0) {
        count += countFolders(folder.children);
      }
    });
    return count;
  };

  // Calculate active tabs (with "In Progress" status or recently accessed)
  const countActive = () => {
    return tabs.filter(tab => tab.status === 'In Progress').length;
  };

  // Calculate storage size
  useEffect(() => {
    const estimateSize = () => {
      const tabsSize = JSON.stringify(tabs).length * 2; // UTF-16 encoding
      const foldersSize = JSON.stringify(folders).length * 2;
      const totalBytes = tabsSize + foldersSize;

      if (totalBytes < 1024) return `${totalBytes} B`;
      if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(2)} KB`;
      return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    setStorageSize(estimateSize());
  }, [tabs, folders]);

  // Track load time
  useEffect(() => {
    const startTime = performance.now();
    return () => {
      const loadSeconds = ((performance.now() - startTime) / 1000).toFixed(1);
      setLoadTime(loadSeconds);
    };
  }, []);

  const totalFolders = countFolders(folders);
  const totalTabs = tabs.length;
  const activeCount = countActive();

  // Calculate visible tabs (filtered)
  const getVisibleTabs = () => {
    if (!searchQuery && !activeFilter) return totalTabs;

    let filtered = tabs;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tab =>
        (tab.title || '').toLowerCase().includes(query) ||
        (tab.domain || '').toLowerCase().includes(query) ||
        (tab.url || '').toLowerCase().includes(query)
      );
    }
    return filtered.length;
  };

  const visibleTabs = getVisibleTabs();

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-t border-white/6 px-4 text-[10px] text-[#707080] bg-background-sidebar">
      {/* Left Side - Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors">
          <Folder className="h-3 w-3 text-accent-blue" strokeWidth={2} />
          <span className="text-white/80">{totalTabs}</span>
          <span className="text-[#707080]">tabs</span>
        </div>

        <div className="w-px h-4 bg-white/10" />

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors">
          <HardDrive className="h-3 w-3 text-accent-amber" strokeWidth={2} />
          <span className="text-white/80">{totalFolders}</span>
          <span className="text-[#707080]">folders</span>
        </div>

        <div className="w-px h-4 bg-white/10" />

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors">
          <Clock className="h-3 w-3 text-white/40" strokeWidth={2} />
          <span className="text-[#707080]">{loadTime || '0.0'}s</span>
        </div>

        <div className="w-px h-4 bg-white/10" />

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors">
          <Database className="h-3 w-3 text-white/40" strokeWidth={2} />
          <span className="text-[#707080]">{storageSize}</span>
        </div>

        {activeCount > 0 && (
          <>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent-purple/20 hover:bg-accent-purple/30 transition-colors border border-accent-purple/30">
              <Zap className="h-3 w-3 text-accent-purple" strokeWidth={2} />
              <span className="text-accent-purple font-medium">{activeCount}</span>
              <span className="text-accent-purple/70">active</span>
            </div>
          </>
        )}

        {(searchQuery || activeFilter) && visibleTabs !== totalTabs && (
          <>
            <div className="w-px h-4 bg-white/10" />
            <div className="text-accent-purple">
              <span className="font-medium">{visibleTabs}</span>
              <span className="text-[#707080]"> / {totalTabs}</span>
            </div>
          </>
        )}
      </div>

      {/* Right Side - Add Tab Button */}
      <div className="relative">
        <Button
          variant="pill"
          className="bg-accent-purple text-white hover:bg-accent-purple/90"
          onClick={async () => {
            setIsCapturing(true);
            await captureTabs();
            setIsCapturing(false);
          }}
          disabled={isCapturing}
        >
          <span className="flex items-center gap-1">
            <span>{isCapturing ? 'Capturing...' : '+ Capture Tabs'}</span>
            {activeCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </span>
        </Button>
      </div>
    </div>
  );
}
