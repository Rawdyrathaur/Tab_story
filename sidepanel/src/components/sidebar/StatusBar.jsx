import { Plus } from 'lucide-react';
import { useTabStore } from '../../store/useTabStore';
import { Button } from '../ui/Button';

export default function StatusBar() {
  const tabs = useTabStore((state) => state.tabs);
  const folders = useTabStore((state) => state.folders);

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

  const totalFolders = countFolders(folders);
  const totalTabs = tabs.length;

  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-t border-white/6 px-3 text-[11px] text-[#808090]">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span>📑</span>
          <span>{totalTabs} tabs</span>
        </span>
        <span className="flex items-center gap-1">
          <span>📁</span>
          <span>{totalFolders} folders</span>
        </span>
        <span className="flex items-center gap-1">
          <span>⏱</span>
          <span>8s</span>
        </span>
        <span className="flex items-center gap-1">
          <span>▶</span>
          <span>154.21 KB</span>
        </span>
      </div>

      <div className="relative">
        <Button
          variant="pill"
          className="bg-accent-purple text-white hover:bg-accent-purple/90"
          onClick={() => console.log('Add Tab clicked')}
        >
          <span className="flex items-center gap-1">
            <span>+ Add Tab</span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white">
              5
            </span>
          </span>
        </Button>
      </div>
    </div>
  );
}
