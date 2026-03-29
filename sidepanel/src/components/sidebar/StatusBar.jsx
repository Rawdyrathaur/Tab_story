import { Plus, FileText, Folder } from 'lucide-react';
import { useTabStore } from '../../store/useTabStore';
import { useFolderStore } from '../../store/useTabStore';
import { useTagStore } from '../../store/useTabStore';
import { Button } from '../ui/Button';
import { memo, useMemo, useCallback } from 'react';

/**
 * StatusBar component - shows stats and add button
 * @typedef {Object} StatusBarProps
 */

const StatusBar = memo(function StatusBar() {
  const tabs = useTabStore((state) => state.tabs);
  const folders = useFolderStore((state) => state.folders);
  const tags = useTagStore((state) => state.tags);
  const addFolder = useFolderStore((state) => state.addFolder);

  const totalFolders = useMemo(() => {
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
    return countFolders(folders);
  }, [folders]);

  const totalTabs = tabs.length;

  const handleAddTab = useCallback(() => {
    addFolder('New Tab', '');
  }, [addFolder]);

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-t border-white/6 px-4 text-[11px] text-[#808090]">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5" aria-label={`${totalTabs} tabs`}>
          <FileText className="h-3.5 w-3.5" strokeWidth={2} />
          <span>{totalTabs} tabs</span>
        </span>
        <span className="flex items-center gap-1.5" aria-label={`${totalFolders} folders`}>
          <Folder className="h-3.5 w-3.5" strokeWidth={2} />
          <span>{totalFolders} folders</span>
        </span>
      </div>

      <Button
        variant="pill"
        className="bg-accent-purple text-white hover:bg-accent-purple/90"
        onClick={handleAddTab}
      >
        <span className="flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          <span>Add Tab</span>
        </span>
      </Button>
    </div>
  );
});

export default StatusBar;
